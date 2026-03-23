/**
 * @file packages/shared/src/constants/routes.constants.ts
 * @description API-Routen-Konstanten für Frontend und Backend.
 *
 * Zentralisiert alle API-Routen um Tippfehler zu vermeiden.
 * Beide Seiten (Frontend-API-Client und Backend-Router) nutzen diese Konstanten.
 */

/** API-Basis-URL (Version 1) */
export const API_BASE = '/api/v1';

/** Alle API-Endpunkte */
export const API_ROUTES = {
  // Health-Check
  HEALTH: `${API_BASE}/health`,

  // Gutachten
  GUTACHTEN: {
    BASE: `${API_BASE}/gutachten`,
    DETAIL: (id: string) => `${API_BASE}/gutachten/${id}`,
    STATUS: (id: string) => `${API_BASE}/gutachten/${id}/status`,
    VERKNUEPFEN: (id: string) => `${API_BASE}/gutachten/${id}/verknuepfungen`,
    FAHRZEUGE: (id: string) => `${API_BASE}/gutachten/${id}/fahrzeuge`,
    PERSONEN: (id: string) => `${API_BASE}/gutachten/${id}/personen`,
    SCHAEDEN: (id: string) => `${API_BASE}/gutachten/${id}/schaeden`,
    DATEIEN: (id: string) => `${API_BASE}/gutachten/${id}/dateien`,
    NOTIZEN: (id: string) => `${API_BASE}/gutachten/${id}/notizen`,
    AUFGABEN: (id: string) => `${API_BASE}/gutachten/${id}/aufgaben`,
    TERMINE: (id: string) => `${API_BASE}/gutachten/${id}/termine`,
    AUDIT: (id: string) => `${API_BASE}/gutachten/${id}/audit`,
    UNFALL: (id: string) => `${API_BASE}/gutachten/${id}/unfall`,
    PDF: (id: string) => `${API_BASE}/gutachten/${id}/pdf`,
  },

  // Kunden (CRM)
  KUNDEN: {
    BASE: `${API_BASE}/kunden`,
    DETAIL: (id: string) => `${API_BASE}/kunden/${id}`,
    KONTAKTHISTORIE: (id: string) => `${API_BASE}/kunden/${id}/kontakthistorie`,
    GUTACHTEN: (id: string) => `${API_BASE}/kunden/${id}/gutachten`,
  },

  // Gutachter
  GUTACHTER: {
    BASE: `${API_BASE}/gutachter`,
    DETAIL: (id: string) => `${API_BASE}/gutachter/${id}`,
  },

  // Kalender
  KALENDER: {
    BASE: `${API_BASE}/kalender`,
    TERMIN_DETAIL: (id: string) => `${API_BASE}/kalender/${id}`,
  },

  // Suche
  SUCHE: {
    BASE: `${API_BASE}/suche`,
  },

  // Admin
  ADMIN: {
    FEATURE_FLAGS: `${API_BASE}/admin/feature-flags`,
    FEATURE_FLAG_DETAIL: (name: string) => `${API_BASE}/admin/feature-flags/${name}`,
    TENANTS: `${API_BASE}/admin/tenants`,
    LOGS: `${API_BASE}/admin/logs`,
  },

  // Backup
  BACKUP: {
    ERSTELLEN: `${API_BASE}/backup/erstellen`,
    LISTE: `${API_BASE}/backup/liste`,
    HERUNTERLADEN: (name: string) => `${API_BASE}/backup/${name}`,
  },

  // Dashboard
  DASHBOARD: {
    STATS: `${API_BASE}/dashboard/stats`,
    FRISTEN: `${API_BASE}/dashboard/fristen`,
  },
} as const;
