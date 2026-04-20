/**
 * @file apps/api/src/modules/personen/personen.routes.ts
 */
import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware';
import { personenController } from './personen.controller';

const router = Router({ mergeParams: true });
router.get('/', asyncHandler(personenController.list));
router.post('/', asyncHandler(personenController.create));
router.get('/:id', asyncHandler(personenController.findById));
router.patch('/:id', asyncHandler(personenController.update));
router.delete('/:id', asyncHandler(personenController.delete));
export { router as personenRouter };
