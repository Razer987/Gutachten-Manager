/**
 * @file apps/api/src/modules/dateien/dateien.controller.ts
 */
import { z } from 'zod';
import type { Request, Response } from 'express';

import { dateienService } from './dateien.service';

const UpdateBeschreibungSchema = z.object({
  beschreibung: z.string().max(500).optional().nullable(),
});

export const dateienController = {
  async list(req: Request, res: Response) {
    const dateien = await dateienService.list(req.params.gutachtenId);
    res.json({ success: true, data: dateien });
  },

  async findById(req: Request, res: Response) {
    const datei = await dateienService.findById(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: datei });
  },

  async delete(req: Request, res: Response) {
    const result = await dateienService.delete(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: result });
  },

  async updateBeschreibung(req: Request, res: Response) {
    const { beschreibung } = UpdateBeschreibungSchema.parse(req.body);
    const datei = await dateienService.updateBeschreibung(req.params.gutachtenId, req.params.id, beschreibung ?? null);
    res.json({ success: true, data: datei });
  },
};
