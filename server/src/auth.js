import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

export function signToken(admin) {
  return jwt.sign({ sub: admin.id, email: admin.email }, SECRET, { expiresIn: '7d' });
}

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Sign in to continue.' });
  }

  try {
    req.admin = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Your session expired. Sign in again.' });
  }
}
