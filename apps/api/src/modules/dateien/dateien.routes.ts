/**
 * @file apps/api/src/modules/dateien/dateien.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';

import { dateienController } from './dateien.controller';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(dateienController.list));
router.get('/:id', asyncHandler(dateienController.findById));
router.patch('/:id', asyncHandler(dateienController.updateBeschreibung));
router.delete('/:id', asyncHandler(dateienController.delete));

export { router as dateienRouter };
