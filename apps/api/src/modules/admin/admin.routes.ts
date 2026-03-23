/**
 * @file apps/api/src/modules/admin/admin.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';

import { adminController } from './admin.controller';

const router = Router();

router.get('/feature-flags', asyncHandler(adminController.getFeatureFlags));
router.patch('/feature-flags/:name', asyncHandler(adminController.toggleFeatureFlag));

export { router as adminRouter };
