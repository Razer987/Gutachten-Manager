/**
 * @file apps/api/src/modules/gutachter/gutachter.service.ts
 */
import { prisma, type Prisma } from '@gutachten/database';

import { createPaginationMeta, parsePagination } from '@/lib/pagination';
import { conflict, notFound } from '@/middleware/error.middleware';

import type { CreateGutachterDto, GutachterListQuery, UpdateGutachterDto } from './gutachter.validators';

export const gutachterService = {
  /** Gibt eine paginierte, durchsuchbare Liste aller Gutachter zurück. */
  async list(query: GutachterListQuery) {
    const pagination = parsePagination(query.page, query.pageSize);
    const where: Prisma.GutachterWhereInput = {};

    if (query.suche) {
      where.OR = [
        { nachname: { contains: query.suche, mode: 'insensitive' } },
        { vorname: { contains: query.suche, mode: 'insensitive' } },
        { email: { contains: query.suche, mode: 'insensitive' } },
      ];
    }

    const [gutachter, total] = await Promise.all([
      prisma.gutachter.findMany({
        where,
        orderBy: { nachname: 'asc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.gutachter.count({ where }),
    ]);

    return { gutachter, meta: createPaginationMeta(total, pagination) };
  },

  /** Gibt einen Gutachter inkl. seiner Gutachten zurück. Wirft 404 wenn nicht gefunden. */
  async findById(id: string) {
    const gutachter = await prisma.gutachter.findUnique({
      where: { id },
      include: {
        gutachten: {
          select: { id: true, aktenzeichen: true, titel: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!gutachter) { throw notFound('Gutachter', id); }
    return gutachter;
  },

  /** Erstellt einen neuen Gutachter und gibt ihn zurück. */
  async create(dto: CreateGutachterDto) {
    return prisma.gutachter.create({ data: dto });
  },

  /** Aktualisiert einen bestehenden Gutachter. Wirft 404 wenn nicht gefunden. */
  async update(id: string, dto: UpdateGutachterDto) {
    const existing = await prisma.gutachter.findUnique({ where: { id }, select: { id: true } });
    if (!existing) { throw notFound('Gutachter', id); }
    return prisma.gutachter.update({ where: { id }, data: dto });
  },

  /**
   * Löscht einen Gutachter.
   *
   * Wirft 409 wenn der Gutachter noch aktive (nicht archivierte) Gutachten hat.
   * Archivierte/fertige Gutachten sind kein Hindernis — deren gutachterId wird
   * auf NULL gesetzt (onDelete: SetNull im Schema).
   */
  async delete(id: string) {
    const existing = await prisma.gutachter.findUnique({
      where: { id },
      select: {
        id: true,
        nachname: true,
        _count: {
          select: {
            gutachten: {
              where: { status: { notIn: ['FERTIG', 'ARCHIV'] } },
            },
          },
        },
      },
    });
    if (!existing) { throw notFound('Gutachter', id); }

    if (existing._count.gutachten > 0) {
      throw conflict(
        `Gutachter "${existing.nachname}" hat noch ${existing._count.gutachten} aktive Gutachten. ` +
        `Bitte alle Gutachten abschließen oder archivieren, bevor der Gutachter gelöscht werden kann.`,
      );
    }

    await prisma.gutachter.delete({ where: { id } });
    return { message: `Gutachter "${existing.nachname}" wurde gelöscht.` };
  },
};
