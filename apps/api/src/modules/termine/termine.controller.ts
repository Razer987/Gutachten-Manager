/**
 * @file apps/api/src/modules/termine/termine.controller.ts
 */
import type { Request, Response } from 'express';

import { termineService } from './termine.service';
import { CreateTerminSchema, TermineListQuerySchema, UpdateTerminSchema } from './termine.validators';

export const termineController = {
  async list(req: Request, res: Response) {
    const query = TermineListQuerySchema.parse(req.query);
    const termine = await termineService.list(query);
    res.json({ success: true, data: termine });
  },

  async findById(req: Request, res: Response) {
    const termin = await termineService.findById(req.params.id);
    res.json({ success: true, data: termin });
  },

  async create(req: Request, res: Response) {
    const dto = CreateTerminSchema.parse(req.body);
    const termin = await termineService.create(dto);
    res.status(201).json({ success: true, data: termin });
  },

  async update(req: Request, res: Response) {
    const dto = UpdateTerminSchema.parse(req.body);
    const termin = await termineService.update(req.params.id, dto);
    res.json({ success: true, data: termin });
  },

  async delete(req: Request, res: Response) {
    const result = await termineService.delete(req.params.id);
    res.json({ success: true, data: result });
  },
};
