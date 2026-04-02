/**
 * @file apps/api/src/services/backup.service.ts
 * @description Automatisches Backup-System mit node-cron.
 *
 * Erstellt täglich einen JSON-Export aller wichtigen Daten.
 * Alte Backups werden nach BACKUP_RETENTION_DAYS automatisch gelöscht.
 *
 * Standard-Schedule: täglich um 02:00 Uhr (konfigurierbar via BACKUP_CRON_SCHEDULE)
 */

import fs from 'fs';
import path from 'path';

import cron from 'node-cron';
import { prisma } from '@gutachten/database';

import { env } from '@/config/env';
import { logger } from '@/config/logger';

/** Erstellt ein JSON-Backup aller Daten */
async function erstelleBackup(): Promise<void> {
  const startzeit = Date.now();
  const zeitstempel = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dateiname = `backup-${zeitstempel}.json`;
  const dateipfad = path.join(env.BACKUP_DIR, dateiname);

  logger.info(`Backup wird erstellt: ${dateiname}`);

  try {
    // Alle Kerndaten exportieren
    const [gutachten, kunden, gutachter, termine, featureFlags] = await Promise.all([
      prisma.gutachten.findMany({
        include: {
          kunde: true,
          gutachter: true,
          fahrzeuge: true,
          personen: true,
          schadensposten: true,
          notizen: true,
          aufgaben: true,
          unfall: true,         // korrekt: unfall (nicht unfalldaten)
        },
      }),
      prisma.kunde.findMany(),  // korrekt: prisma.kunde (Modell heißt Kunde, nicht Kunden)
      prisma.gutachter.findMany(),
      prisma.termin.findMany(),
      prisma.featureFlag.findMany(),
    ]);

    const backup = {
      meta: {
        version: '2026.03.1',
        erstellt: new Date().toISOString(),
        eintraege: {
          gutachten: gutachten.length,
          kunden: kunden.length,
          gutachter: gutachter.length,
          termine: termine.length,
        },
      },
      gutachten,
      kunden,
      gutachter,
      termine,
      featureFlags,
    };

    fs.writeFileSync(dateipfad, JSON.stringify(backup, null, 2), 'utf-8');

    const dauer = Date.now() - startzeit;
    const groesse = (fs.statSync(dateipfad).size / 1024).toFixed(1);
    logger.info(`Backup erfolgreich: ${dateiname} (${groesse} KB, ${dauer}ms)`);

    // Alte Backups bereinigen
    await bereinigePalteBackups();
  } catch (error) {
    logger.error('Backup fehlgeschlagen', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Löscht Backup-Dateien die älter als BACKUP_RETENTION_DAYS sind */
async function bereinigePalteBackups(): Promise<void> {
  const grenzeDatum = Date.now() - env.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  if (!fs.existsSync(env.BACKUP_DIR)) return;

  const dateien = fs.readdirSync(env.BACKUP_DIR);
  let geloescht = 0;

  for (const datei of dateien) {
    if (!datei.startsWith('backup-') || !datei.endsWith('.json')) continue;
    const dateipfad = path.join(env.BACKUP_DIR, datei);
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

/** Gibt eine Liste aller verfügbaren Backups zurück */
export function listeBackups(): Array<{ dateiname: string; groesse: number; erstellt: Date }> {
  if (!fs.existsSync(env.BACKUP_DIR)) return [];

  return fs
    .readdirSync(env.BACKUP_DIR)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
    .map((f) => {
      const stat = fs.statSync(path.join(env.BACKUP_DIR, f));
      return { dateiname: f, groesse: stat.size, erstellt: stat.mtime };
    })
    .sort((a, b) => b.erstellt.getTime() - a.erstellt.getTime());
}

/** Startet den Backup-Cron-Job */
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

/** Manuelles sofortiges Backup (für API-Endpunkt) */
export { erstelleBackup };
