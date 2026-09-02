import { Router } from 'express';
import { publicSettings } from './settings.js';

const router = Router();

/** Public: the site name and contact details used by the footer and legal pages. */
router.get('/', async (_req, res, next) => {
  try {
    res.json(await publicSettings());
  } catch (err) {
    next(err);
  }
});

export default router;
