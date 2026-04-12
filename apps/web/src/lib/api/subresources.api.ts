/**
 * @file apps/web/src/lib/api/subresources.api.ts
 * @description API-Funktionen für Gutachten-Unterressourcen.
 * Feldnamen entsprechen dem Prisma-Schema.
 */

import { apiClient } from './client';

// ─── Fahrzeuge ───────────────────────────────────────────────────────────────

export interface Fahrzeug {
  id: string;
  gutachtenId: string;
  kennzeichen: string;
  fahrgestell: string | null;   // FIN/VIN — korrekt: fahrgestell (nicht fahrgestellnummer)
  marke: string;
  modell: string;
  baujahr: number | null;
  farbe: string | null;
  kraftstoff: string | null;
  versicherung: string | null;
  versicherungsNr: string | null;
  createdAt: string;
}

export interface CreateFahrzeugInput {
  kennzeichen: string;           // Pflichtfeld
  marke: string;                 // Pflichtfeld
  modell: string;                // Pflichtfeld
  fahrgestell?: string;
  baujahr?: number;
  farbe?: string;
  kraftstoff?: string;
  versicherung?: string;
  versicherungsNr?: string;
}

// ─── Personen ────────────────────────────────────────────────────────────────

export interface Person {
  id: string;
  gutachtenId: string;
  typ: PersonTyp;
  vorname: string;
  nachname: string;
  geburtsdatum: string | null;
  strasse: string | null;
  plz: string | null;
  stadt: string | null;
  telefon: string | null;
  email: string | null;
  fuehrerschein: string | null;
  fuehrerscheinklasse: string | null;
  zeugenaussage: string | null;
  createdAt: string;
}

// PersonTyp-Enum gemäß Prisma-Schema
export type PersonTyp = 'FAHRER' | 'BEIFAHRER' | 'FUSSGAENGER' | 'ZEUGE' | 'VERLETZTE';

export interface CreatePersonInput {
  typ: PersonTyp;
  vorname: string;               // Pflichtfeld
  nachname: string;              // Pflichtfeld
  geburtsdatum?: string;
  strasse?: string;
  plz?: string;
  stadt?: string;
  telefon?: string;
  email?: string;
  fuehrerschein?: string;
  fuehrerscheinklasse?: string;
  zeugenaussage?: string;
}

// ─── Schadensposten ──────────────────────────────────────────────────────────

export interface Schadensposten {
  id: string;
  gutachtenId: string;
  position: number;
  bezeichnung: string;           // Hauptbezeichnung (korrekt: nicht 'beschreibung')
  beschreibung: string | null;   // Optionale Detailbeschreibung
  betragCents: number;           // In Cents (nicht betrag!)
  kategorie: string;
  createdAt: string;
}

export interface SchadenspostenSumme {
  posten: Schadensposten[];
  summen: {
    gesamtCents: number;
    gesamtEuro: number;
    anzahl: number;
  };
}

export interface CreateSchadenspostenInput {
  position: number;
  bezeichnung: string;           // Pflichtfeld
  beschreibung?: string;
  betragCents: number;           // In Cents
  kategorie: string;             // Pflichtfeld (z.B. 'Reparatur', 'Wertminderung')
}

// ─── Notizen ─────────────────────────────────────────────────────────────────

