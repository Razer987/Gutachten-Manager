/**
 * @file apps/api/src/modules/kunden/kunden.controller.ts
 */
import type { Request, Response } from 'express';

import { kundenService } from './kunden.service';
import { CreateKundeSchema, KontaktHistorieSchema, KundenListQuerySchema, UpdateKundeSchema } from './kunden.validators';

export const kundenController = {
  async list(req: Request, res: Response) {
    const query = KundenListQuerySchema.parse(req.query);
    const result = await kundenService.list(query);
    res.json({ success: true, ...result });
  },

  async findById(req: Request, res: Response) {
    const kunde = await kundenService.findById(req.params.id);
    res.json({ success: true, data: kunde });
  },

  async create(req: Request, res: Response) {
    const dto = CreateKundeSchema.parse(req.body);
    const kunde = await kundenService.create(dto);
    res.status(201).json({ success: true, data: kunde });
  },

  async update(req: Request, res: Response) {
    const dto = UpdateKundeSchema.parse(req.body);
    const kunde = await kundenService.update(req.params.id, dto);
    res.json({ success: true, data: kunde });
  },

  async delete(req: Request, res: Response) {
    const result = await kundenService.delete(req.params.id);
    res.json({ success: true, data: result });
  },

  async addKontakt(req: Request, res: Response) {
    const dto = KontaktHistorieSchema.parse(req.body);
    const kontakt = await kundenService.addKontakt(req.params.id, dto);
    res.status(201).json({ success: true, data: kontakt });
  },
};
