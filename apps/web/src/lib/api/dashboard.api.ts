/**
 * @file apps/web/src/lib/api/dashboard.api.ts
 * @description API-Funktionen für das Dashboard.
 */

import { apiClient } from './client';
import type { GutachtenListItem } from './gutachten.api';

export interface DashboardStats {
  gesamt: number;
  aktiv: number;
  fertig: number;
  ueberfaellige: number;
  faelligIn30Tagen: number;
  statusVerteilung: Record<string, number>;
  aktuelleGutachten: GutachtenListItem[];
}

export interface MonatsuebersichtItem {
  monat: string;
  erstellt: number;
  fertig: number;
}

export const dashboardApi = {
  getStats: (): Promise<DashboardStats> =>
    apiClient.get<DashboardStats>('/dashboard/stats'),

  getMonatsuebersicht: (): Promise<MonatsuebersichtItem[]> =>
    apiClient.get<MonatsuebersichtItem[]>('/dashboard/monatsuebersicht'),

  getFristen: (): Promise<GutachtenListItem[]> =>
    apiClient.get<GutachtenListItem[]>('/dashboard/fristen'),
};
