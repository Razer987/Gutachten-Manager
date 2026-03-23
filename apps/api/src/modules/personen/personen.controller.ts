/**
 * @file apps/api/src/modules/personen/personen.controller.ts
 */
import type { Request, Response } from 'express';
import { personenService } from './personen.service';
import { CreatePersonSchema, UpdatePersonSchema } from './personen.validators';

export const personenController = {
  async list(req: Request, res: Response) {
    const personen = await personenService.list(req.params.gutachtenId);
    res.json({ success: true, data: personen });
  },
  async findById(req: Request, res: Response) {
    const person = await personenService.findById(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: person });
  },
  async create(req: Request, res: Response) {
    const dto = CreatePersonSchema.parse(req.body);
    const person = await personenService.create(req.params.gutachtenId, dto);
    res.status(201).json({ success: true, data: person });
  },
  async update(req: Request, res: Response) {
    const dto = UpdatePersonSchema.parse(req.body);
    const person = await personenService.update(req.params.gutachtenId, req.params.id, dto);
    res.json({ success: true, data: person });
  },
  async delete(req: Request, res: Response) {
    const result = await personenService.delete(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: result });
  },
};
