/**
 * @file apps/api/src/modules/dateien/dateien.service.ts
 *
 * PORTABILITÄT: In der Datenbank wird nur der Dateiname (file.filename)
 * gespeichert, niemals der absolute Pfad. Der absolute Pfad wird zur
 * Laufzeit aus env.UPLOAD_DIR + filename zusammengesetzt.
 *
 * Alter Bug: file.path (absoluter Pfad wie /app/uploads/xyz.pdf) wurde
 * in pfad gespeichert. Bei Deployment-Änderungen (z.B. Docker → Bare-Metal)
 * brachen alle Downloads, weil der Pfad nicht mehr existierte.
 */

import fs from 'fs';
import path from 'path';

import type { Express } from 'express';
import { prisma } from '@gutachten/database';

import { env } from '@/config/env';
import { notFound } from '@/middleware/error.middleware';

/** Löst den absoluten Pfad einer Datei zur Laufzeit auf. */
export function resolveUploadPath(filename: string): string {
  return path.resolve(env.UPLOAD_DIR, filename);
}

export const dateienService = {
  /** Speichert eine von Multer hochgeladene Datei in der DB. Wirft 404 wenn Gutachten nicht gefunden. */
  async upload(gutachtenId: string, file: Express.Multer.File, beschreibung: string | null) {
    const gutachten = await prisma.gutachten.findUnique({
      where: { id: gutachtenId },
      select: { id: true },
    });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }

    return prisma.datei.create({
      data: {
        gutachtenId,
        filename:     file.filename,        // Nur der Dateiname (portabel)
        originalname: file.originalname,
        mimetype:     file.mimetype,
        groesse:      file.size,
        pfad:         file.filename,        // FIX: filename statt file.path (kein absoluter Pfad)
        beschreibung,
      },
    });
  },

  /** Gibt alle Dateien eines Gutachtens zurück, neueste zuerst. */
  async list(gutachtenId: string) {
    return prisma.datei.findMany({
      where: { gutachtenId },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Gibt eine einzelne Datei zurück. Stellt sicher dass sie zum Gutachten gehört. Wirft 404 wenn nicht gefunden. */
  async findById(gutachtenId: string, id: string) {
    const datei = await prisma.datei.findFirst({ where: { id, gutachtenId } });
    if (!datei) { throw notFound('Datei', id); }
    return datei;
  },

  /** Löscht eine Datei aus DB und Dateisystem. Wirft 404 wenn nicht gefunden. */
  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.datei.findFirst({
      where: { id, gutachtenId },
      select: { id: true, originalname: true, filename: true },
    });
    if (!existing) { throw notFound('Datei', id); }

    await prisma.datei.delete({ where: { id } });

    // Datei vom Dateisystem löschen — Pfad wird zur Laufzeit aufgelöst (nicht aus DB gelesen)
    try {
      fs.unlinkSync(resolveUploadPath(existing.filename));
    } catch {
      // Ignorieren wenn Datei bereits fehlt — DB-Eintrag ist führend
    }

    return { message: `Datei "${existing.originalname}" wurde gelöscht.` };
  },

  /** Aktualisiert die Beschreibung einer Datei. Null löscht die Beschreibung. */
  async updateBeschreibung(gutachtenId: string, id: string, beschreibung: string | null) {
    const existing = await prisma.datei.findFirst({
      where: { id, gutachtenId },
      select: { id: true },
    });
    if (!existing) { throw notFound('Datei', id); }
    return prisma.datei.update({ where: { id }, data: { beschreibung } });
  },
};
