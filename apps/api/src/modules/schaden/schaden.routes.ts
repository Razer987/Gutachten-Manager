/**
 * @file apps/api/src/modules/schaden/schaden.routes.ts
 */
import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware';
import { schadenController } from './schaden.controller';

const router = Router({ mergeParams: true });
router.get('/', asyncHandler(schadenController.list));
router.post('/', asyncHandler(schadenController.create));
router.patch('/:id', asyncHandler(schadenController.update));
router.delete('/:id', asyncHandler(schadenController.delete));
export { router as schadenRouter };
