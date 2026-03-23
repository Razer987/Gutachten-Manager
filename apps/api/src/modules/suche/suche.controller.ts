/**
 * @file apps/api/src/modules/suche/suche.controller.ts
 */
import { z } from 'zod';
import type { Request, Response } from 'express';

import { sucheService } from './suche.service';

const SucheQuerySchema = z.object({
  q: z.string().min(1).max(200),
});

export const sucheController = {
  async suche(req: Request, res: Response) {
    const { q } = SucheQuerySchema.parse(req.query);
    const result = await sucheService.suche(q);
    res.json({ success: true, data: result });
  },
};
