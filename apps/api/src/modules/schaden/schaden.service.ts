/**
 * @file apps/api/src/modules/schaden/schaden.service.ts
 */
import { prisma } from '@gutachten/database';
import { findOrThrow } from '../../lib/find-or-throw';
import { notFound } from '../../middleware/error.middleware';
import type { CreateSchadenspostenDto, UpdateSchadenspostenDto } from './schaden.validators';

export const schadenService = {
  async list(gutachtenId: string) {
    const posten = await prisma.schadensposten.findMany({
      where: { gutachtenId },
      orderBy: { position: 'asc' },
    });

    const gesamtCents = posten.reduce((sum, p) => sum + p.betragCents, 0);

    return {
      posten,
      summen: {
        gesamtCents,
        gesamtEuro: gesamtCents / 100,
        anzahl: posten.length,
      },
    };
  },

  async create(gutachtenId: string, dto: CreateSchadenspostenDto) {
    await findOrThrow(prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } }), 'Gutachten', gutachtenId);
    return prisma.schadensposten.create({ data: { gutachtenId, ...dto } });
  },

  async update(gutachtenId: string, id: string, dto: UpdateSchadenspostenDto) {
    const existing = await prisma.schadensposten.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Schadensposten', id); }
    return prisma.schadensposten.update({ where: { id }, data: dto });
  },

  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.schadensposten.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Schadensposten', id); }
    await prisma.schadensposten.delete({ where: { id } });
    return { message: 'Schadensposten wurde gelöscht.' };
  },
};
