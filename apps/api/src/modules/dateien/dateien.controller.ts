/**
 * @file apps/api/src/modules/dateien/dateien.controller.ts
 */

import { z } from 'zod';
import type { Request, Response } from 'express';

import { dateienService, resolveUploadPath } from './dateien.service';

const UpdateBeschreibungSchema = z.object({
  beschreibung: z.string().trim().max(500).optional().nullable(),
});

export const dateienController = {
  async list(req: Request, res: Response) {
    const dateien = await dateienService.list(req.params.gutachtenId);
    res.json({ success: true, data: dateien });
  },

  async upload(req: Request, res: Response) {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'Keine Datei hochgeladen.' },
      });
      return;
    }
    const beschreibung =
      typeof req.body?.beschreibung === 'string' ? req.body.beschreibung : null;
    const datei = await dateienService.upload(
      req.params.gutachtenId,
      req.file,
      beschreibung,
    );
    res.status(201).json({ success: true, data: datei });
  },

  async findById(req: Request, res: Response) {
    const datei = await dateienService.findById(
      req.params.gutachtenId,
      req.params.id,
    );
    res.json({ success: true, data: datei });
  },

  async delete(req: Request, res: Response) {
    const result = await dateienService.delete(
      req.params.gutachtenId,
      req.params.id,
    );
    res.json({ success: true, data: result });
  },

  async download(req: Request, res: Response) {
    const datei = await dateienService.findById(
      req.params.gutachtenId,
      req.params.id,
    );
    // FIX: Absoluter Pfad wird zur Laufzeit aus env.UPLOAD_DIR + filename aufgelöst.
    // Nie aus dem in der DB gespeicherten pfad-Feld (das wäre ein absoluter Pfad
    // der bei Deployment-Änderungen ungültig werden kann).
    const absolutePath = resolveUploadPath(datei.filename);
    res.download(absolutePath, datei.originalname);
  },

  async updateBeschreibung(req: Request, res: Response) {
    const { beschreibung } = UpdateBeschreibungSchema.parse(req.body);
    const datei = await dateienService.updateBeschreibung(
      req.params.gutachtenId,
      req.params.id,
      beschreibung ?? null,
    );
    res.json({ success: true, data: datei });
  },
};
