/**
 * @file apps/api/src/modules/gutachter/gutachter.controller.ts
 */
import type { Request, Response } from 'express';

import { gutachterService } from './gutachter.service';
import { CreateGutachterSchema, GutachterListQuerySchema, UpdateGutachterSchema } from './gutachter.validators';

export const gutachterController = {
  async list(req: Request, res: Response) {
    const query = GutachterListQuerySchema.parse(req.query);
    const result = await gutachterService.list(query);
    res.json({ success: true, data: result });
  },

  async findById(req: Request, res: Response) {
    const gutachter = await gutachterService.findById(req.params.id);
    res.json({ success: true, data: gutachter });
  },

  async create(req: Request, res: Response) {
    const dto = CreateGutachterSchema.parse(req.body);
    const gutachter = await gutachterService.create(dto);
    res.status(201).json({ success: true, data: gutachter });
  },

  async update(req: Request, res: Response) {
    const dto = UpdateGutachterSchema.parse(req.body);
    const gutachter = await gutachterService.update(req.params.id, dto);
    res.json({ success: true, data: gutachter });
  },

  async delete(req: Request, res: Response) {
    const result = await gutachterService.delete(req.params.id);
    res.json({ success: true, data: result });
  },
};
