/**
 * @file apps/api/src/modules/fahrzeuge/fahrzeuge.controller.ts
 */
import type { Request, Response } from 'express';
import { fahrzeugeService } from './fahrzeuge.service';
import { CreateFahrzeugSchema, UpdateFahrzeugSchema } from './fahrzeuge.validators';

export const fahrzeugeController = {
  async list(req: Request, res: Response) {
    const fahrzeuge = await fahrzeugeService.list(req.params.gutachtenId);
    res.json({ success: true, data: fahrzeuge });
  },
  async findById(req: Request, res: Response) {
    const fahrzeug = await fahrzeugeService.findById(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: fahrzeug });
  },
  async create(req: Request, res: Response) {
    const dto = CreateFahrzeugSchema.parse(req.body);
    const fahrzeug = await fahrzeugeService.create(req.params.gutachtenId, dto);
    res.status(201).json({ success: true, data: fahrzeug });
  },
  async update(req: Request, res: Response) {
    const dto = UpdateFahrzeugSchema.parse(req.body);
    const fahrzeug = await fahrzeugeService.update(req.params.gutachtenId, req.params.id, dto);
    res.json({ success: true, data: fahrzeug });
  },
  async delete(req: Request, res: Response) {
    const result = await fahrzeugeService.delete(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: result });
  },
};
