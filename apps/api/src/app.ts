/**
 * @file apps/api/src/app.ts
 * @description Express-Anwendungskonfiguration.
 *
 * Erstellt und konfiguriert die Express-App mit allen Middlewares.
 * Die App wird in server.ts gestartet (Trennung erlaubt besseres Testing).
 *
 * Middleware-Reihenfolge (WICHTIG — Reihenfolge beeinflusst Verhalten):
 *   1. Helmet      — Security-Headers
 *   2. CORS        — Cross-Origin Requests erlauben
 *   3. Compression — Gzip-Komprimierung
 *   4. Morgan      — HTTP-Request-Logging
 *   5. JSON Parser — Request-Body parsen
 *   6. Router      — Feature-Routen
 *   7. 404-Handler — Nicht gefundene Routen
 *   8. Error-Handler — Alle Fehler zentral behandeln
 */

import path from 'path';

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { errorMiddleware } from '@/middleware/error.middleware';
import { v1Router } from '@/v1/router';

const app = express();

// ---------------------------------------------------------------------------
// Security-Middleware
// ---------------------------------------------------------------------------

// Helmet: Setzt sichere HTTP-Headers (XSS-Schutz, MIME-Sniffing, etc.)
app.use(
  helmet({
    // Content-Security-Policy für API deaktivieren (Frontend macht das selbst)
    contentSecurityPolicy: false,
  }),
);

// CORS: Erlaubt Anfragen von konfigurierten Origins
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// ---------------------------------------------------------------------------
// Performance-Middleware
// ---------------------------------------------------------------------------

// Gzip-Komprimierung für alle Responses
app.use(compression());

// ---------------------------------------------------------------------------
// Request-Logging
// ---------------------------------------------------------------------------

// Morgan: Loggt alle HTTP-Anfragen (wird in production kürzer)
app.use(
  morgan(env.IS_DEVELOPMENT ? 'dev' : 'combined', {
    stream: {
      // Morgan in Winston-Logger umleiten
      write: (message: string) => logger.http(message.trim()),
    },
    // Health-Check-Requests nicht loggen (erzeugen zu viel Lärm)
    skip: (req) => req.url === '/api/v1/health',
  }),
);

// ---------------------------------------------------------------------------
// Body-Parser
// ---------------------------------------------------------------------------

// JSON-Body parsen (max. 10MB für große Rich-Text-Dokumente)
app.use(express.json({ limit: '10mb' }));

// URL-encoded Form-Daten parsen
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------------------------------------------------------------------------
// Statische Dateien (Upload-Verzeichnis)
// ---------------------------------------------------------------------------

// Hochgeladene Dateien werden direkt ausgeliefert
// URL: /uploads/<filename>
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// ---------------------------------------------------------------------------
// API-Routen
// ---------------------------------------------------------------------------

app.use('/api/v1', v1Router);

// ---------------------------------------------------------------------------
// 404-Handler (muss nach allen Routen kommen)
// ---------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpunkt nicht gefunden: ${req.method} ${req.url}`,
    },
  });
});

// ---------------------------------------------------------------------------
// Zentraler Fehler-Handler (muss als LETZTES registriert werden)
// ---------------------------------------------------------------------------

app.use(errorMiddleware);

export { app };
