/**
 * @file packages/shared/src/types/api.types.ts
 * @description TypeScript-Typen für API-Requests und -Responses.
 *
 * Alle API-Antworten folgen einem einheitlichen Format:
 *   - Erfolg: { success: true, data: T, meta?: PaginationMeta }
 *   - Fehler: { success: false, error: ApiError }
 *
 * Diese Typen werden von:
 *   - apps/api: für das Erstellen der Responses
 *   - apps/web: für das Typisieren der fetch()-Aufrufe
 */

// =============================================================================
// STANDARD API RESPONSE FORMAT
// =============================================================================

/** Standard-Erfolgs-Response */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/** Standard-Fehler-Response */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

/** Vereinigter Response-Typ */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Fehler-Objekt in einer API-Response */
export interface ApiError {
  /** Maschinenlesbarer Fehlercode (z.B. "VALIDATION_ERROR", "NOT_FOUND") */
  code: string;
  /** Menschenlesbarer Fehlertext (Deutsch) */
  message: string;
  /** Detaillierte Validierungsfehler (optional) */
  details?: ValidationError[];
}

/** Einzelner Validierungsfehler (z.B. von Zod) */
export interface ValidationError {
  /** Feldname (z.B. "aktenzeichen", "frist") */
  field: string;
  /** Fehlermeldung für dieses Feld */
  message: string;
}

// =============================================================================
// PAGINATION
// =============================================================================

/** Pagination-Metadaten in Listen-Responses */
export interface PaginationMeta {
  /** Aktuelle Seite (1-basiert) */
  page: number;
  /** Einträge pro Seite */
  pageSize: number;
  /** Gesamtanzahl der Einträge */
  total: number;
  /** Gesamtanzahl der Seiten */
  totalPages: number;
}

/** Query-Parameter für paginierte Anfragen */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

// =============================================================================
// FILTER & SORT
// =============================================================================

/** Sortierrichtung */
export type SortRichtung = 'asc' | 'desc';

/** Basis-Query-Parameter für alle Listen-Endpunkte */
export interface BaseListQuery extends PaginationQuery {
  /** Sortierfeld */
  sortBy?: string;
  /** Sortierrichtung */
  sortDir?: SortRichtung;
  /** Suchbegriff (Volltextsuche) */
  suche?: string;
}

// =============================================================================
// FEHLER-CODES
// =============================================================================

/** Standardisierte API-Fehlercodes */
export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
