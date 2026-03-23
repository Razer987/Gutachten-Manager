/**
 * @file apps/api/src/modules/schaden/schaden.controller.ts
 */
import type { Request, Response } from 'express';
import { schadenService } from './schaden.service';
import { CreateSchadenspostenSchema, UpdateSchadenspostenSchema } from './schaden.validators';

export const schadenController = {
  async list(req: Request, res: Response) {
    const result = await schadenService.list(req.params.gutachtenId);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const dto = CreateSchadenspostenSchema.parse(req.body);
    const posten = await schadenService.create(req.params.gutachtenId, dto);
    res.status(201).json({ success: true, data: posten });
  },
  async update(req: Request, res: Response) {
    const dto = UpdateSchadenspostenSchema.parse(req.body);
    const posten = await schadenService.update(req.params.gutachtenId, req.params.id, dto);
    res.json({ success: true, data: posten });
  },
  async delete(req: Request, res: Response) {
    const result = await schadenService.delete(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: result });
  },
};
