/**
 * @file apps/web/src/lib/api/gutachter.api.ts
 */
import { apiClient } from './client';

export interface Gutachter {
  id: string;
  vorname: string;
  nachname: string;
  email: string | null;
  telefon: string | null;
  fachgebiet: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GutachterListResponse {
  gutachter: Gutachter[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export const gutachterApi = {
  list: (query?: { suche?: string }): Promise<GutachterListResponse> => {
    const params = new URLSearchParams();
    if (query?.suche) { params.set('suche', query.suche); }
    const qs = params.toString();
    return apiClient.get<GutachterListResponse>(`/gutachter${qs ? `?${qs}` : ''}`);
  },

  findById: (id: string): Promise<Gutachter> =>
    apiClient.get<Gutachter>(`/gutachter/${id}`),

  create: (data: { vorname: string; nachname: string; email?: string; telefon?: string; fachgebiet?: string }): Promise<Gutachter> =>
    apiClient.post<Gutachter>('/gutachter', data),

  update: (id: string, data: Partial<{ vorname: string; nachname: string; email: string; telefon: string; fachgebiet: string }>): Promise<Gutachter> =>
    apiClient.patch<Gutachter>(`/gutachter/${id}`, data),

  delete: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/gutachter/${id}`),
};
