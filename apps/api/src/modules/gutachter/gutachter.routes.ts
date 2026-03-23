/**
 * @file apps/api/src/modules/gutachter/gutachter.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';

import { gutachterController } from './gutachter.controller';

const router = Router();

router.get('/', asyncHandler(gutachterController.list));
router.post('/', asyncHandler(gutachterController.create));
router.get('/:id', asyncHandler(gutachterController.findById));
router.patch('/:id', asyncHandler(gutachterController.update));
router.delete('/:id', asyncHandler(gutachterController.delete));

export { router as gutachterRouter };
