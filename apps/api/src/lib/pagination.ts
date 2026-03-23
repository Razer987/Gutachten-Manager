/**
 * @file apps/api/src/lib/pagination.ts
 * @description Hilfsfunktionen für paginierte Datenbankabfragen.
 *
 * Standardisiert Pagination-Logik für alle Listen-Endpunkte.
 * Vermeidet Code-Duplizierung in Controllers.
 */

import type { PaginationMeta } from '@gutachten/shared';

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/**
 * Verarbeitet Pagination-Query-Parameter mit Standardwerten.
 * @param page Seite (1-basiert, Standard: 1)
 * @param pageSize Einträge pro Seite (Standard: 20, Max: 100)
 */
export function parsePagination(
  page?: string | number,
  pageSize?: string | number,
): PaginationParams {
  const p = Math.max(1, parseInt(String(page ?? 1), 10) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(String(pageSize ?? 20), 10) || 20));

  return {
    page: p,
    pageSize: ps,
    skip: (p - 1) * ps,
    take: ps,
  };
}

/**
 * Erstellt das PaginationMeta-Objekt für API-Responses.
 * @param total Gesamtanzahl der Einträge
 * @param params Pagination-Parameter
 */
export function createPaginationMeta(total: number, params: PaginationParams): PaginationMeta {
  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.ceil(total / params.pageSize),
  };
}
