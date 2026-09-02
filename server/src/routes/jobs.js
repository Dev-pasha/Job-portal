import { Router } from 'express';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { query, queryOne, toId, pool, UPLOAD_DIR } from '../db.js';
import { requireAdmin } from '../auth.js';
import { validateJob, JOB_COLUMNS } from '../jobValidation.js';
import { isCountry, WORK_MODES, EMPLOYMENT_TYPES } from '../reference.js';
import { handleCsvUpload } from '../middleware/upload.js';

const router = Router();

const JOB_FIELDS = `title, company, city, country, work_mode, employment,
                    salary_min, salary_max, salary_currency, salary_period, description, is_open`;

const jobValues = (job) => [
  job.title, job.company, job.city, job.country, job.work_mode, job.employment,
  job.salary_min, job.salary_max, job.salary_currency, job.salary_period,
  job.description, job.is_open,
];

/** Public: browse open jobs, with optional search and filters. */
router.get('/', async (req, res, next) => {
  try {
    const { q, city, country, work_mode, employment } = req.query;
    const where = ['is_open = TRUE'];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      where.push(`(title ILIKE $${params.length} OR company ILIKE $${params.length}
                   OR description ILIKE $${params.length})`);
    }
    if (city) {
      params.push(`%${city}%`);
      where.push(`city ILIKE $${params.length}`);
    }
    if (country && isCountry(country)) {
      params.push(String(country).toUpperCase());
      where.push(`country = $${params.length}`);
    }
    if (work_mode && WORK_MODES.includes(work_mode)) {
      params.push(work_mode);
      where.push(`work_mode = $${params.length}`);
    }
    if (employment && EMPLOYMENT_TYPES.includes(employment)) {
      params.push(employment);
      where.push(`employment = $${params.length}`);
    }

    const jobs = await query(
      `SELECT id, ${JOB_FIELDS}, created_at
       FROM jobs WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id DESC`,
      params
    );

    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

/** Public: which countries actually have open roles, for the filter dropdown. */
router.get('/countries', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT country, COUNT(*)::int AS job_count FROM jobs
       WHERE is_open = TRUE GROUP BY country ORDER BY job_count DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/** Admin: every job, open or closed, with application counts. */
router.get('/all', requireAdmin, async (_req, res, next) => {
  try {
    const jobs = await query(
      `SELECT j.*, COUNT(a.id)::int AS application_count
       FROM jobs j LEFT JOIN applications a ON a.job_id = j.id
       GROUP BY j.id ORDER BY j.created_at DESC, j.id DESC`
    );
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

/** Admin: a CSV template with the correct headers and one example row. */
router.get('/bulk/template', requireAdmin, (_req, res) => {
  const example = [
    'Frontend Developer', 'Northline Studio', 'Lahore', 'PK', 'hybrid', 'full-time',
    '180000', '260000', 'PKR', 'month',
    'Build and maintain the React interfaces our customers use every day.', 'true',
  ];

  const csv = [
    JOB_COLUMNS.join(','),
    example.map((v) => (v.includes(',') ? `"${v}"` : v)).join(','),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="job-import-template.csv"');
  res.send(csv);
});

/**
 * Admin: import many jobs from a CSV file.
 *
 * Valid rows are inserted in a single transaction; invalid rows are reported
 * back with their row number so they can be fixed and re-uploaded. Setting
 * `strict` means one bad row cancels the whole import.
 */
router.post('/bulk', requireAdmin, handleCsvUpload, async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Attach a CSV file to import.' });
  }

  let rows;
  try {
    rows = parse(req.file.buffer, {
      columns: (header) => header.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_')),
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });
  } catch (err) {
    return res.status(400).json({ error: `That file is not valid CSV: ${err.message}` });
  }

  if (rows.length === 0) {
    return res.status(400).json({ error: 'That file has a header but no rows.' });
  }
  if (rows.length > 500) {
    return res.status(400).json({ error: 'Import up to 500 jobs at a time.' });
  }

  const valid = [];
  const failed = [];

  rows.forEach((row, index) => {
    const { job, errors } = validateJob(row);
    // +2 because row 1 is the header and spreadsheets count from 1.
    if (errors.length) failed.push({ row: index + 2, title: row.title || '', errors });
    else valid.push(job);
  });

  const strict = String(req.body?.strict || '') === 'true';

  if (strict && failed.length) {
    return res.status(400).json({
      error: `Nothing was imported. ${failed.length} row(s) need fixing.`,
      imported: 0,
      skipped: failed.length,
      failed,
    });
  }

  // The pool client is taken only once there is something to insert, and is
  // released in exactly one place so it can never be returned to the pool twice.
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    for (const job of valid) {
      await client.query(
        `INSERT INTO jobs (${JOB_FIELDS})
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        jobValues(job)
      );
    }
    await client.query('COMMIT');

    res.json({ imported: valid.length, skipped: failed.length, failed });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const job = id && (await queryOne('SELECT * FROM jobs WHERE id = $1', [id]));
    if (!job) return res.status(404).json({ error: 'That job is no longer listed.' });
    res.json(job);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { job, errors } = validateJob(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors[0], errors });

    const created = await queryOne(
      `INSERT INTO jobs (${JOB_FIELDS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      jobValues(job)
    );

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(404).json({ error: 'That job no longer exists.' });

    const { job, errors } = validateJob(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors[0], errors });

    const updated = await queryOne(
      `UPDATE jobs SET title = $1, company = $2, city = $3, country = $4, work_mode = $5,
       employment = $6, salary_min = $7, salary_max = $8, salary_currency = $9,
       salary_period = $10, description = $11, is_open = $12
       WHERE id = $13 RETURNING *`,
      [...jobValues(job), id]
    );

    if (!updated) return res.status(404).json({ error: 'That job no longer exists.' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(404).json({ error: 'That job no longer exists.' });

    // Applications cascade in Postgres, but their uploaded files would be orphaned.
    const files = await query('SELECT cv_file FROM applications WHERE job_id = $1', [id]);
    const deleted = await queryOne('DELETE FROM jobs WHERE id = $1 RETURNING id', [id]);

    if (!deleted) return res.status(404).json({ error: 'That job no longer exists.' });

    for (const { cv_file } of files) {
      rmSync(path.join(UPLOAD_DIR, path.basename(cv_file)), { force: true });
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
