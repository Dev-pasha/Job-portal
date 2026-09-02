import pg from 'pg';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = path.join(__dirname, '..', 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

// Ad banners live in their own directory because they are served publicly.
// CVs never are, so keeping them apart makes that impossible to get wrong.
export const AD_IMAGE_DIR = path.join(DATA_DIR, 'ad-images');

mkdirSync(UPLOAD_DIR, { recursive: true });
mkdirSync(AD_IMAGE_DIR, { recursive: true });

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Managed providers (Neon, Supabase, Render, Heroku) require TLS.
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err.message);
});

/** Runs a query and returns the rows. */
export async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

/** Runs a query expected to match at most one row. */
export async function queryOne(text, params) {
  const rows = await query(text, params);
  return rows[0] || null;
}

/**
 * Route params arrive as strings. Postgres throws on a non-numeric value where
 * it expects an integer, so ids are checked here and treated as "not found".
 */
export function toId(value) {
  return /^\d+$/.test(String(value)) ? Number(value) : null;
}

export const UNIQUE_VIOLATION = '23505';

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id            SERIAL PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      company     TEXT NOT NULL,
      city        TEXT NOT NULL,
      country     TEXT NOT NULL DEFAULT 'PK',
      work_mode   TEXT NOT NULL DEFAULT 'on-site'
                  CHECK (work_mode IN ('on-site', 'hybrid', 'remote')),
      employment  TEXT NOT NULL DEFAULT 'full-time'
                  CHECK (employment IN ('full-time', 'part-time', 'contract', 'internship')),
      salary_min      INTEGER,
      salary_max      INTEGER,
      salary_currency TEXT,
      salary_period   TEXT DEFAULT 'month'
                      CHECK (salary_period IN ('hour', 'day', 'month', 'year')),
      description TEXT NOT NULL,
      is_open     BOOLEAN NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS applications (
      id         SERIAL PRIMARY KEY,
      job_id     INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      phone      TEXT,
      note       TEXT,
      cv_file    TEXT NOT NULL,
      cv_name    TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'shortlisted', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      -- One application per person per job, enforced by the database itself.
      UNIQUE (job_id, email)
    );

    CREATE TABLE IF NOT EXISTS ads (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      body        TEXT,
      image_file  TEXT,
      link_url    TEXT,
      -- 'direct' ads are ones you sold and entered yourself. 'network' ads are a
      -- script from an ad network such as Adsterra, which fills the slot itself.
      ad_type     TEXT NOT NULL DEFAULT 'direct'
                  CHECK (ad_type IN ('direct', 'network', 'overlay')),
      script_snippet TEXT,
      size_hint   TEXT,
      -- Where on a page the ad sits...
      slot        TEXT NOT NULL DEFAULT 'top'
                  CHECK (slot IN ('top', 'inline', 'sidebar', 'bottom')),
      -- ...and which pages it may appear on.
      page_scope  TEXT NOT NULL DEFAULT 'all'
                  CHECK (page_scope IN ('all', 'home', 'board', 'job', 'content')),
      priority    INTEGER NOT NULL DEFAULT 0,
      is_active   BOOLEAN NOT NULL DEFAULT TRUE,
      starts_on   DATE,
      ends_on     DATE,
      impressions INTEGER NOT NULL DEFAULT 0,
      clicks      INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Small key/value store for things you should be able to change without a
    -- redeploy, such as how many ads may render on one page.
    CREATE TABLE IF NOT EXISTS settings (
      setting_key   TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

  `);

  // Migrations run before the indexes, because some of them index columns that
  // an older database does not have yet.
  await migrate();

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_applications_job ON applications (job_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_open ON jobs (is_open, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_country ON jobs (country);
    CREATE INDEX IF NOT EXISTS idx_ads_live ON ads (is_active, slot, page_scope);
  `);
}

/**
 * Upgrades a database created by an earlier version of this app. Every step is
 * written so that running it twice is harmless.
 */
async function migrate() {
  await pool.query(`
    DO $$
    BEGIN
      -- "location" held a free-text city and country together; it is now "city"
      -- alongside a separate country code.
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'jobs' AND column_name = 'location') THEN
        ALTER TABLE jobs RENAME COLUMN location TO city;
      END IF;
    END $$;

    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'PK';
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_min INTEGER;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_max INTEGER;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_currency TEXT;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_period TEXT DEFAULT 'month';

    -- The old free-text salary column is replaced by the four columns above.
    ALTER TABLE jobs DROP COLUMN IF EXISTS salary;

    ALTER TABLE ads ADD COLUMN IF NOT EXISTS ad_type TEXT NOT NULL DEFAULT 'direct';
    ALTER TABLE ads ADD COLUMN IF NOT EXISTS script_snippet TEXT;
    ALTER TABLE ads ADD COLUMN IF NOT EXISTS size_hint TEXT;
    ALTER TABLE ads ADD COLUMN IF NOT EXISTS slot TEXT NOT NULL DEFAULT 'top';
    ALTER TABLE ads ADD COLUMN IF NOT EXISTS page_scope TEXT NOT NULL DEFAULT 'all';
    ALTER TABLE ads ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;

    -- 'overlay' was added after the first version, so the constraint is rebuilt.
    ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_ad_type_check;
    ALTER TABLE ads ADD CONSTRAINT ads_ad_type_check
      CHECK (ad_type IN ('direct', 'network', 'overlay'));

    -- More pages were added after the first version, so this is rebuilt too.
    ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_page_scope_check;
    ALTER TABLE ads ADD CONSTRAINT ads_page_scope_check
      CHECK (page_scope IN ('all', 'home', 'board', 'job', 'content'));
  `);

  // The three fixed placements become a slot plus a page scope. Network ads have
  // no link of their own, so link_url stops being mandatory.
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ads' AND column_name = 'placement') THEN
        UPDATE ads SET slot = 'top',     page_scope = 'board' WHERE placement = 'board_top';
        UPDATE ads SET slot = 'inline',  page_scope = 'board' WHERE placement = 'board_inline';
        UPDATE ads SET slot = 'sidebar', page_scope = 'job'   WHERE placement = 'job_sidebar';
        ALTER TABLE ads DROP COLUMN placement;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'ads' AND column_name = 'link_url'
                   AND is_nullable = 'NO') THEN
        ALTER TABLE ads ALTER COLUMN link_url DROP NOT NULL;
      END IF;
    END $$;
  `);

  await pool.query(`
    INSERT INTO settings (setting_key, setting_value) VALUES ('max_ads_per_page', '2')
    ON CONFLICT (setting_key) DO NOTHING;
  `);
}
