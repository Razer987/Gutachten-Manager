/**
 * @file apps/api/src/modules/unfall/unfall.controller.ts
 */
import type { Request, Response } from 'express';
import { unfallService } from './unfall.service';
import { UpsertUnfallSchema } from './unfall.validators';

export const unfallController = {
  async findByGutachtenId(req: Request, res: Response) {
    const unfall = await unfallService.findByGutachtenId(req.params.gutachtenId);
    res.json({ success: true, data: unfall });
  },

  async upsert(req: Request, res: Response) {
    const dto = UpsertUnfallSchema.parse(req.body);
    const unfall = await unfallService.upsert(req.params.gutachtenId, dto);
    res.json({ success: true, data: unfall });
  },
};
