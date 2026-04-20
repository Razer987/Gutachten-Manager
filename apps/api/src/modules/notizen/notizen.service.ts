/**
 * @file apps/api/src/modules/notizen/notizen.service.ts
 */
import { prisma } from '@gutachten/database';
import { notFound } from '../../middleware/error.middleware';
import type { CreateNotizDto, UpdateNotizDto } from './notizen.validators';

export const notizenService = {
  async list(gutachtenId: string) {
    return prisma.notiz.findMany({
      where: { gutachtenId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(gutachtenId: string, dto: CreateNotizDto) {
    const gutachten = await prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }
    return prisma.notiz.create({ data: { gutachtenId, ...dto } });
  },

  async update(gutachtenId: string, id: string, dto: UpdateNotizDto) {
    const existing = await prisma.notiz.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Notiz', id); }
    return prisma.notiz.update({ where: { id }, data: dto });
  },

  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.notiz.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Notiz', id); }
    await prisma.notiz.delete({ where: { id } });
    return { message: 'Notiz wurde gelöscht.' };
  },
};
