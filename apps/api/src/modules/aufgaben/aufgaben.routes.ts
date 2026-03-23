/**
 * @file apps/api/src/modules/aufgaben/aufgaben.routes.ts
 */
import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';
import { aufgabenController } from './aufgaben.controller';

const router = Router({ mergeParams: true });
router.get('/', asyncHandler(aufgabenController.list));
router.post('/', asyncHandler(aufgabenController.create));
router.patch('/:id', asyncHandler(aufgabenController.update));
router.delete('/:id', asyncHandler(aufgabenController.delete));
export { router as aufgabenRouter };
