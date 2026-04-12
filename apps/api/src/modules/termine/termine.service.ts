/**
 * @file apps/api/src/modules/termine/termine.service.ts
 */
import { prisma, type Prisma } from '@gutachten/database';

import { notFound } from '@/middleware/error.middleware';

import type { CreateTerminDto, TermineListQuery, UpdateTerminDto } from './termine.validators';

export const termineService = {
  /** Gibt alle Termine zurück, optional gefiltert nach Zeitraum oder Gutachten-ID. */
  async list(query: TermineListQuery) {
    const where: Prisma.TerminWhereInput = {};

    if (query.gutachtenId) { where.gutachtenId = query.gutachtenId; }

    if (query.von ?? query.bis) {
      where.start = {
        ...(query.von ? { gte: new Date(query.von) } : {}),
        ...(query.bis ? { lte: new Date(query.bis) } : {}),
      };
    }

    return prisma.termin.findMany({
      where,
      orderBy: { start: 'asc' },
      include: {
        gutachten: { select: { id: true, aktenzeichen: true, titel: true } },
      },
    });
  },

  /** Gibt einen einzelnen Termin zurück. Wirft 404 wenn nicht gefunden. */
  async findById(id: string) {
    const termin = await prisma.termin.findUnique({
      where: { id },
      include: { gutachten: { select: { id: true, aktenzeichen: true, titel: true } } },
    });
    if (!termin) { throw notFound('Termin', id); }
    return termin;
  },

  /** Erstellt einen neuen Termin. ISO-8601-Datumsstrings werden in Date-Objekte konvertiert. */
  async create(dto: CreateTerminDto) {
    return prisma.termin.create({
      data: {
        titel: dto.titel,
        beschreibung: dto.beschreibung,
        start: new Date(dto.start),
        ende: new Date(dto.ende),
        ort: dto.ort,
        erinnerung: dto.erinnerung,
        farbe: dto.farbe,
        gutachtenId: dto.gutachtenId ?? null,
      },
      include: {
        gutachten: { select: { id: true, aktenzeichen: true, titel: true } },
      },
    });
  },

  /** Aktualisiert einen Termin (nur übermittelte Felder). Wirft 404 wenn nicht gefunden. */
  async update(id: string, dto: UpdateTerminDto) {
    const existing = await prisma.termin.findUnique({ where: { id }, select: { id: true } });
    if (!existing) { throw notFound('Termin', id); }

    return prisma.termin.update({
      where: { id },
      data: {
        ...(dto.titel !== undefined && { titel: dto.titel }),
        ...(dto.beschreibung !== undefined && { beschreibung: dto.beschreibung }),
        ...(dto.start !== undefined && { start: new Date(dto.start) }),
        ...(dto.ende !== undefined && { ende: new Date(dto.ende) }),
        ...(dto.ort !== undefined && { ort: dto.ort }),
        ...(dto.erinnerung !== undefined && { erinnerung: dto.erinnerung }),
        ...(dto.farbe !== undefined && { farbe: dto.farbe }),
      },
      include: {
        gutachten: { select: { id: true, aktenzeichen: true, titel: true } },
      },
    });
  },

  /** Löscht einen Termin. Wirft 404 wenn nicht gefunden. */
  async delete(id: string) {
    const existing = await prisma.termin.findUnique({ where: { id }, select: { id: true } });
    if (!existing) { throw notFound('Termin', id); }
    await prisma.termin.delete({ where: { id } });
    return { message: 'Termin wurde gelöscht.' };
  },
};
