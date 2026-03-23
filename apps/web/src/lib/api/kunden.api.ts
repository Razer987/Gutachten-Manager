/**
 * @file apps/web/src/lib/api/kunden.api.ts
 * @description API-Funktionen für das Kunden-Modul.
 */

import { apiClient } from './client';

export interface Kunde {
  id: string;
  vorname: string | null;
  nachname: string;
  firma: string | null;
  email: string | null;
  telefon: string | null;
  mobil: string | null;
  strasse: string | null;
  plz: string | null;
  stadt: string | null;
  land: string | null;
  notizen: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { gutachten: number; kontakthistorie: number };
}

export interface KundenListResponse {
  kunden: Kunde[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface CreateKundeInput {
  vorname?: string | null;
  nachname: string;
  firma?: string | null;
  email?: string | null;
  telefon?: string | null;
  mobil?: string | null;
  strasse?: string | null;
  plz?: string | null;
  stadt?: string | null;
  land?: string;
  notizen?: string | null;
}

export const kundenApi = {
  list: (query?: { page?: number; pageSize?: number; suche?: string }): Promise<KundenListResponse> => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          params.set(key, String(val));
        }
      });
    }
    const qs = params.toString();
    return apiClient.get<KundenListResponse>(`/kunden${qs ? `?${qs}` : ''}`);
  },

  findById: (id: string): Promise<Kunde> =>
    apiClient.get<Kunde>(`/kunden/${id}`),

  create: (data: CreateKundeInput): Promise<Kunde> =>
    apiClient.post<Kunde>('/kunden', data),

  update: (id: string, data: Partial<CreateKundeInput>): Promise<Kunde> =>
    apiClient.patch<Kunde>(`/kunden/${id}`, data),

  delete: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/kunden/${id}`),

  addKontakt: (id: string, data: { art: string; inhalt: string; bearbeiter?: string }) =>
    apiClient.post(`/kunden/${id}/kontakte`, data),
};
