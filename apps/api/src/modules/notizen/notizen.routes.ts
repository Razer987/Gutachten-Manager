/**
 * @file apps/api/src/modules/notizen/notizen.routes.ts
 */
import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware';
import { notizenController } from './notizen.controller';

const router = Router({ mergeParams: true });
router.get('/', asyncHandler(notizenController.list));
router.post('/', asyncHandler(notizenController.create));
router.patch('/:id', asyncHandler(notizenController.update));
router.delete('/:id', asyncHandler(notizenController.delete));
export { router as notizenRouter };
