/**
 * @file apps/api/src/modules/fahrzeuge/fahrzeuge.routes.ts
 */
import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware';
import { fahrzeugeController } from './fahrzeuge.controller';

const router = Router({ mergeParams: true });
router.get('/', asyncHandler(fahrzeugeController.list));
router.post('/', asyncHandler(fahrzeugeController.create));
router.get('/:id', asyncHandler(fahrzeugeController.findById));
router.patch('/:id', asyncHandler(fahrzeugeController.update));
router.delete('/:id', asyncHandler(fahrzeugeController.delete));
export { router as fahrzeugeRouter };
