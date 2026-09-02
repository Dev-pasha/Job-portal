import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { UPLOAD_DIR, AD_IMAGE_DIR } from '../db.js';

const CV_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/** Never trust the client filename on disk: generate our own. */
function randomName(originalname) {
  const ext = path.extname(originalname).toLowerCase().slice(0, 10);
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

function diskStorage(destination) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => cb(null, randomName(file.originalname)),
  });
}

/** Turns multer's errors into clean JSON instead of a 500. */
function wrap(middleware, limitMessage) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (!err) return next();
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? limitMessage : err.message || 'Could not read that file.';
      res.status(400).json({ error: message });
    });
  };
}

export const handleCvUpload = wrap(
  multer({
    storage: diskStorage(UPLOAD_DIR),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) =>
      CV_TYPES.has(file.mimetype)
        ? cb(null, true)
        : cb(new Error('CV must be a PDF or Word document.')),
  }).single('cv'),
  'That CV is over the 5 MB limit.'
);

// CSV imports are parsed straight from memory, so nothing is written to disk.
export const handleCsvUpload = wrap(
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      const isCsv =
        ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel'].includes(
          file.mimetype
        ) || file.originalname.toLowerCase().endsWith('.csv');

      cb(isCsv ? null : new Error('Upload a .csv file. Export from Excel as "CSV UTF-8".'), isCsv);
    },
  }).single('file'),
  'That file is over the 2 MB limit.'
);

// Ad images are public by design, unlike CVs.
export const handleAdImageUpload = wrap(
  multer({
    storage: diskStorage(AD_IMAGE_DIR),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) =>
      IMAGE_TYPES.has(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Banner must be a PNG, JPG, WEBP or GIF.')),
  }).single('image'),
  'That image is over the 2 MB limit.'
);
