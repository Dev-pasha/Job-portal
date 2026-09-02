import { Router } from 'express';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { query, queryOne, toId, AD_IMAGE_DIR } from '../db.js';
import { requireAdmin } from '../auth.js';
import { handleAdImageUpload } from '../middleware/upload.js';
import { getSetting } from './settings.js';
import {
  SLOTS, PAGE_SCOPES, PAGE_SLOTS, SLOT_PRIORITY, AD_TYPES, COMMON_SIZES,
  isSlot, isPageScope, isPage,
} from '../adSlots.js';

const router = Router();

function validate(body) {
  const errors = [];

  const ad = {
    title: String(body.title || '').trim(),
    body: String(body.body || '').trim() || null,
    ad_type: String(body.ad_type || 'direct').trim(),
    link_url: String(body.link_url || '').trim() || null,
    script_snippet: String(body.script_snippet || '').trim() || null,
    size_hint: String(body.size_hint || '').trim() || null,
    slot: String(body.slot || 'top').trim(),
    page_scope: String(body.page_scope || 'all').trim(),
    priority: Number.parseInt(body.priority, 10) || 0,
    is_active: !['false', '0', 'no'].includes(String(body.is_active ?? true).toLowerCase()),
    starts_on: String(body.starts_on || '').trim() || null,
    ends_on: String(body.ends_on || '').trim() || null,
  };

  if (ad.title.length < 2) errors.push('Ad title is required.');
  if (!AD_TYPES.includes(ad.ad_type)) errors.push('Pick a valid ad type.');
  if (!isPageScope(ad.page_scope)) errors.push('Pick a valid page scope.');

  // An overlay floats over the whole page, so it has no slot to validate.
  if (ad.ad_type !== 'overlay' && !isSlot(ad.slot)) errors.push('Pick a valid slot.');

  if (ad.ad_type === 'overlay') {
    if (!ad.script_snippet) errors.push('Paste the ad code from your network.');
    ad.link_url = null;
    ad.slot = 'top';
    ad.size_hint = null;
  } else if (ad.ad_type === 'direct') {
    // Only http(s), so an ad can never carry a javascript: URL into the page.
    try {
      const url = new URL(ad.link_url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      errors.push('Link must be a full URL starting with http:// or https://');
    }
    ad.script_snippet = null;
  } else {
    if (!ad.script_snippet) {
      errors.push('Paste the ad code from your network.');
    }
    // A network ad has no link of its own; the network's script handles clicks.
    ad.link_url = null;
  }

  if (ad.starts_on && ad.ends_on && ad.starts_on > ad.ends_on) {
    errors.push('The end date is before the start date.');
  }

  return { ad, errors };
}

/** The slot and scope options, so the admin form and the server always agree. */
router.get('/options', (_req, res) => {
  res.json({
    slots: SLOTS,
    pageScopes: PAGE_SCOPES,
    pageSlots: PAGE_SLOTS,
    adTypes: AD_TYPES,
    commonSizes: COMMON_SIZES,
  });
});

/**
 * Public: the floating overlay ad, if one is running.
 *
 * Overlays are fetched separately from slot ads because they are mounted once
 * for the whole visit rather than per page, and because they are exempt from
 * the per-page limit.
 */
router.get('/overlay', async (_req, res, next) => {
  try {
    const ad = await queryOne(
      `SELECT id, script_snippet, page_scope FROM ads
       WHERE is_active = TRUE AND ad_type = 'overlay'
         AND (starts_on IS NULL OR starts_on <= CURRENT_DATE)
         AND (ends_on   IS NULL OR ends_on   >= CURRENT_DATE)
       ORDER BY priority DESC, id DESC LIMIT 1`
    );

    res.json({ ad: ad || null });
  } catch (err) {
    next(err);
  }
});

/** Counts one view of an overlay, which the page reports once it has mounted. */
router.post('/:id/impression', async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    if (id) {
      await query(
        `UPDATE ads SET impressions = impressions + 1
         WHERE id = $1 AND ad_type = 'overlay'`,
        [id]
      );
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * Public: every ad for one page, in one request.
 *
 * Choosing all of a page's ads together is what makes the "maximum ads per page"
 * setting enforceable. If each slot asked independently, none of them could know
 * how many others had already been filled.
 */
router.get('/page', async (req, res, next) => {
  try {
    const page = String(req.query.page || '');
    if (!isPage(page)) return res.json({ slots: {} });

    const available = PAGE_SLOTS[page];
    const maxPerPage = await getSetting('max_ads_per_page');

    if (maxPerPage === 0) return res.json({ slots: {} });

    const candidates = await query(
      `SELECT id, title, body, image_file, ad_type, script_snippet, size_hint, slot, priority
       FROM ads
       WHERE is_active = TRUE
         AND ad_type <> 'overlay'
         AND slot = ANY($1)
         AND (page_scope = 'all' OR page_scope = $2)
         AND (starts_on IS NULL OR starts_on <= CURRENT_DATE)
         AND (ends_on   IS NULL OR ends_on   >= CURRENT_DATE)`,
      [available, page]
    );

    const slots = {};
    const chosen = [];

    // Fill the most valuable slots first, stopping at the configured limit.
    for (const slot of SLOT_PRIORITY) {
      if (chosen.length >= maxPerPage) break;
      if (!available.includes(slot)) continue;

      const forSlot = candidates.filter((ad) => ad.slot === slot);
      if (forSlot.length === 0) continue;

      // Highest priority wins; ties are broken at random so equal ads share the slot.
      const best = Math.max(...forSlot.map((ad) => ad.priority));
      const top = forSlot.filter((ad) => ad.priority === best);
      const pick = top[Math.floor(Math.random() * top.length)];

      slots[slot] = {
        id: pick.id,
        title: pick.title,
        body: pick.body,
        image_file: pick.image_file,
        ad_type: pick.ad_type,
        size_hint: pick.size_hint,
        // Only network ads expose a script. A direct ad's destination stays
        // private and is only reachable through the counted redirect.
        script_snippet: pick.ad_type === 'network' ? pick.script_snippet : null,
      };
      chosen.push(pick.id);
    }

    if (chosen.length) {
      await query('UPDATE ads SET impressions = impressions + 1 WHERE id = ANY($1)', [chosen]);
    }

    res.json({ slots });
  } catch (err) {
    next(err);
  }
});

/** Public: count the click, then send the visitor on to the advertiser. */
router.get('/:id/go', async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const ad = id && (await queryOne('SELECT link_url FROM ads WHERE id = $1', [id]));

    if (!ad?.link_url) return res.redirect('/');

    await query('UPDATE ads SET clicks = clicks + 1 WHERE id = $1', [id]);
    res.redirect(ad.link_url);
  } catch (err) {
    next(err);
  }
});

router.get('/all', requireAdmin, async (_req, res, next) => {
  try {
    res.json(
      await query('SELECT * FROM ads ORDER BY slot, priority DESC, created_at DESC, id DESC')
    );
  } catch (err) {
    next(err);
  }
});

const AD_FIELDS = `title, body, image_file, ad_type, link_url, script_snippet, size_hint,
                   slot, page_scope, priority, is_active, starts_on, ends_on`;

const adValues = (ad, imageFile) => [
  ad.title, ad.body, imageFile, ad.ad_type, ad.link_url, ad.script_snippet, ad.size_hint,
  ad.slot, ad.page_scope, ad.priority, ad.is_active, ad.starts_on, ad.ends_on,
];

router.post('/', requireAdmin, handleAdImageUpload, async (req, res, next) => {
  const discard = () => {
    if (req.file) rmSync(req.file.path, { force: true });
  };

  try {
    const { ad, errors } = validate(req.body || {});
    if (errors.length) {
      discard();
      return res.status(400).json({ error: errors[0], errors });
    }

    const created = await queryOne(
      `INSERT INTO ads (${AD_FIELDS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      adValues(ad, req.file?.filename || null)
    );

    res.status(201).json(created);
  } catch (err) {
    discard();
    next(err);
  }
});

router.put('/:id', requireAdmin, handleAdImageUpload, async (req, res, next) => {
  const discard = () => {
    if (req.file) rmSync(req.file.path, { force: true });
  };

  try {
    const id = toId(req.params.id);
    const existing = id && (await queryOne('SELECT image_file FROM ads WHERE id = $1', [id]));

    if (!existing) {
      discard();
      return res.status(404).json({ error: 'That ad no longer exists.' });
    }

    const { ad, errors } = validate(req.body || {});
    if (errors.length) {
      discard();
      return res.status(400).json({ error: errors[0], errors });
    }

    // A new upload replaces the old image; no upload keeps whatever is there.
    const imageFile = req.file?.filename || existing.image_file;

    const updated = await queryOne(
      `UPDATE ads SET title = $1, body = $2, image_file = $3, ad_type = $4, link_url = $5,
       script_snippet = $6, size_hint = $7, slot = $8, page_scope = $9, priority = $10,
       is_active = $11, starts_on = $12, ends_on = $13
       WHERE id = $14 RETURNING *`,
      [...adValues(ad, imageFile), id]
    );

    if (req.file && existing.image_file) {
      rmSync(path.join(AD_IMAGE_DIR, path.basename(existing.image_file)), { force: true });
    }

    res.json(updated);
  } catch (err) {
    discard();
    next(err);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const deleted =
      id && (await queryOne('DELETE FROM ads WHERE id = $1 RETURNING image_file', [id]));

    if (!deleted) return res.status(404).json({ error: 'That ad no longer exists.' });

    if (deleted.image_file) {
      rmSync(path.join(AD_IMAGE_DIR, path.basename(deleted.image_file)), { force: true });
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
