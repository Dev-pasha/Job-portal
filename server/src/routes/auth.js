import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { queryOne } from '../db.js';
import { signToken, requireAdmin } from '../auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Enter your email and password.' });
    }

    const admin = await queryOne('SELECT * FROM admins WHERE email = $1', [
      String(email).trim().toLowerCase(),
    ]);

    // Same message either way, so the form can't be used to discover valid emails.
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: 'That email and password do not match.' });
    }

    res.json({ token: signToken(admin), email: admin.email });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ email: req.admin.email });
});

export default router;
