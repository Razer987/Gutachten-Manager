/**
 * @file apps/api/src/services/backup.service.ts
 * @description Automatisches Backup-System via pg_dump.
 *
 * ARCHITEKTUR-ENTSCHEIDUNG: pg_dump statt Prisma-JSON-Export
 *
 * Das alte Pattern (prisma.findMany → JSON.stringify) ist eine OOM-Zeitbombe:
 * Node.js muss die gesamte DB in den V8-Heap laden. Bei großen Datenbanken
 * überschreitet das das Heap-Limit (~1.5 GB) und der Prozess crasht.
 *
 * pg_dump schreibt direkt vom PostgreSQL-Server auf die Festplatte (Streaming)
 * ohne den Node.js-Heap zu belasten. Das funktioniert auch bei GB-großen DBs.
 *
 * Voraussetzung: postgresql-client muss im Docker-Container installiert sein
 *   (api.Dockerfile: RUN apk add --no-cache postgresql-client)
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import cron from 'node-cron';

import { env } from '../config/env';
import { logger } from '../config/logger';

const execAsync = promisify(exec);

/**
 * Parst die DATABASE_URL in einzelne pg_dump-Parameter.
 * Format: postgresql://user:password@host:port/database?schema=public
 */
function parseDatabaseUrl(url: string): {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
} {
  const parsed = new URL(url);
  return {
    host:     parsed.hostname,
    port:     parsed.port || '5432',
    database: parsed.pathname.slice(1).split('?')[0], // Entfernt führenden "/" und Query-Params
    user:     parsed.username,
    password: parsed.password,
  };
}

/**
 * Erstellt einen vollständigen PostgreSQL-Dump via pg_dump.
 *
 * pg_dump streamt direkt vom Server in eine .sql-Datei ohne den
 * Node.js-Heap zu belasten. Geeignet für Datenbanken beliebiger Größe.
 */
async function erstelleBackup(): Promise<void> {
  const startzeit = Date.now();
  const zeitstempel = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dateiname = `backup-${zeitstempel}.sql`;
  const dateipfad = path.resolve(env.BACKUP_DIR, dateiname);

  logger.info(`Backup wird erstellt: ${dateiname}`);

  const db = parseDatabaseUrl(env.DATABASE_URL);

  // pg_dump Kommando:
  // -F p = Plain-Text SQL (lesbar, wiederherstellbar mit psql)
  // -f   = Output-Datei direkt (kein Pipen in Node.js-Memory)
  // Passwort via PGPASSWORD-Umgebungsvariable (sicherer als -W Flag)
  const command = [
    'pg_dump',
    `-h ${db.host}`,
    `-p ${db.port}`,
    `-U ${db.user}`,
    `-d ${db.database}`,
    '-F p',           // Plain SQL Format
    '--no-owner',     // Eigentümer nicht in Dump (portabler)
    '--no-acl',       // ACLs nicht in Dump (portabler)
    `-f "${dateipfad}"`,
  ].join(' ');

  try {
    await execAsync(command, {
      env: {
        ...process.env,
        PGPASSWORD: db.password, // Passwort sicher via Env-Variable
      },
      // Timeout: 10 Minuten (für große DBs)
      timeout: 10 * 60 * 1000,
    });

    const dauer = Date.now() - startzeit;
    const groesse = fs.existsSync(dateipfad)
      ? (fs.statSync(dateipfad).size / 1024).toFixed(1)
      : '?';
    logger.info(`Backup erfolgreich: ${dateiname} (${groesse} KB, ${dauer}ms)`);

    await bereinigePalteBackups();
  } catch (error) {
    // Teilweise erstellte Datei aufräumen
    if (fs.existsSync(dateipfad)) {
      try { fs.unlinkSync(dateipfad); } catch { /* ignorieren */ }
    }
    logger.error('Backup fehlgeschlagen', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Löscht Backup-Dateien die älter als BACKUP_RETENTION_DAYS sind.
 */
async function bereinigePalteBackups(): Promise<void> {
  const grenzeDatum = Date.now() - env.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const backupDir = path.resolve(env.BACKUP_DIR);

  if (!fs.existsSync(backupDir)) return;

  const dateien = fs.readdirSync(backupDir);
  let geloescht = 0;

  for (const datei of dateien) {
    if (!datei.startsWith('backup-') || !datei.endsWith('.sql')) continue;
    const dateipfad = path.join(backupDir, datei);
    const stat = fs.statSync(dateipfad);
    if (stat.mtimeMs < grenzeDatum) {
      fs.unlinkSync(dateipfad);
      geloescht++;
      logger.info(`Altes Backup gelöscht: ${datei}`);
    }
  }

  if (geloescht > 0) {
    logger.info(`${geloescht} alte Backup(s) bereinigt`);
  }
}

/**
 * Gibt eine Liste aller verfügbaren Backups zurück.
 */
export function listeBackups(): Array<{ dateiname: string; groesse: number; erstellt: Date }> {
  const backupDir = path.resolve(env.BACKUP_DIR);
  if (!fs.existsSync(backupDir)) return [];

  return fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.sql'))
    .map((f) => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { dateiname: f, groesse: stat.size, erstellt: stat.mtime };
    })
    .sort((a, b) => b.erstellt.getTime() - a.erstellt.getTime());
}

/**
 * Startet den Backup-Cron-Job.
 */
export function starteBackupCron(): void {
  const schedule = env.BACKUP_CRON_SCHEDULE;

  if (!cron.validate(schedule)) {
    logger.error(`Ungültiger Backup-Cron-Schedule: ${schedule}`);
    return;
  }

  cron.schedule(schedule, () => {
    erstelleBackup().catch((error) => {
      logger.error('Backup-Cron fehlgeschlagen', { error });
    });
  });

  logger.info(`Backup-Cron gestartet: ${schedule} (Retention: ${env.BACKUP_RETENTION_DAYS} Tage)`);
}

/** Manuelles sofortiges Backup (für API-Endpunkt). */
export { erstelleBackup };
