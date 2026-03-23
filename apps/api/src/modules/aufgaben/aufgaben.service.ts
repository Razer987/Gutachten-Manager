/**
 * @file apps/api/src/modules/aufgaben/aufgaben.service.ts
 */
import { prisma } from '@gutachten/database';
import { notFound } from '@/middleware/error.middleware';
import type { CreateAufgabeDto, UpdateAufgabeDto } from './aufgaben.validators';

export const aufgabenService = {
  async list(gutachtenId: string) {
    return prisma.aufgabe.findMany({
      where: { gutachtenId },
      orderBy: [{ erledigt: 'asc' }, { faelligAm: 'asc' }, { createdAt: 'desc' }],
    });
  },

  async create(gutachtenId: string, dto: CreateAufgabeDto) {
    const gutachten = await prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }
    return prisma.aufgabe.create({
      data: {
        gutachtenId,
        ...dto,
        faelligAm: dto.faelligAm ? new Date(dto.faelligAm) : null,
      },
    });
  },

  async update(gutachtenId: string, id: string, dto: UpdateAufgabeDto) {
    const existing = await prisma.aufgabe.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Aufgabe', id); }

    const data: Parameters<typeof prisma.aufgabe.update>[0]['data'] = { ...dto };
    if (dto.faelligAm !== undefined) {
      data.faelligAm = dto.faelligAm ? new Date(dto.faelligAm) : null;
    }
    if (dto.erledigt === true) {
      data.erledigtAm = new Date();
    }

    return prisma.aufgabe.update({ where: { id }, data });
  },

  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.aufgabe.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Aufgabe', id); }
    await prisma.aufgabe.delete({ where: { id } });
    return { message: 'Aufgabe wurde gelöscht.' };
  },
};
