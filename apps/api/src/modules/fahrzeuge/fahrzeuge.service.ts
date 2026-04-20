/**
 * @file apps/api/src/modules/fahrzeuge/fahrzeuge.service.ts
 */
import { prisma } from '@gutachten/database';
import { notFound } from '../../middleware/error.middleware';
import type { CreateFahrzeugDto, UpdateFahrzeugDto } from './fahrzeuge.validators';

export const fahrzeugeService = {
  async list(gutachtenId: string) {
    return prisma.fahrzeug.findMany({
      where: { gutachtenId },
      orderBy: { createdAt: 'asc' },
      include: { personen: { select: { id: true, vorname: true, nachname: true, typ: true } } },
    });
  },

  async findById(gutachtenId: string, id: string) {
    const fahrzeug = await prisma.fahrzeug.findFirst({
      where: { id, gutachtenId },
      include: { personen: true },
    });
    if (!fahrzeug) { throw notFound('Fahrzeug', id); }
    return fahrzeug;
  },

  async create(gutachtenId: string, dto: CreateFahrzeugDto) {
    const gutachten = await prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }
    return prisma.fahrzeug.create({ data: { gutachtenId, ...dto } });
  },

  async update(gutachtenId: string, id: string, dto: UpdateFahrzeugDto) {
    const existing = await prisma.fahrzeug.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Fahrzeug', id); }
    return prisma.fahrzeug.update({ where: { id }, data: dto });
  },

  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.fahrzeug.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Fahrzeug', id); }
    await prisma.fahrzeug.delete({ where: { id } });
    return { message: 'Fahrzeug wurde gelöscht.' };
  },
};
