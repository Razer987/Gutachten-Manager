/**
 * @file apps/web/src/lib/api/gutachten.api.ts
 * @description API-Funktionen für das Gutachten-Modul.
 */

import { apiClient } from './client';

export interface GutachtenListItem {
  id: string;
  aktenzeichen: string;
  titel: string;
  status: GutachtenStatus;
  frist: string | null;
  auftragsdatum: string | null;
  abschlussdatum: string | null;
  createdAt: string;
  updatedAt: string;
  kunde: { id: string; vorname: string | null; nachname: string } | null;
  gutachter: { id: string; vorname: string; nachname: string } | null;
  _count: { aufgaben: number; dateien: number };
}

export interface GutachtenDetail extends GutachtenListItem {
  beschreibung: string | null;
  verwandteGutachten: Array<{ id: string; aktenzeichen: string; titel: string; status: GutachtenStatus }>;
  verwandteMitGutachten: Array<{ id: string; aktenzeichen: string; titel: string; status: GutachtenStatus }>;
}

export type GutachtenStatus =
  | 'AUFGENOMMEN'
  | 'BEAUFTRAGT'
  | 'BESICHTIGUNG'
  | 'ENTWURF'
  | 'FREIGABE'
  | 'FERTIG'
  | 'ARCHIV';

export interface GutachtenListResponse {
  gutachten: GutachtenListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface GutachtenListQuery {
  page?: number;
  pageSize?: number;
  status?: GutachtenStatus;
  suche?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  ueberfaellig?: boolean;
}

export interface CreateGutachtenInput {
  titel: string;
  beschreibung?: string;
  aktenzeichen?: string;
  status?: GutachtenStatus;
  frist?: string | null;
  auftragsdatum?: string | null;
  kundeId?: string | null;
  gutachterId?: string | null;
}

export const gutachtenApi = {
  list: (query?: GutachtenListQuery): Promise<GutachtenListResponse> => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          params.set(key, String(val));
        }
      });
    }
    const qs = params.toString();
    return apiClient.get<GutachtenListResponse>(`/gutachten${qs ? `?${qs}` : ''}`);
  },

  findById: (id: string): Promise<GutachtenDetail> =>
    apiClient.get<GutachtenDetail>(`/gutachten/${id}`),

  create: (data: CreateGutachtenInput): Promise<GutachtenDetail> =>
    apiClient.post<GutachtenDetail>('/gutachten', data),

  update: (id: string, data: Partial<CreateGutachtenInput>): Promise<GutachtenDetail> =>
    apiClient.patch<GutachtenDetail>(`/gutachten/${id}`, data),

  updateStatus: (id: string, status: GutachtenStatus, kommentar?: string): Promise<GutachtenListItem> =>
    apiClient.patch<GutachtenListItem>(`/gutachten/${id}/status`, { status, kommentar }),

  delete: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/gutachten/${id}`),
};
