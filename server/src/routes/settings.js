import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireAdmin } from '../auth.js';

const router = Router();

/**
 * Every setting the admin area can change, with the rules for validating it.
 * Values are stored as text and parsed on read, so adding a setting later means
 * adding one entry here rather than a migration.
 */
export const SETTINGS = {
  max_ads_per_page: {
    label: 'Maximum ads on one page',
    help: 'Slots beyond this limit stay empty. Higher earns more per visit but pushes applications down.',
    type: 'integer',
    min: 0,
    max: 4,
    fallback: 2,
    group: 'ads',
  },
  site_name: {
    label: 'Site name',
    help: 'Shown in the header, the footer and your legal pages.',
    type: 'text',
    maxLength: 60,
    fallback: 'Northline Jobs',
    group: 'site',
    public: true,
  },
  company_name: {
    label: 'Legal company name',
    help: 'The entity responsible for the site. Used in the privacy policy and terms.',
    type: 'text',
    maxLength: 120,
    fallback: '',
    group: 'site',
    public: true,
  },
  contact_email: {
    label: 'Contact email',
    help: 'Where visitors reach you, including data protection requests.',
    type: 'text',
    maxLength: 120,
    fallback: '',
    group: 'site',
    public: true,
  },
  contact_address: {
    label: 'Postal address',
    help: 'Optional, but a real address makes a job board look considerably more credible.',
    type: 'text',
    maxLength: 200,
    fallback: '',
    group: 'site',
    public: true,
  },
  policy_updated_on: {
    label: 'Legal pages last updated',
    help: 'Shown at the top of the privacy policy, terms and cookie pages.',
    type: 'text',
    maxLength: 40,
    fallback: '',
    group: 'site',
    public: true,
  },
};

/** The settings a visitor's browser is allowed to read. */
export const PUBLIC_SETTINGS = Object.entries(SETTINGS)
  .filter(([, spec]) => spec.public)
  .map(([key]) => key);

export async function getSetting(key) {
  const spec = SETTINGS[key];
  const row = await queryOne('SELECT setting_value FROM settings WHERE setting_key = $1', [key]);

  if (!row) return spec.fallback;

  if (spec.type === 'integer') {
    const parsed = Number.parseInt(row.setting_value, 10);
    if (!Number.isFinite(parsed)) return spec.fallback;
    return Math.min(spec.max, Math.max(spec.min, parsed));
  }

  return row.setting_value;
}

/** Everything the public site needs, in one request. */
export async function publicSettings() {
  const values = {};
  for (const key of PUBLIC_SETTINGS) values[key] = await getSetting(key);
  return values;
}

router.get('/', requireAdmin, async (_req, res, next) => {
  try {
    const values = {};
    for (const key of Object.keys(SETTINGS)) values[key] = await getSetting(key);

    res.json({ values, spec: SETTINGS });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAdmin, async (req, res, next) => {
  try {
    const updates = req.body || {};
    const errors = [];

    for (const [key, raw] of Object.entries(updates)) {
      const spec = SETTINGS[key];
      if (!spec) {
        errors.push(`"${key}" is not a setting.`);
        continue;
      }

      let value;

      if (spec.type === 'integer') {
        const parsed = Number.parseInt(raw, 10);
        if (!Number.isFinite(parsed) || parsed < spec.min || parsed > spec.max) {
          errors.push(`${spec.label} must be a whole number between ${spec.min} and ${spec.max}.`);
          continue;
        }
        value = String(parsed);
      } else {
        value = String(raw ?? '').trim();
        if (value.length > spec.maxLength) {
          errors.push(`${spec.label} must be ${spec.maxLength} characters or fewer.`);
          continue;
        }
      }

      await query(
        `INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2)
         ON CONFLICT (setting_key)
         DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now()`,
        [key, value]
      );
    }

    if (errors.length) return res.status(400).json({ error: errors[0], errors });

    const values = {};
    for (const key of Object.keys(SETTINGS)) values[key] = await getSetting(key);

    res.json({ values });
  } catch (err) {
    next(err);
  }
});

export default router;
