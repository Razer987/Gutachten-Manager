/**
 * @file apps/api/src/modules/dateien/dateien.routes.ts
 */
import path from 'path';

import { Router } from 'express';
import multer from 'multer';

import { env } from '@/config/env';
import { asyncHandler } from '@/middleware/error.middleware';

import { dateienController } from './dateien.controller';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(env.UPLOAD_DIR));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Dateityp nicht erlaubt: ${file.mimetype}`));
    }
  },
});

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(dateienController.list));
router.post('/', upload.single('datei'), asyncHandler(dateienController.upload));
router.get('/:id/download', asyncHandler(dateienController.download));
router.get('/:id', asyncHandler(dateienController.findById));
router.patch('/:id', asyncHandler(dateienController.updateBeschreibung));
router.delete('/:id', asyncHandler(dateienController.delete));

export { router as dateienRouter };
