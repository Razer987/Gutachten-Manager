/**
 * @file apps/api/src/modules/kunden/kunden.service.ts
 */
import { prisma, type Prisma } from '@gutachten/database';

import { findOrThrow } from '../../lib/find-or-throw';
import { createPaginationMeta, parsePagination } from '../../lib/pagination';
import { conflict } from '../../middleware/error.middleware';

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
  /** Gibt eine paginierte, durchsuchbare Liste aller Kunden zurück. */
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

  /** Gibt einen Kunden inkl. Kontakthistorie und verknüpften Gutachten zurück. Wirft 404 wenn nicht gefunden. */
  async findById(id: string) {
    return findOrThrow(
      prisma.kunde.findUnique({
        where: { id },
        include: {
          kontakthistorie: { orderBy: { kontaktDat: 'desc' }, take: 50 },
          gutachten: {
            select: { id: true, aktenzeichen: true, titel: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      }),
      'Kunde',
      id,
    );
  },

  /** Erstellt einen neuen Kunden und gibt ihn zurück. */
  async create(dto: CreateKundeDto) {
    return prisma.kunde.create({ data: dto, select: KUNDE_SELECT });
  },

  /** Aktualisiert einen bestehenden Kunden. Wirft 404 wenn nicht gefunden. */
  async update(id: string, dto: UpdateKundeDto) {
    await findOrThrow(prisma.kunde.findUnique({ where: { id }, select: { id: true } }), 'Kunde', id);
    return prisma.kunde.update({ where: { id }, data: dto, select: KUNDE_SELECT });
  },

  /**
   * Löscht einen Kunden.
   *
   * Wirft 409 wenn der Kunde noch aktive (nicht archivierte) Gutachten hat.
   * Archivierte/fertige Gutachten sind kein Hindernis — deren kundeId wird
   * auf NULL gesetzt (onDelete: SetNull im Schema).
   */
  async delete(id: string) {
    const existing = await findOrThrow(
      prisma.kunde.findUnique({
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
      }),
      'Kunde',
      id,
    );

    if (existing._count.gutachten > 0) {
      throw conflict(
        `Kunde "${existing.nachname}" hat noch ${existing._count.gutachten} aktive Gutachten. ` +
        `Bitte alle Gutachten abschließen oder archivieren, bevor der Kunde gelöscht werden kann.`,
      );
    }

    await prisma.kunde.delete({ where: { id } });
    return { message: `Kunde "${existing.nachname}" wurde gelöscht.` };
  },

  /** Fügt einen neuen Kontakthistorie-Eintrag zu einem Kunden hinzu. */
  async addKontakt(kundeId: string, dto: KontaktHistorieDto) {
    await findOrThrow(prisma.kunde.findUnique({ where: { id: kundeId }, select: { id: true } }), 'Kunde', kundeId);
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
