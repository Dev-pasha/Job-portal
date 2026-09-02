import { Router } from 'express';
import { referencePayload } from '../reference.js';

const router = Router();

// Static for the life of the process, so it is built once and cached hard.
const payload = referencePayload();

router.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.json(payload);
});

export default router;
