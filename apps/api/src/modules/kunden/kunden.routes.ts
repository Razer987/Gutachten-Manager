/**
 * @file apps/api/src/modules/kunden/kunden.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';

import { kundenController } from './kunden.controller';

const router = Router();

router.get('/', asyncHandler(kundenController.list));
router.post('/', asyncHandler(kundenController.create));
router.get('/:id', asyncHandler(kundenController.findById));
router.patch('/:id', asyncHandler(kundenController.update));
router.delete('/:id', asyncHandler(kundenController.delete));
router.post('/:id/kontakte', asyncHandler(kundenController.addKontakt));

export { router as kundenRouter };