export interface Notiz {
  id: string;
  gutachtenId: string;
  inhalt: string;
  autor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotizInput {
  inhalt: string;
  autor?: string;
}

// ─── Aufgaben ─────────────────────────────────────────────────────────────────

export interface Aufgabe {
  id: string;
  gutachtenId: string;
  titel: string;
  erledigt: boolean;
  faelligAm: string | null;
  prioritaet: 'NIEDRIG' | 'NORMAL' | 'HOCH' | 'KRITISCH';
  zugewiesen: string | null;
  erledigtAm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAufgabeInput {
  titel: string;
  faelligAm?: string;
  zugewiesen?: string;
  prioritaet?: 'NIEDRIG' | 'NORMAL' | 'HOCH' | 'KRITISCH';
}

// ─── Dateien ─────────────────────────────────────────────────────────────────

export interface Datei {
  id: string;
  gutachtenId: string;
  originalname: string;
  filename: string;              // gespeicherter Name (korrekt: filename, nicht dateiname)
  pfad: string;
  mimetype: string;
  groesse: number;
  beschreibung: string | null;
  createdAt: string;
}

// ─── Audit-Log ───────────────────────────────────────────────────────────────

export interface AuditEintrag {
  id: string;
  gutachtenId: string;
  aktion: string;
  bearbeiter: string | null;
  beschreibung: string;
  alterWert: unknown | null;
  neuerWert: unknown | null;
  createdAt: string;
}

// ─── Unfalldaten ─────────────────────────────────────────────────────────────

export interface Unfalldaten {
  id: string;
  gutachtenId: string;
  unfallZeit: string | null;
  // Adresse
  strasse: string | null;
  hausnummer: string | null;
  plz: string | null;
  stadt: string | null;
  land: string | null;
  // GPS
  breitengrad: number | null;
  laengengrad: number | null;
  strassentyp: string | null;
  // Hergang
  unfallHergang: string | null;
  // Wetter & Bedingungen
  wetterlage: string | null;        // Enum: KLAR | BEWOELKT | REGEN | ...
  temperatur: number | null;
  sichtverhaeltnis: string | null;  // Enum: GUT | MITTEL | SCHLECHT | NACHT | DAEMMERUNG
  strassenzustand: string | null;   // Enum: TROCKEN | NASS | SCHNEEBEDECKT | VEREIST | VERSCHMUTZT
  lichtverhaeltnis: string | null;
  // Polizei
  polizeiAktenzeichen: string | null;
  polizeiDienststelle: string | null;
  polizeiEinsatznummer: string | null;
  polizeiProtokollDatum: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUnfalldatenInput {
  unfallZeit?: string;
  strasse?: string;
  hausnummer?: string;
  plz?: string;
  stadt?: string;
  land?: string;
  strassentyp?: string;
  unfallHergang?: string;
  wetterlage?: string;
  temperatur?: number;
  sichtverhaeltnis?: string;
  strassenzustand?: string;
  lichtverhaeltnis?: string;
  polizeiAktenzeichen?: string;
  polizeiDienststelle?: string;
}

// ─── API-Objekt ───────────────────────────────────────────────────────────────

export const subresourcesApi = {
  fahrzeuge: {
    list: (gutachtenId: string): Promise<Fahrzeug[]> =>
      apiClient.get<Fahrzeug[]>(`/gutachten/${gutachtenId}/fahrzeuge`),
    create: (gutachtenId: string, data: CreateFahrzeugInput): Promise<Fahrzeug> =>
      apiClient.post<Fahrzeug>(`/gutachten/${gutachtenId}/fahrzeuge`, data),
    update: (gutachtenId: string, id: string, data: Partial<CreateFahrzeugInput>): Promise<Fahrzeug> =>
      apiClient.patch<Fahrzeug>(`/gutachten/${gutachtenId}/fahrzeuge/${id}`, data),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/fahrzeuge/${id}`),
  },

  personen: {
    list: (gutachtenId: string): Promise<Person[]> =>
      apiClient.get<Person[]>(`/gutachten/${gutachtenId}/personen`),
    create: (gutachtenId: string, data: CreatePersonInput): Promise<Person> =>
      apiClient.post<Person>(`/gutachten/${gutachtenId}/personen`, data),
    update: (gutachtenId: string, id: string, data: Partial<CreatePersonInput>): Promise<Person> =>
      apiClient.patch<Person>(`/gutachten/${gutachtenId}/personen/${id}`, data),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/personen/${id}`),
  },

  schaden: {
    list: (gutachtenId: string): Promise<SchadenspostenSumme> =>
      apiClient.get<SchadenspostenSumme>(`/gutachten/${gutachtenId}/schaden`),
    create: (gutachtenId: string, data: CreateSchadenspostenInput): Promise<Schadensposten> =>
      apiClient.post<Schadensposten>(`/gutachten/${gutachtenId}/schaden`, data),
    update: (gutachtenId: string, id: string, data: Partial<CreateSchadenspostenInput>): Promise<Schadensposten> =>
      apiClient.patch<Schadensposten>(`/gutachten/${gutachtenId}/schaden/${id}`, data),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/schaden/${id}`),
  },

  notizen: {
    list: (gutachtenId: string): Promise<Notiz[]> =>
      apiClient.get<Notiz[]>(`/gutachten/${gutachtenId}/notizen`),
    create: (gutachtenId: string, data: CreateNotizInput): Promise<Notiz> =>
      apiClient.post<Notiz>(`/gutachten/${gutachtenId}/notizen`, data),
    update: (gutachtenId: string, id: string, data: CreateNotizInput): Promise<Notiz> =>
      apiClient.patch<Notiz>(`/gutachten/${gutachtenId}/notizen/${id}`, data),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/notizen/${id}`),
  },

  aufgaben: {
    list: (gutachtenId: string): Promise<Aufgabe[]> =>
      apiClient.get<Aufgabe[]>(`/gutachten/${gutachtenId}/aufgaben`),
    create: (gutachtenId: string, data: CreateAufgabeInput): Promise<Aufgabe> =>
      apiClient.post<Aufgabe>(`/gutachten/${gutachtenId}/aufgaben`, data),
    toggleErledigt: (gutachtenId: string, id: string, erledigt: boolean): Promise<Aufgabe> =>
      apiClient.patch<Aufgabe>(`/gutachten/${gutachtenId}/aufgaben/${id}`, { erledigt }),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/aufgaben/${id}`),
  },

  dateien: {
    list: (gutachtenId: string): Promise<Datei[]> =>
      apiClient.get<Datei[]>(`/gutachten/${gutachtenId}/dateien`),
    upload: (gutachtenId: string, formData: FormData): Promise<Datei> =>
      apiClient.upload<Datei>(`/gutachten/${gutachtenId}/dateien`, formData),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/dateien/${id}`),
    downloadUrl: (gutachtenId: string, id: string): string =>
      `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'}/gutachten/${gutachtenId}/dateien/${id}/download`,
  },

  audit: {
    list: (gutachtenId: string): Promise<AuditEintrag[]> =>
      apiClient.get<AuditEintrag[]>(`/gutachten/${gutachtenId}/audit`),
  },

  unfall: {
    get: (gutachtenId: string): Promise<Unfalldaten | null> =>
      apiClient.get<Unfalldaten | null>(`/gutachten/${gutachtenId}/unfall`),
    upsert: (gutachtenId: string, data: UpdateUnfalldatenInput): Promise<Unfalldaten> =>
      apiClient.put<Unfalldaten>(`/gutachten/${gutachtenId}/unfall`, data),
  },
};
