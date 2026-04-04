/**
 * @file apps/api/src/modules/dateien/dateien.service.ts
 */
import fs from 'fs';
import path from 'path';

import type { Express } from 'express';
import { prisma } from '@gutachten/database';

import { notFound } from '@/middleware/error.middleware';

export const dateienService = {
  async upload(gutachtenId: string, file: Express.Multer.File, beschreibung: string | null) {
    const gutachten = await prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }

    return prisma.datei.create({
      data: {
        gutachtenId,
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        groesse: file.size,
        pfad: file.path,
        beschreibung,
      },
    });
  },

  async list(gutachtenId: string) {
    return prisma.datei.findMany({
      where: { gutachtenId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(gutachtenId: string, id: string) {
    const datei = await prisma.datei.findFirst({ where: { id, gutachtenId } });
    if (!datei) { throw notFound('Datei', id); }
    return datei;
  },

  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.datei.findFirst({ where: { id, gutachtenId }, select: { id: true, originalname: true, pfad: true } });
    if (!existing) { throw notFound('Datei', id); }
    await prisma.datei.delete({ where: { id } });
    // Datei vom Dateisystem löschen (Fehler ignorieren — DB ist führend)
    if (existing.pfad) {
      try { fs.unlinkSync(path.resolve(existing.pfad)); } catch { /* ignorieren */ }
    }
    return { message: `Datei "${existing.originalname}" wurde gelöscht.` };
  },

  async updateBeschreibung(gutachtenId: string, id: string, beschreibung: string | null) {
    const existing = await prisma.datei.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Datei', id); }
    return prisma.datei.update({ where: { id }, data: { beschreibung } });
  },
};
