/**
 * @file apps/api/src/modules/notizen/notizen.controller.ts
 */
import type { Request, Response } from 'express';
import { notizenService } from './notizen.service';
import { CreateNotizSchema, UpdateNotizSchema } from './notizen.validators';

export const notizenController = {
  async list(req: Request, res: Response) {
    const notizen = await notizenService.list(req.params.gutachtenId);
    res.json({ success: true, data: notizen });
  },
  async create(req: Request, res: Response) {
    const dto = CreateNotizSchema.parse(req.body);
    const notiz = await notizenService.create(req.params.gutachtenId, dto);
    res.status(201).json({ success: true, data: notiz });
  },
  async update(req: Request, res: Response) {
    const dto = UpdateNotizSchema.parse(req.body);
    const notiz = await notizenService.update(req.params.gutachtenId, req.params.id, dto);
    res.json({ success: true, data: notiz });
  },
  async delete(req: Request, res: Response) {
    const result = await notizenService.delete(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: result });
  },
};
