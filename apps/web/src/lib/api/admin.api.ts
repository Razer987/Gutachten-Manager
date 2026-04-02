/**
 * @file apps/web/src/lib/api/admin.api.ts
 * @description API-Funktionen für das Admin-Modul (Feature-Flags).
 */

import { apiClient } from './client';

export interface FeatureFlag {
  id: string;
  name: string;
  beschreibung: string | null;
  aktiv: boolean;
  createdAt: string;
  updatedAt: string;
}

export const adminApi = {
  listFlags: (): Promise<FeatureFlag[]> =>
    apiClient.get<FeatureFlag[]>('/admin/feature-flags'),

  toggleFlag: (id: string, aktiv: boolean): Promise<FeatureFlag> =>
    apiClient.patch<FeatureFlag>(`/admin/feature-flags/${id}`, { aktiv }),

  createFlag: (data: { name: string; beschreibung?: string; aktiv?: boolean }): Promise<FeatureFlag> =>
    apiClient.post<FeatureFlag>('/admin/feature-flags', data),
};
