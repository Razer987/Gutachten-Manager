/**
 * @file packages/shared/src/utils/currency.utils.ts
 * @description Hilfsfunktionen für Geldbeträge.
 *
 * WICHTIG: Die Datenbank speichert Beträge als CENT-Integer (nicht als Float).
 * Das verhindert Fließkomma-Rundungsfehler (z.B. 0.1 + 0.2 ≠ 0.3 in Floating Point).
 *
 * Konvention:
 *   - DB/API: Cents als Integer (z.B. 150000 = 1500,00 €)
 *   - Anzeige: Formatiert mit Intl.NumberFormat (z.B. "1.500,00 €")
 *   - Eingabe: Dezimalzahl vom Benutzer → Cents für DB
 */

/** Formatiert Cent-Betrag als deutschen Euro-String: "1.500,00 €" */
export function formatEuro(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '–';

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

/** Konvertiert Euro-Dezimalzahl zu Cents: 1500.50 → 150050 */
export function euroZuCents(euro: number): number {
  return Math.round(euro * 100);
}

/** Konvertiert Cents zu Euro-Dezimalzahl: 150050 → 1500.50 */
export function centsZuEuro(cents: number): number {
  return cents / 100;
}

/** Summiert mehrere Cent-Beträge */
export function summiereSchaeden(posten: Array<{ betragCents: number }>): number {
  return posten.reduce((summe, p) => summe + p.betragCents, 0);
}
