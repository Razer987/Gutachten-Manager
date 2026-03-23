/**
 * @file apps/api/src/modules/gutachten/gutachten.service.ts
 * @description Business-Logik für das Gutachten-Modul.
 *
 * Service-Schicht enthält die gesamte Geschäftslogik:
 *   - Datenbankabfragen via Prisma
 *   - Aktenzeichen-Generierung
 *   - Audit-Log-Einträge erstellen
 *   - Berechnung abgeleiteter Werte
 *
 * Der Controller ruft den Service auf und gibt nur das Ergebnis weiter.
 * Kein HTTP-spezifischer Code (Request, Response) im Service!
 */

import { prisma, type Prisma } from '@gutachten/database';

import { generiereAktenzeichen } from '@/lib/aktenzeichen';
import {
  createPaginationMeta,
  parsePagination,
} from '@/lib/pagination';
import { conflict, notFound } from '@/middleware/error.middleware';

import type {
  CreateGutachtenDto,
  GutachtenListQuery,
  UpdateGutachtenDto,
  UpdateStatusDto,
} from './gutachten.validators';

// Felder die bei der Listenansicht zurückgegeben werden (Performance)
const GUTACHTEN_LIST_SELECT = {
  id: true,
  aktenzeichen: true,
  titel: true,
  status: true,
  frist: true,
  auftragsdatum: true,
  abschlussdatum: true,
  createdAt: true,
  updatedAt: true,
  kunde: {
    select: { id: true, vorname: true, nachname: true },
  },
  gutachter: {
    select: { id: true, vorname: true, nachname: true },
  },
  _count: {
    select: {
      aufgaben: { where: { erledigt: false } },
      dateien: true,
    },
  },
} satisfies Prisma.GutachtenSelect;

// Felder für die Detailansicht (vollständig)
const GUTACHTEN_DETAIL_SELECT = {
  ...GUTACHTEN_LIST_SELECT,
  beschreibung: true,
  verwandteGutachten: {
    select: { id: true, aktenzeichen: true, titel: true, status: true },
  },
  verwandteMitGutachten: {
    select: { id: true, aktenzeichen: true, titel: true, status: true },
  },
} satisfies Prisma.GutachtenSelect;

