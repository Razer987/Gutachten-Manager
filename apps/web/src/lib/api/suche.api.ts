/**
 * @file apps/web/src/lib/api/suche.api.ts
 * @description API-Funktionen für die Volltextsuche.
 */

import { apiClient } from './client';

export interface SucheResult {
  gutachten: Array<{
    id: string;
    aktenzeichen: string;
    titel: string;
    status: string;
    highlight: string;
  }>;
  kunden: Array<{
    id: string;
    vorname: string | null;
    nachname: string;
    email: string | null;
    highlight: string;
  }>;
  gutachter: Array<{
    id: string;
    vorname: string;
    nachname: string;
    email: string | null;
    highlight: string;
  }>;
  total: number;
}

export const sucheApi = {
  suche: (q: string, limit?: number): Promise<SucheResult> => {
    const qs = new URLSearchParams({ q });
    if (limit) qs.set('limit', String(limit));
    return apiClient.get<SucheResult>(`/suche?${qs}`);
  },
};
