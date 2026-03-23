/**
 * @file apps/api/src/modules/kunden/kunden.service.ts
 */
import { prisma, type Prisma } from '@gutachten/database';

import { createPaginationMeta, parsePagination } from '@/lib/pagination';
import { notFound } from '@/middleware/error.middleware';

import type { CreateKundeDto, KontaktHistorieDto, KundenListQuery, UpdateKundeDto } from './kunden.validators';

const KUNDE_SELECT = {
  id: true,
  vorname: true,
  nachname: true,
  firma: true,
  email: true,
  telefon: true,
  mobil: true,
  strasse: true,
  plz: true,
  stadt: true,
  land: true,
  notizen: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { gutachten: true, kontakthistorie: true } },
} satisfies Prisma.KundeSelect;

export const kundenService = {
  async list(query: KundenListQuery) {
    const pagination = parsePagination(query.page, query.pageSize);
    const where: Prisma.KundeWhereInput = {};

    if (query.suche) {
      where.OR = [
        { nachname: { contains: query.suche, mode: 'insensitive' } },
        { vorname: { contains: query.suche, mode: 'insensitive' } },
        { firma: { contains: query.suche, mode: 'insensitive' } },
        { email: { contains: query.suche, mode: 'insensitive' } },
      ];
    }

    const [kunden, total] = await Promise.all([
      prisma.kunde.findMany({
        where,
        select: KUNDE_SELECT,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.kunde.count({ where }),
    ]);

    return { kunden, meta: createPaginationMeta(total, pagination) };
  },

  async findById(id: string) {
    const kunde = await prisma.kunde.findUnique({
      where: { id },
      include: {
        kontakthistorie: { orderBy: { kontaktDat: 'desc' }, take: 50 },
        gutachten: {
          select: { id: true, aktenzeichen: true, titel: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!kunde) { throw notFound('Kunde', id); }
    return kunde;
  },

  async create(dto: CreateKundeDto) {
    return prisma.kunde.create({ data: dto, select: KUNDE_SELECT });
  },

  async update(id: string, dto: UpdateKundeDto) {
    const existing = await prisma.kunde.findUnique({ where: { id }, select: { id: true } });
    if (!existing) { throw notFound('Kunde', id); }
    return prisma.kunde.update({ where: { id }, data: dto, select: KUNDE_SELECT });
  },

  async delete(id: string) {
    const existing = await prisma.kunde.findUnique({ where: { id }, select: { id: true, nachname: true } });
    if (!existing) { throw notFound('Kunde', id); }
    await prisma.kunde.delete({ where: { id } });
    return { message: `Kunde "${existing.nachname}" wurde gelöscht.` };
  },

  async addKontakt(kundeId: string, dto: KontaktHistorieDto) {
    const existing = await prisma.kunde.findUnique({ where: { id: kundeId }, select: { id: true } });
    if (!existing) { throw notFound('Kunde', kundeId); }
    return prisma.kontaktHistorie.create({
      data: {
        kundeId,
        art: dto.art,
        inhalt: dto.inhalt,
        bearbeiter: dto.bearbeiter,
        kontaktDat: dto.kontaktDat ? new Date(dto.kontaktDat) : new Date(),
      },
    });
  },
};
