/**
 * @file apps/api/src/modules/suche/suche.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '../../middleware/error.middleware';

import { sucheController } from './suche.controller';

const router = Router();

router.get('/', asyncHandler(sucheController.suche));

export { router as sucheRouter };
