import { Router } from 'express';
import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import rateLimit from 'express-rate-limit';
import { query, queryOne, toId, UPLOAD_DIR, UNIQUE_VIOLATION } from '../db.js';
import { requireAdmin } from '../auth.js';
import { handleCvUpload } from '../middleware/upload.js';

const router = Router();

const STATUSES = ['new', 'shortlisted', 'rejected'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: { error: 'You have sent a lot of applications. Try again in an hour.' },
});

/** Public: apply to a job. Expects multipart/form-data with a `cv` file. */
router.post('/jobs/:id/apply', applyLimiter, handleCvUpload, async (req, res, next) => {
  const discard = () => {
    if (req.file) rmSync(req.file.path, { force: true });
  };

  try {
    const id = toId(req.params.id);
    const job = id && (await queryOne('SELECT id, is_open FROM jobs WHERE id = $1', [id]));

    if (!job || !job.is_open) {
      discard();
      return res.status(404).json({ error: 'This job is no longer accepting applications.' });
    }

    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim() || null;
    const note = String(req.body.note || '').trim() || null;

    if (name.length < 2) {
      discard();
      return res.status(400).json({ error: 'Enter your full name.' });
    }
    if (!EMAIL_RE.test(email)) {
      discard();
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Attach your CV as a PDF or Word file.' });
    }

    try {
      await query(
        `INSERT INTO applications (job_id, name, email, phone, note, cv_file, cv_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [job.id, name, email, phone, note, req.file.filename, req.file.originalname]
      );
    } catch (err) {
      discard();
      // The UNIQUE (job_id, email) constraint catches duplicates, including two
      // requests racing each other.
      if (err.code === UNIQUE_VIOLATION) {
        return res.status(409).json({ error: 'You have already applied for this job.' });
      }
      throw err;
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    discard();
    next(err);
  }
});

/** Admin: list applications, optionally for one job. */
router.get('/applications', requireAdmin, async (req, res, next) => {
  try {
    const where = [];
    const params = [];

    const jobId = toId(req.query.job_id);
    if (jobId) {
      params.push(jobId);
      where.push(`a.job_id = $${params.length}`);
    }
    if (req.query.status && STATUSES.includes(req.query.status)) {
      params.push(req.query.status);
      where.push(`a.status = $${params.length}`);
    }

    const rows = await query(
      `SELECT a.id, a.job_id, a.name, a.email, a.phone, a.note, a.cv_name, a.status, a.created_at,
              j.title AS job_title, j.company AS job_company
       FROM applications a JOIN jobs j ON j.id = a.job_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY a.created_at DESC, a.id DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.patch('/applications/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const status = String(req.body?.status || '');

    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Pick a valid status.' });
    }
    if (!id) return res.status(404).json({ error: 'That application no longer exists.' });

    const updated = await queryOne(
      'UPDATE applications SET status = $1 WHERE id = $2 RETURNING id',
      [status, id]
    );

    if (!updated) return res.status(404).json({ error: 'That application no longer exists.' });
    res.json({ ok: true, status });
  } catch (err) {
    next(err);
  }
});

/** Admin: download a CV. Files are served only through this guarded route. */
router.get('/applications/:id/cv', requireAdmin, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const row =
      id && (await queryOne('SELECT cv_file, cv_name FROM applications WHERE id = $1', [id]));

    if (!row) return res.status(404).json({ error: 'That application no longer exists.' });

    const filePath = path.join(UPLOAD_DIR, path.basename(row.cv_file));
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'That CV file is missing from storage.' });
    }

    res.download(filePath, row.cv_name);
  } catch (err) {
    next(err);
  }
});

router.delete('/applications/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const row =
      id && (await queryOne('DELETE FROM applications WHERE id = $1 RETURNING cv_file', [id]));

    if (!row) return res.status(404).json({ error: 'That application no longer exists.' });

    rmSync(path.join(UPLOAD_DIR, path.basename(row.cv_file)), { force: true });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
