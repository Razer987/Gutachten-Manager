/**
 * @file apps/api/src/server.ts
 * @description Einstiegspunkt — startet den HTTP-Server.
 *
 * Trennung von app.ts (Express-Konfiguration) und server.ts (Serverstart)
 * ermöglicht besseres Testing (app.ts kann ohne Serverstart importiert werden).
 *
 * Startreihenfolge:
 *   1. Umgebungsvariablen validieren
 *   2. Datenbankverbindung prüfen
 *   3. Notwendige Verzeichnisse erstellen
 *   4. HTTP-Server starten
 *   5. Geplante Aufgaben starten (Backup-Cron)
 */

import fs from 'fs';
import http from 'http';
import path from 'path';

import { prisma } from '@gutachten/database';

import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

// ---------------------------------------------------------------------------
// Notwendige Verzeichnisse erstellen
// ---------------------------------------------------------------------------

function erstelleVerzeichnisse(): void {
  const verzeichnisse = [
    path.resolve(env.UPLOAD_DIR),
    path.resolve(env.LOG_DIR),
    path.resolve(env.BACKUP_DIR),
  ];

  for (const dir of verzeichnisse) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Verzeichnis erstellt: ${dir}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Datenbankverbindung prüfen
// ---------------------------------------------------------------------------

async function pruefeDatenbankverbindung(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Datenbankverbindung erfolgreich');
  } catch (error) {
    logger.error('Datenbankverbindung fehlgeschlagen', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Server starten
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
  // Verzeichnisse sicherstellen
  erstelleVerzeichnisse();

  // Datenbankverbindung prüfen
  await pruefeDatenbankverbindung();

  // HTTP-Server erstellen und starten
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`  Gutachten-Manager API gestartet`);
    logger.info(`  Version:     2026.03.1`);
    logger.info(`  Umgebung:    ${env.NODE_ENV}`);
    logger.info(`  Port:        ${env.PORT}`);
    logger.info(`  Health-Check: http://localhost:${env.PORT}/api/v1/health`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });

  // ---------------------------------------------------------------------------
  // Graceful Shutdown — Server sauber herunterfahren
  // ---------------------------------------------------------------------------

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} empfangen — Server wird beendet...`);

    server.close(async () => {
      logger.info('HTTP-Server gestoppt');

      try {
        await prisma.$disconnect();
        logger.info('Datenbankverbindung getrennt');
      } catch (error) {
        logger.error('Fehler beim Trennen der Datenbankverbindung', { error });
      }

      logger.info('Server erfolgreich beendet');
      process.exit(0);
    });

    // Erzwungenes Beenden nach 10 Sekunden
    setTimeout(() => {
      logger.error('Erzwungenes Beenden nach Timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Unbehandelte Promise-Rejections abfangen
  process.on('unhandledRejection', (reason) => {
    logger.error('Unbehandelte Promise-Rejection', { reason });
  });
}

// Server starten
start().catch((error) => {
  logger.error('Fehler beim Serverstart', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
