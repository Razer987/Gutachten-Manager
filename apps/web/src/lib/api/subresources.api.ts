/**
 * @file apps/web/src/lib/api/subresources.api.ts
 * @description API-Funktionen für Gutachten-Unterressourcen:
 *   Fahrzeuge, Personen, Schadensposten, Notizen, Aufgaben, Dateien, Audit-Log, Unfalldaten
 */

import { apiClient } from './client';

// ─── Fahrzeuge ───────────────────────────────────────────────────────────────

export interface Fahrzeug {
  id: string;
  gutachtenId: string;
  kennzeichen: string | null;
  fahrgestellnummer: string | null;
  marke: string | null;
  modell: string | null;
  baujahr: number | null;
  farbe: string | null;
  typ: string | null;
  createdAt: string;
}

export interface CreateFahrzeugInput {
  kennzeichen?: string;
  fahrgestellnummer?: string;
  marke?: string;
  modell?: string;
  baujahr?: number;
  farbe?: string;
  typ?: string;
}

// ─── Personen ────────────────────────────────────────────────────────────────

export interface Person {
  id: string;
  gutachtenId: string;
  typ: 'FAHRER' | 'ZEUGE' | 'GESCHAEDIGTER' | 'SONSTIGER';
  vorname: string | null;
  nachname: string;
  geburtsdatum: string | null;
  telefon: string | null;
  email: string | null;
  adresse: string | null;
  createdAt: string;
}

export interface CreatePersonInput {
  typ: 'FAHRER' | 'ZEUGE' | 'GESCHAEDIGTER' | 'SONSTIGER';
  vorname?: string;
  nachname: string;
  geburtsdatum?: string;
  telefon?: string;
  email?: string;
  adresse?: string;
}

// ─── Schadensposten ──────────────────────────────────────────────────────────

export interface Schadensposten {
  id: string;
  gutachtenId: string;
  position: number;
  beschreibung: string;
  betrag: number;
  einheit: string | null;
  createdAt: string;
}

export interface SchadenspostenSumme {
  posten: Schadensposten[];
  gesamtbetrag: number;
}

export interface CreateSchadenspostenInput {
  beschreibung: string;
  betrag: number;
  einheit?: string;
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
  beschreibung: string | null;
  erledigt: boolean;
  faelligAm: string | null;
  zugewiesen: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAufgabeInput {
  titel: string;
  beschreibung?: string;
  faelligAm?: string;
  zugewiesen?: string;
}

// ─── Dateien ─────────────────────────────────────────────────────────────────

export interface Datei {
  id: string;
  gutachtenId: string;
  dateiname: string;
  originalname: string;
  mimetype: string;
  groesse: number;
  pfad: string;
  createdAt: string;
}

// ─── Audit-Log ───────────────────────────────────────────────────────────────

export interface AuditEintrag {
  id: string;
  gutachtenId: string;
  aktion: string;
  details: string | null;
  autor: string | null;
  createdAt: string;
}

// ─── Unfalldaten ─────────────────────────────────────────────────────────────

export interface Unfalldaten {
  id: string;
  gutachtenId: string;
  unfallOrt: string | null;
  unfallZeit: string | null;
  unfallHergang: string | null;
  strassenverhaeltnisse: string | null;
  witterung: string | null;
  lichtverhaeltnisse: string | null;
  polizeiAktenzeichen: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUnfalldatenInput {
  unfallOrt?: string;
  unfallZeit?: string;
  unfallHergang?: string;
  strassenverhaeltnisse?: string;
  witterung?: string;
  lichtverhaeltnisse?: string;
  polizeiAktenzeichen?: string;
}

// ─── API-Objekt ───────────────────────────────────────────────────────────────

export const subresourcesApi = {
  // Fahrzeuge
  fahrzeuge: {
    list: (gutachtenId: string): Promise<Fahrzeug[]> =>
      apiClient.get<Fahrzeug[]>(`/gutachten/${gutachtenId}/fahrzeuge`),
    create: (gutachtenId: string, data: CreateFahrzeugInput): Promise<Fahrzeug> =>
      apiClient.post<Fahrzeug>(`/gutachten/${gutachtenId}/fahrzeuge`, data),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/fahrzeuge/${id}`),
  },

  // Personen
  personen: {
    list: (gutachtenId: string): Promise<Person[]> =>
      apiClient.get<Person[]>(`/gutachten/${gutachtenId}/personen`),
    create: (gutachtenId: string, data: CreatePersonInput): Promise<Person> =>
      apiClient.post<Person>(`/gutachten/${gutachtenId}/personen`, data),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/personen/${id}`),
  },

  // Schadensposten
  schaden: {
    list: (gutachtenId: string): Promise<SchadenspostenSumme> =>
      apiClient.get<SchadenspostenSumme>(`/gutachten/${gutachtenId}/schaden`),
    create: (gutachtenId: string, data: CreateSchadenspostenInput): Promise<Schadensposten> =>
      apiClient.post<Schadensposten>(`/gutachten/${gutachtenId}/schaden`, data),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/schaden/${id}`),
  },

  // Notizen
  notizen: {
    list: (gutachtenId: string): Promise<Notiz[]> =>
      apiClient.get<Notiz[]>(`/gutachten/${gutachtenId}/notizen`),
    create: (gutachtenId: string, data: CreateNotizInput): Promise<Notiz> =>
      apiClient.post<Notiz>(`/gutachten/${gutachtenId}/notizen`, data),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/notizen/${id}`),
  },

  // Aufgaben
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

  // Dateien
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

  // Audit-Log
  audit: {
    list: (gutachtenId: string): Promise<AuditEintrag[]> =>
      apiClient.get<AuditEintrag[]>(`/gutachten/${gutachtenId}/audit`),
  },

  // Unfalldaten
  unfall: {
    get: (gutachtenId: string): Promise<Unfalldaten | null> =>
      apiClient.get<Unfalldaten | null>(`/gutachten/${gutachtenId}/unfall`),
    upsert: (gutachtenId: string, data: UpdateUnfalldatenInput): Promise<Unfalldaten> =>
      apiClient.put<Unfalldaten>(`/gutachten/${gutachtenId}/unfall`, data),
  },
};
