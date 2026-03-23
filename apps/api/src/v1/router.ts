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

// Feature-Module werden nach und nach importiert
// (werden in späteren Patches hinzugefügt)
// import { gutachtenRouter } from '@/modules/gutachten/gutachten.routes';
// import { kundenRouter } from '@/modules/kunden/kunden.routes';

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
// Feature-Module (werden schrittweise hinzugefügt)
// ---------------------------------------------------------------------------
// router.use('/gutachten', gutachtenRouter);
// router.use('/kunden', kundenRouter);
// router.use('/gutachter', gutachterRouter);
// router.use('/kalender', kalenderRouter);
// router.use('/suche', sucheRouter);
// router.use('/dashboard', dashboardRouter);
// router.use('/admin', adminRouter);
// router.use('/backup', backupRouter);

export { router as v1Router };
