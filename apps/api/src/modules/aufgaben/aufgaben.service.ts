/**
 * @file apps/api/src/modules/aufgaben/aufgaben.service.ts
 */
import { prisma } from '@gutachten/database';
import { findOrThrow } from '../../lib/find-or-throw';
import { notFound } from '../../middleware/error.middleware';
import type { CreateAufgabeDto, UpdateAufgabeDto } from './aufgaben.validators';

export const aufgabenService = {
  async list(gutachtenId: string) {
    return prisma.aufgabe.findMany({
      where: { gutachtenId },
      orderBy: [{ erledigt: 'asc' }, { faelligAm: 'asc' }, { createdAt: 'desc' }],
    });
  },

  async create(gutachtenId: string, dto: CreateAufgabeDto) {
    await findOrThrow(prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } }), 'Gutachten', gutachtenId);
    // dto.faelligAm ist bereits ein Date-Objekt (Zod-Transformation in Validator)
    return prisma.aufgabe.create({
      data: {
        gutachtenId,
        titel: dto.titel,
        erledigt: dto.erledigt,
        faelligAm: dto.faelligAm ?? null,
        prioritaet: dto.prioritaet,
        zugewiesen: dto.zugewiesen ?? null,
      },
    });
  },

  async update(gutachtenId: string, id: string, dto: UpdateAufgabeDto) {
    const existing = await prisma.aufgabe.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Aufgabe', id); }

    return prisma.aufgabe.update({
      where: { id },
      data: {
        ...(dto.titel !== undefined && { titel: dto.titel }),
        ...(dto.erledigt !== undefined && { erledigt: dto.erledigt }),
        ...(dto.faelligAm !== undefined && { faelligAm: dto.faelligAm ?? null }),
        ...(dto.prioritaet !== undefined && { prioritaet: dto.prioritaet }),
        ...(dto.zugewiesen !== undefined && { zugewiesen: dto.zugewiesen ?? null }),
        ...(dto.erledigt === true && { erledigtAm: new Date() }),
      },
    });
  },

  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.aufgabe.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Aufgabe', id); }
    await prisma.aufgabe.delete({ where: { id } });
    return { message: 'Aufgabe wurde gelöscht.' };
  },
};
