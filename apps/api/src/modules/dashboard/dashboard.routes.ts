/**
 * @file apps/api/src/modules/dashboard/dashboard.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '../../middleware/error.middleware';

import { dashboardController } from './dashboard.controller';

const router = Router();

router.get('/stats', asyncHandler(dashboardController.getStats));
router.get('/monatsuebersicht', asyncHandler(dashboardController.getMonatsuebersicht));
router.get('/fristen', asyncHandler(dashboardController.getFristen));

export { router as dashboardRouter };
