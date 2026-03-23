/**
 * @file apps/api/src/modules/unfall/unfall.routes.ts
 */
import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';
import { unfallController } from './unfall.controller';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(unfallController.findByGutachtenId));
router.put('/', asyncHandler(unfallController.upsert));

export { router as unfallRouter };
