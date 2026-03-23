/**
 * @file apps/api/src/lib/aktenzeichen.ts
 * @description Aktenzeichen-Generator für Gutachten.
 *
 * Format: GA-JJJJ-NNN (z.B. GA-2026-001, GA-2026-042)
 *   GA   = Gutachten (Präfix)
 *   JJJJ = 4-stelliges Jahr
 *   NNN  = Fortlaufende Nummer (mindestens 3-stellig)
 *
 * Die Nummer wird pro Jahr zurückgesetzt (GA-2026-001, GA-2027-001).
 */

import { prisma } from '@gutachten/database';

/**
 * Generiert das nächste verfügbare Aktenzeichen für das aktuelle Jahr.
 * Ist thread-safe durch die Datenbank-Unique-Constraint.
 *
 * @returns Aktenzeichen im Format "GA-JJJJ-NNN"
 */
export async function generiereAktenzeichen(): Promise<string> {
  const jahr = new Date().getFullYear();
  const praefix = `GA-${jahr}-`;

  // Letztes Aktenzeichen dieses Jahres finden
  const letztesGutachten = await prisma.gutachten.findFirst({
    where: {
      aktenzeichen: {
        startsWith: praefix,
      },
    },
    orderBy: {
      aktenzeichen: 'desc',
    },
    select: {
      aktenzeichen: true,
    },
  });

  let naechsteNummer = 1;

  if (letztesGutachten) {
    // Nummer aus dem letzten Aktenzeichen extrahieren
    const teile = letztesGutachten.aktenzeichen.split('-');
    const letzteNummer = parseInt(teile[2] ?? '0', 10);
    if (!isNaN(letzteNummer)) {
      naechsteNummer = letzteNummer + 1;
    }
  }

  // Nummer auf mindestens 3 Stellen auffüllen
  return `${praefix}${String(naechsteNummer).padStart(3, '0')}`;
}

/**
 * Validiert ob ein manuell eingegebenes Aktenzeichen dem Format entspricht.
 * Erlaubt auch freie Formate (nur Länge wird geprüft).
 *
 * @param aktenzeichen Das zu prüfende Aktenzeichen
 * @returns true wenn gültig
 */
export function validiereAktenzeichen(aktenzeichen: string): boolean {
  if (aktenzeichen.trim().length < 3) { return false; }
  if (aktenzeichen.trim().length > 50) { return false; }
  return true;
}
