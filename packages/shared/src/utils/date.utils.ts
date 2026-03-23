/**
 * @file packages/shared/src/utils/date.utils.ts
 * @description Datums-Hilfsfunktionen für deutschen Raum.
 *
 * Alle Funktionen sind "pure functions" — keine Seiteneffekte, gleiche
 * Eingabe ergibt immer gleiche Ausgabe. Einfach testbar.
 *
 * Hinweis: Keine externe Bibliothek (wie dayjs/date-fns) um das Paket
 * schlanker zu halten. Nur native Intl-API.
 */

/** Deutsches Datumsformat: 23.03.2026 */
export function formatDatum(datum: Date | string | null | undefined): string {
  if (!datum) return '–';
  const d = typeof datum === 'string' ? new Date(datum) : datum;
  if (isNaN(d.getTime())) return '–';

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** Deutsches Datum + Uhrzeit: 23.03.2026, 14:30 Uhr */
export function formatDatumUhrzeit(datum: Date | string | null | undefined): string {
  if (!datum) return '–';
  const d = typeof datum === 'string' ? new Date(datum) : datum;
  if (isNaN(d.getTime())) return '–';

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d) + ' Uhr';
}

/** Relatives Datum: "vor 3 Tagen", "in 5 Tagen", "heute" */
export function formatRelativ(datum: Date | string | null | undefined): string {
  if (!datum) return '–';
  const d = typeof datum === 'string' ? new Date(datum) : datum;
  if (isNaN(d.getTime())) return '–';

  const jetzt = new Date();
  const diffMs = d.getTime() - jetzt.getTime();
  const diffTage = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffTage === 0) return 'Heute';
  if (diffTage === 1) return 'Morgen';
  if (diffTage === -1) return 'Gestern';
  if (diffTage > 0) return `in ${diffTage} Tagen`;
  return `vor ${Math.abs(diffTage)} Tagen`;
}

/**
 * Gibt zurück ob eine Frist abgelaufen ist.
 * @param frist Das Fälligkeitsdatum
 * @param pufferTage Anzahl Tage vor Ablauf als "kritisch" (Standard: 3)
 */
export function fristStatus(
  frist: Date | string | null | undefined,
  pufferTage = 3,
): 'normal' | 'bald' | 'ueberfaellig' {
  if (!frist) return 'normal';
  const d = typeof frist === 'string' ? new Date(frist) : frist;
  if (isNaN(d.getTime())) return 'normal';

  const jetzt = new Date();
  const diffMs = d.getTime() - jetzt.getTime();
  const diffTage = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffTage < 0) return 'ueberfaellig';
  if (diffTage <= pufferTage) return 'bald';
  return 'normal';
}

/** ISO-Datum-String für API-Requests: "2026-03-23" */
export function toIsoDate(datum: Date): string {
  return datum.toISOString().split('T')[0] ?? '';
}
