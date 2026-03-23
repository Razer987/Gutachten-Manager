/**
 * @file apps/api/src/modules/gutachten/gutachten.controller.ts
 */
import type { Request, Response } from 'express';

import { gutachtenService } from './gutachten.service';
import {
  CreateGutachtenSchema,
  GutachtenListQuerySchema,
  UpdateGutachtenSchema,
  UpdateStatusSchema,
  VerknuepfungSchema,
} from './gutachten.validators';

export const gutachtenController = {
  async list(req: Request, res: Response) {
    const query = GutachtenListQuerySchema.parse(req.query);
    const result = await gutachtenService.list(query);
    res.json({ success: true, ...result });
  },

  async findById(req: Request, res: Response) {
    const gutachten = await gutachtenService.findById(req.params.id);
    res.json({ success: true, data: gutachten });
  },

  async create(req: Request, res: Response) {
    const dto = CreateGutachtenSchema.parse(req.body);
    const gutachten = await gutachtenService.create(dto);
    res.status(201).json({ success: true, data: gutachten });
  },

  async update(req: Request, res: Response) {
    const dto = UpdateGutachtenSchema.parse(req.body);
    const gutachten = await gutachtenService.update(req.params.id, dto);
    res.json({ success: true, data: gutachten });
  },

  async updateStatus(req: Request, res: Response) {
    const dto = UpdateStatusSchema.parse(req.body);
    const gutachten = await gutachtenService.updateStatus(req.params.id, dto);
    res.json({ success: true, data: gutachten });
  },

  async delete(req: Request, res: Response) {
    const result = await gutachtenService.delete(req.params.id);
    res.json({ success: true, data: result });
  },

  async verknuepfen(req: Request, res: Response) {
    const dto = VerknuepfungSchema.parse(req.body);
    const result = await gutachtenService.verknuepfen(req.params.id, dto.gutachtenId);
    res.json({ success: true, data: result });
  },
};
