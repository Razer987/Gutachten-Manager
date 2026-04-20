/**
 * @file apps/api/src/modules/gutachten/gutachten.routes.ts
 */
import { Router } from 'express';
import type { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/error.middleware';

import { gutachtenController } from './gutachten.controller';
import { erstelleGutachtenPdf } from './pdf.service';

const router = Router();

router.get('/', asyncHandler(gutachtenController.list));
router.post('/', asyncHandler(gutachtenController.create));
router.get('/:id', asyncHandler(gutachtenController.findById));
router.patch('/:id', asyncHandler(gutachtenController.update));
router.delete('/:id', asyncHandler(gutachtenController.delete));
router.patch('/:id/status', asyncHandler(gutachtenController.updateStatus));
router.post('/:id/verknuepfen', asyncHandler(gutachtenController.verknuepfen));

// PDF-Export
router.get(
  '/:id/pdf',
  asyncHandler(async (req: Request, res: Response) => {
    await erstelleGutachtenPdf(req.params.id, res);
  }),
);

export { router as gutachtenRouter };
