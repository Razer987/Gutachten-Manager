/**
 * @file apps/api/src/v1/router.ts
 * @description Haupt-Router für API Version 1.
 *
 * Registriert alle Feature-Module unter /api/v1/.
 * Um ein neues Modul hinzuzufügen:
 *   1. Modul in src/modules/<name>/ erstellen
 *   2. Hier importieren und registrieren
 *   3. Fertig — keine anderen Dateien müssen geändert werden
 */

import { Router } from 'express';

import { env } from '@/config/env';
import { requireAdmin, requireAuth } from '@/middleware/auth.middleware';
import { adminRouter } from '@/modules/admin/admin.routes';
import { aufgabenRouter } from '@/modules/aufgaben/aufgaben.routes';
import { auditRouter } from '@/modules/audit/audit.routes';
import { dashboardRouter } from '@/modules/dashboard/dashboard.routes';
import { dateienRouter } from '@/modules/dateien/dateien.routes';
import { fahrzeugeRouter } from '@/modules/fahrzeuge/fahrzeuge.routes';
import { gutachtenRouter } from '@/modules/gutachten/gutachten.routes';
import { gutachterRouter } from '@/modules/gutachter/gutachter.routes';
import { kundenRouter } from '@/modules/kunden/kunden.routes';
import { notizenRouter } from '@/modules/notizen/notizen.routes';
import { personenRouter } from '@/modules/personen/personen.routes';
import { schadenRouter } from '@/modules/schaden/schaden.routes';
import { sucheRouter } from '@/modules/suche/suche.routes';
import { termineRouter } from '@/modules/termine/termine.routes';
import { unfallRouter } from '@/modules/unfall/unfall.routes';

const router = Router();

// ---------------------------------------------------------------------------
// Health-Check
// ---------------------------------------------------------------------------
/**
 * GET /api/v1/health
 * Gibt den Status der API zurück. Wird von Docker und Load-Balancern genutzt.
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: '2026.03.1',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
  });
});

// ---------------------------------------------------------------------------
// API-Übersicht
// ---------------------------------------------------------------------------
/**
 * GET /api/v1/
 * Gibt eine Übersicht aller verfügbaren Endpunkte zurück.
 */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Gutachten-Manager API',
      version: 'v1',
      endpoints: [
        { method: 'GET',    path: '/api/v1/health',          description: 'Health-Check' },
        { method: 'GET',    path: '/api/v1/gutachten',        description: 'Alle Gutachten' },
        { method: 'POST',   path: '/api/v1/gutachten',        description: 'Gutachten erstellen' },
        { method: 'GET',    path: '/api/v1/gutachten/:id',    description: 'Gutachten abrufen' },
        { method: 'PATCH',  path: '/api/v1/gutachten/:id',    description: 'Gutachten bearbeiten' },
        { method: 'DELETE', path: '/api/v1/gutachten/:id',    description: 'Gutachten löschen' },
        { method: 'GET',    path: '/api/v1/kunden',           description: 'Alle Kunden' },
        { method: 'POST',   path: '/api/v1/kunden',           description: 'Kunden erstellen' },
        { method: 'GET',    path: '/api/v1/kalender',         description: 'Termine' },
        { method: 'GET',    path: '/api/v1/dashboard/stats',  description: 'Dashboard-Statistiken' },
        { method: 'GET',    path: '/api/v1/suche',            description: 'Volltextsuche' },
        { method: 'GET',    path: '/api/v1/admin/feature-flags', description: 'Feature-Flags' },
      ],
    },
  });
});

// ---------------------------------------------------------------------------
// Auth-Middleware — Alle nachfolgenden Routen erfordern Authentifizierung
// ---------------------------------------------------------------------------
// PLATZHALTER: Befüllt req.user; in Produktion JWT-Token validieren.
// Ausgenommen: /health und / (Übersicht) — werden vor requireAuth registriert.
router.use(requireAuth);

// ---------------------------------------------------------------------------
// Feature-Module
// ---------------------------------------------------------------------------

// Haupt-Ressourcen
router.use('/gutachten', gutachtenRouter);
router.use('/kunden', kundenRouter);
router.use('/gutachter', gutachterRouter);
router.use('/termine', termineRouter);
router.use('/kalender', termineRouter);
router.use('/dashboard', dashboardRouter);
router.use('/suche', sucheRouter);
router.use('/admin', requireAdmin, adminRouter);

// Sub-Ressourcen für Gutachten
router.use('/gutachten/:gutachtenId/unfall', unfallRouter);
router.use('/gutachten/:gutachtenId/fahrzeuge', fahrzeugeRouter);
router.use('/gutachten/:gutachtenId/personen', personenRouter);
router.use('/gutachten/:gutachtenId/schaden', schadenRouter);
router.use('/gutachten/:gutachtenId/notizen', notizenRouter);
router.use('/gutachten/:gutachtenId/aufgaben', aufgabenRouter);
router.use('/gutachten/:gutachtenId/dateien', dateienRouter);
router.use('/gutachten/:gutachtenId/audit', auditRouter);

export { router as v1Router };
