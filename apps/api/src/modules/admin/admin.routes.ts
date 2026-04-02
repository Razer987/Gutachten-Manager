/**
 * @file apps/api/src/modules/admin/admin.routes.ts
 */
import { Router } from 'express';
import type { Request, Response } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';
import { erstelleBackup, listeBackups } from '@/services/backup.service';

import { adminController } from './admin.controller';

const router = Router();

router.get('/feature-flags', asyncHandler(adminController.getFeatureFlags));
router.patch('/feature-flags/:name', asyncHandler(adminController.toggleFeatureFlag));

// Backup-Endpunkte
router.get(
  '/backups',
  asyncHandler(async (_req: Request, res: Response) => {
    const backups = listeBackups();
    res.json({ success: true, data: backups });
  }),
);

router.post(
  '/backups',
  asyncHandler(async (_req: Request, res: Response) => {
    await erstelleBackup();
    res.json({ success: true, data: { message: 'Backup erfolgreich erstellt.' } });
  }),
);

export { router as adminRouter };
