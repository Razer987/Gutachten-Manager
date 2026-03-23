/**
 * @file apps/api/src/modules/aufgaben/aufgaben.controller.ts
 */
import type { Request, Response } from 'express';
import { aufgabenService } from './aufgaben.service';
import { CreateAufgabeSchema, UpdateAufgabeSchema } from './aufgaben.validators';

export const aufgabenController = {
  async list(req: Request, res: Response) {
    const aufgaben = await aufgabenService.list(req.params.gutachtenId);
    res.json({ success: true, data: aufgaben });
  },
  async create(req: Request, res: Response) {
    const dto = CreateAufgabeSchema.parse(req.body);
    const aufgabe = await aufgabenService.create(req.params.gutachtenId, dto);
    res.status(201).json({ success: true, data: aufgabe });
  },
  async update(req: Request, res: Response) {
    const dto = UpdateAufgabeSchema.parse(req.body);
    const aufgabe = await aufgabenService.update(req.params.gutachtenId, req.params.id, dto);
    res.json({ success: true, data: aufgabe });
  },
  async delete(req: Request, res: Response) {
    const result = await aufgabenService.delete(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: result });
  },
};
