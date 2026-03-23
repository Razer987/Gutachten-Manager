/**
 * @file apps/api/src/modules/unfall/unfall.service.ts
 */
import { prisma } from '@gutachten/database';
import { notFound } from '@/middleware/error.middleware';
import type { UpsertUnfallDto } from './unfall.validators';

export const unfallService = {
  async findByGutachtenId(gutachtenId: string) {
    return prisma.unfall.findUnique({ where: { gutachtenId } });
  },

  async upsert(gutachtenId: string, dto: UpsertUnfallDto) {
    const gutachten = await prisma.gutachten.findUnique({
      where: { id: gutachtenId },
      select: { id: true },
    });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }

    return prisma.unfall.upsert({
      where: { gutachtenId },
      create: {
        gutachtenId,
        ...dto,
        unfallZeit: dto.unfallZeit ? new Date(dto.unfallZeit) : null,
        polizeiProtokollDatum: dto.polizeiProtokollDatum ? new Date(dto.polizeiProtokollDatum) : null,
      },
      update: {
        ...dto,
        unfallZeit: dto.unfallZeit ? new Date(dto.unfallZeit) : null,
        polizeiProtokollDatum: dto.polizeiProtokollDatum ? new Date(dto.polizeiProtokollDatum) : null,
      },
    });
  },
};