export const gutachtenService = {
  /**
   * Alle Gutachten auflisten (paginiert, gefiltert, sortiert)
   */
  async list(query: GutachtenListQuery) {
    const pagination = parsePagination(query.page, query.pageSize);

    // WHERE-Bedingungen aufbauen
    const where: Prisma.GutachtenWhereInput = {};

    if (query.status) { where.status = query.status; }
    if (query.kundeId) { where.kundeId = query.kundeId; }
    if (query.gutachterId) { where.gutachterId = query.gutachterId; }

    // Überfällige: Frist < jetzt UND Status nicht FERTIG/ARCHIV
    if (query.ueberfaellig) {
      where.frist = { lt: new Date() };
      where.status = { notIn: ['FERTIG', 'ARCHIV'] };
    }

    // Fristen-Bereich
    if (query.fristVon ?? query.fristBis) {
      where.frist = {
        ...(query.fristVon ? { gte: new Date(query.fristVon) } : {}),
        ...(query.fristBis ? { lte: new Date(query.fristBis) } : {}),
      };
    }

    // Volltextsuche über Titel und Aktenzeichen
    if (query.suche) {
      where.OR = [
        { titel: { contains: query.suche, mode: 'insensitive' } },
        { aktenzeichen: { contains: query.suche, mode: 'insensitive' } },
        { beschreibung: { contains: query.suche, mode: 'insensitive' } },
      ];
    }

    // Daten und Gesamtanzahl parallel abfragen
    const [gutachten, total] = await Promise.all([
      prisma.gutachten.findMany({
        where,
        select: GUTACHTEN_LIST_SELECT,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.gutachten.count({ where }),
    ]);

    return {
      gutachten,
      meta: createPaginationMeta(total, pagination),
    };
  },

  /**
   * Ein einzelnes Gutachten abrufen (vollständig)
   */
  async findById(id: string) {
    const gutachten = await prisma.gutachten.findUnique({
      where: { id },
      select: GUTACHTEN_DETAIL_SELECT,
    });

    if (!gutachten) { throw notFound('Gutachten', id); }
    return gutachten;
  },

  /**
   * Neues Gutachten erstellen
   */
  async create(dto: CreateGutachtenDto) {
    // Aktenzeichen: manuell oder auto-generiert
    let aktenzeichen = dto.aktenzeichen?.trim();

    if (!aktenzeichen) {
      aktenzeichen = await generiereAktenzeichen();
    } else {
      // Prüfen ob Aktenzeichen bereits vergeben
      const existing = await prisma.gutachten.findUnique({
        where: { aktenzeichen },
        select: { id: true },
      });
      if (existing) {
        throw conflict(`Aktenzeichen "${aktenzeichen}" ist bereits vergeben.`);
      }
    }

    // Gutachten erstellen
    const gutachten = await prisma.gutachten.create({
      data: {
        aktenzeichen,
        titel: dto.titel,
        beschreibung: dto.beschreibung,
        status: dto.status,
        frist: dto.frist ? new Date(dto.frist) : null,
        auftragsdatum: dto.auftragsdatum ? new Date(dto.auftragsdatum) : null,
        kundeId: dto.kundeId ?? null,
        gutachterId: dto.gutachterId ?? null,
      },
      select: GUTACHTEN_DETAIL_SELECT,
    });

    // Audit-Log-Eintrag
    await prisma.auditLog.create({
      data: {
        gutachtenId: gutachten.id,
        aktion: 'ERSTELLT',
        bearbeiter: 'System',
        beschreibung: `Gutachten ${aktenzeichen} wurde angelegt`,
      },
    });

    return gutachten;
  },

  /**
   * Gutachten bearbeiten
   */
  async update(id: string, dto: UpdateGutachtenDto) {
    // Existenz prüfen
    const existing = await prisma.gutachten.findUnique({
      where: { id },
      select: { id: true, aktenzeichen: true, status: true, titel: true },
    });
    if (!existing) { throw notFound('Gutachten', id); }

    // Wenn Aktenzeichen geändert wird: Duplikat-Prüfung
    if (dto.aktenzeichen && dto.aktenzeichen !== existing.aktenzeichen) {
      const duplicate = await prisma.gutachten.findUnique({
        where: { aktenzeichen: dto.aktenzeichen },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== id) {
        throw conflict(`Aktenzeichen "${dto.aktenzeichen}" ist bereits vergeben.`);
      }
    }

    const gutachten = await prisma.gutachten.update({
      where: { id },
      data: {
        ...(dto.titel !== undefined && { titel: dto.titel }),
        ...(dto.beschreibung !== undefined && { beschreibung: dto.beschreibung }),
        ...(dto.aktenzeichen !== undefined && { aktenzeichen: dto.aktenzeichen }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.frist !== undefined && { frist: dto.frist ? new Date(dto.frist) : null }),
        ...(dto.auftragsdatum !== undefined && {
          auftragsdatum: dto.auftragsdatum ? new Date(dto.auftragsdatum) : null,
        }),
        ...(dto.kundeId !== undefined && { kundeId: dto.kundeId }),
        ...(dto.gutachterId !== undefined && { gutachterId: dto.gutachterId }),
      },
      select: GUTACHTEN_DETAIL_SELECT,
    });

    // Audit-Log
    await prisma.auditLog.create({
      data: {
        gutachtenId: id,
        aktion: 'AKTUALISIERT',
        bearbeiter: 'System',
        beschreibung: `Gutachten ${existing.aktenzeichen} wurde bearbeitet`,
        alterWert: { titel: existing.titel, status: existing.status },
        neuerWert: { titel: dto.titel ?? existing.titel, status: dto.status ?? existing.status },
      },
    });

    return gutachten;
  },

  /**
   * Status eines Gutachtens ändern
   */
  async updateStatus(id: string, dto: UpdateStatusDto) {
    const existing = await prisma.gutachten.findUnique({
      where: { id },
      select: { id: true, aktenzeichen: true, status: true },
    });
    if (!existing) { throw notFound('Gutachten', id); }

    const updates: Prisma.GutachtenUpdateInput = { status: dto.status };

    // Abschlussdatum setzen wenn Status FERTIG oder ARCHIV
    if (dto.status === 'FERTIG' || dto.status === 'ARCHIV') {
      updates.abschlussdatum = new Date();
    }

    const gutachten = await prisma.gutachten.update({
      where: { id },
      data: updates,
      select: GUTACHTEN_LIST_SELECT,
    });

    // Audit-Log für Status-Änderung
    await prisma.auditLog.create({
      data: {
        gutachtenId: id,
        aktion: 'STATUS_GEAENDERT',
        bearbeiter: 'System',
        beschreibung: dto.kommentar
          ? `Status geändert: ${existing.status} → ${dto.status}. Kommentar: ${dto.kommentar}`
          : `Status geändert: ${existing.status} → ${dto.status}`,
        alterWert: { status: existing.status },
        neuerWert: { status: dto.status },
      },
    });

    return gutachten;
  },

  /**
   * Gutachten löschen (soft delete: in ARCHIV verschieben)
   */
  async delete(id: string) {
    const existing = await prisma.gutachten.findUnique({
      where: { id },
      select: { id: true, aktenzeichen: true },
    });
    if (!existing) { throw notFound('Gutachten', id); }

    // Statt hartem Löschen: In ARCHIV verschieben
    await prisma.gutachten.update({
      where: { id },
      data: { status: 'ARCHIV' },
    });

    await prisma.auditLog.create({
      data: {
        gutachtenId: id,
        aktion: 'STATUS_GEAENDERT',
        bearbeiter: 'System',
        beschreibung: `Gutachten ${existing.aktenzeichen} wurde archiviert`,
      },
    });

    return { message: `Gutachten ${existing.aktenzeichen} wurde archiviert.` };
  },

  /**
   * Zwei Gutachten miteinander verknüpfen
   */
  async verknuepfen(id: string, zielId: string) {
    // Beide müssen existieren
    const [quelle, ziel] = await Promise.all([
      prisma.gutachten.findUnique({ where: { id }, select: { id: true } }),
      prisma.gutachten.findUnique({ where: { id: zielId }, select: { id: true } }),
    ]);

    if (!quelle) { throw notFound('Gutachten', id); }
    if (!ziel) { throw notFound('Gutachten', zielId); }
    if (id === zielId) { throw conflict('Ein Gutachten kann nicht mit sich selbst verknüpft werden.'); }

    await prisma.gutachten.update({
      where: { id },
      data: {
        verwandteGutachten: { connect: { id: zielId } },
      },
    });

    return { message: 'Gutachten erfolgreich verknüpft.' };
  },
};
