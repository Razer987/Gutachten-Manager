/**
 * @file apps/api/src/modules/dateien/dateien.service.ts
 */
import { prisma } from '@gutachten/database';

import { notFound } from '@/middleware/error.middleware';

export const dateienService = {
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
    const existing = await prisma.datei.findFirst({ where: { id, gutachtenId }, select: { id: true, originalname: true } });
    if (!existing) { throw notFound('Datei', id); }
    await prisma.datei.delete({ where: { id } });
    return { message: `Datei "${existing.originalname}" wurde gelöscht.` };
  },

  async updateBeschreibung(gutachtenId: string, id: string, beschreibung: string | null) {
    const existing = await prisma.datei.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Datei', id); }
    return prisma.datei.update({ where: { id }, data: { beschreibung } });
  },
};
