/**
 * @file apps/web/src/lib/api/termine.api.ts
 * @description API-Funktionen für das Termin-Modul.
 */

import { apiClient } from './client';

export interface Termin {
  id: string;
  titel: string;
  beschreibung: string | null;
  start: string;
  ende: string | null;
  ort: string | null;
  farbe: string | null;
  erinnerung: number | null;
  gutachtenId: string | null;
  createdAt: string;
  updatedAt: string;
  gutachten: { id: string; aktenzeichen: string; titel: string } | null;
}

export interface CreateTerminInput {
  titel: string;
  beschreibung?: string;
  start: string;
  ende: string;
  ort?: string;
  farbe?: string;
  erinnerung?: number;
  gutachtenId?: string | null;
}

export const termineApi = {
  list: (params?: { von?: string; bis?: string; gutachtenId?: string }): Promise<Termin[]> => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      });
    }
    return apiClient.get<Termin[]>(`/termine${qs.toString() ? `?${qs}` : ''}`);
  },

  findById: (id: string): Promise<Termin> =>
    apiClient.get<Termin>(`/termine/${id}`),

  create: (data: CreateTerminInput): Promise<Termin> =>
    apiClient.post<Termin>('/termine', data),

  update: (id: string, data: Partial<CreateTerminInput>): Promise<Termin> =>
    apiClient.patch<Termin>(`/termine/${id}`, data),

  delete: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/termine/${id}`),
};
