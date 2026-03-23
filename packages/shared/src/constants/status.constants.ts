/**
 * @file packages/shared/src/constants/status.constants.ts
 * @description Konstanten für Gutachten-Status-Werte.
 *
 * Diese Konstanten sind die einzige Quelle der Wahrheit für Status-Labels,
 * Farben und Reihenfolge. Sowohl Frontend als auch Backend nutzen diese.
 *
 * Reihenfolge der Status-Stufen:
 *   1. AUFGENOMMEN → 2. BEAUFTRAGT → 3. BESICHTIGUNG →
 *   4. ENTWURF → 5. FREIGABE → 6. FERTIG → 7. ARCHIV
 */

/** Alle möglichen Gutachten-Status-Werte (muss mit Prisma-Enum übereinstimmen) */
export type GutachtenStatusTyp =
  | 'AUFGENOMMEN'
  | 'BEAUFTRAGT'
  | 'BESICHTIGUNG'
  | 'ENTWURF'
  | 'FREIGABE'
  | 'FERTIG'
  | 'ARCHIV';

/** Metadaten für jeden Status */
export interface StatusMetadata {
  /** Angezeigter Text in der UI */
  label: string;
  /** Kurzbeschreibung was dieser Status bedeutet */
  beschreibung: string;
  /** Material UI Farbe für Chips und Kanban-Spalten */
  farbe: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  /** Hex-Farbe für Kalender und individuelle Darstellung */
  hex: string;
  /** Reihenfolge im Workflow (1 = Anfang, 7 = Ende) */
  reihenfolge: number;
}

/** Mapping von Status-Wert zu Metadaten */
export const GUTACHTEN_STATUS: Record<GutachtenStatusTyp, StatusMetadata> = {
  AUFGENOMMEN: {
    label: 'Aufgenommen',
    beschreibung: 'Erstkontakt, Daten werden erfasst',
    farbe: 'default',
    hex: '#9e9e9e',
    reihenfolge: 1,
  },
  BEAUFTRAGT: {
    label: 'Beauftragt',
    beschreibung: 'Auftrag erteilt, Gutachter zugewiesen',
    farbe: 'info',
    hex: '#0288d1',
    reihenfolge: 2,
  },
  BESICHTIGUNG: {
    label: 'Besichtigung',
    beschreibung: 'Vor-Ort-Besichtigung geplant oder durchgeführt',
    farbe: 'warning',
    hex: '#f57c00',
    reihenfolge: 3,
  },
  ENTWURF: {
    label: 'Entwurf',
    beschreibung: 'Gutachten wird erstellt',
    farbe: 'secondary',
    hex: '#7b1fa2',
    reihenfolge: 4,
  },
  FREIGABE: {
    label: 'Freigabe',
    beschreibung: 'Entwurf liegt vor, wartet auf Freigabe',
    farbe: 'primary',
    hex: '#1976d2',
    reihenfolge: 5,
  },
  FERTIG: {
    label: 'Fertig',
    beschreibung: 'Gutachten abgeschlossen und übergeben',
    farbe: 'success',
    hex: '#388e3c',
    reihenfolge: 6,
  },
  ARCHIV: {
    label: 'Archiv',
    beschreibung: 'Archiviert',
    farbe: 'default',
    hex: '#616161',
    reihenfolge: 7,
  },
};

/** Alle Status-Werte in der richtigen Reihenfolge */
export const STATUS_REIHENFOLGE: GutachtenStatusTyp[] = [
  'AUFGENOMMEN',
  'BEAUFTRAGT',
  'BESICHTIGUNG',
  'ENTWURF',
  'FREIGABE',
  'FERTIG',
  'ARCHIV',
];

/** Aktive (nicht archivierte) Status */
export const AKTIVE_STATUS: GutachtenStatusTyp[] = STATUS_REIHENFOLGE.filter(
  (s) => s !== 'ARCHIV',
);

/** Abgeschlossene Status */
export const ABGESCHLOSSENE_STATUS: GutachtenStatusTyp[] = ['FERTIG', 'ARCHIV'];
