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
  // kein createdAt — FeatureFlag hat nur updatedAt im Schema
  updatedAt: string;
}

export const adminApi = {
  listFlags: (): Promise<FeatureFlag[]> =>
    apiClient.get<FeatureFlag[]>('/admin/feature-flags'),

  // Route ist /admin/feature-flags/:name (name, nicht id!)
  toggleFlag: (name: string, aktiv: boolean): Promise<FeatureFlag> =>
    apiClient.patch<FeatureFlag>(`/admin/feature-flags/${encodeURIComponent(name)}`, { aktiv }),

  createFlag: (data: { name: string; beschreibung?: string; aktiv?: boolean }): Promise<FeatureFlag> =>
    apiClient.post<FeatureFlag>('/admin/feature-flags', data),
};
