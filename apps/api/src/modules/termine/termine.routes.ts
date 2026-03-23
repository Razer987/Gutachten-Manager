/**
 * @file apps/api/src/modules/termine/termine.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';

import { termineController } from './termine.controller';

const router = Router();

router.get('/', asyncHandler(termineController.list));
router.post('/', asyncHandler(termineController.create));
router.get('/:id', asyncHandler(termineController.findById));
router.patch('/:id', asyncHandler(termineController.update));
router.delete('/:id', asyncHandler(termineController.delete));

export { router as termineRouter };
