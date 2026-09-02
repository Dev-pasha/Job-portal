import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb, AD_IMAGE_DIR } from './db.js';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import applicationRoutes from './routes/applications.js';
import adRoutes from './routes/ads.js';
import referenceRoutes from './routes/reference.js';
import settingsRoutes from './routes/settings.js';
import siteRoutes from './routes/site.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Ad banners are public. Note that CVs live in a different directory and are
// never mounted here; they are only reachable through an authenticated route.
app.use('/ad-images', express.static(AD_IMAGE_DIR, { maxAge: '7d' }));

app.use('/api/reference', referenceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/site', siteRoutes);
app.use('/api', applicationRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

try {
  await initDb();
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
} catch (err) {
  const cannotConnect = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '28P01', '3D000'].includes(
    err.code
  );

  if (cannotConnect) {
    console.error('\nCould not connect to PostgreSQL.');
    console.error(`  ${err.message}\n`);
    console.error('Check that Postgres is running and DATABASE_URL in server/.env is correct.');
  } else {
    console.error('\nThe database is reachable but the schema could not be prepared.');
    console.error(`  ${err.message}\n`);
  }

  process.exit(1);
}
