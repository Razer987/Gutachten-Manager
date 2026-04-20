/**
 * @file apps/api/src/config/env.ts
 * @description Typisierte und validierte Umgebungsvariablen.
 *
 * Alle Umgebungsvariablen werden hier einmalig gelesen und validiert.
 * Bei fehlenden Pflicht-Variablen wirft die Anwendung sofort einen Fehler
 * mit einer klaren Fehlermeldung — statt still zu versagen.
 *
 * Verwendung:
 *   import { env } from './config/env'
 *   console.log(env.PORT)  // typisiert als number
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Fehlende Pflicht-Umgebungsvariable: ${name}\n` +
      `Bitte .env.example als Vorlage verwenden und .env erstellen.`,
    );
  }
  return value;
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

function optionalNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) { return defaultValue; }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Umgebungsvariable ${name} muss eine Zahl sein, ist aber: "${value}"`);
  }
  return parsed;
}

/** Alle validierten Umgebungsvariablen der API */
export const env = {
  // Server
  NODE_ENV: optional('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  PORT: optionalNumber('PORT', 4000),

  // Datenbank
  DATABASE_URL: required('DATABASE_URL'),

  // CORS
  CORS_ORIGINS: optional('CORS_ORIGINS', 'http://localhost:3000').split(',').map(s => s.trim()),

  // Uploads
  MAX_UPLOAD_SIZE_MB: optionalNumber('MAX_UPLOAD_SIZE_MB', 50),
  UPLOAD_DIR: optional('UPLOAD_DIR', './uploads'),

  // Logging
  LOG_LEVEL: optional('LOG_LEVEL', 'info') as 'error' | 'warn' | 'info' | 'debug',
  LOG_DIR: optional('LOG_DIR', './logs'),

  // Backup
  BACKUP_DIR: optional('BACKUP_DIR', './backups'),
  BACKUP_RETENTION_DAYS: optionalNumber('BACKUP_RETENTION_DAYS', 30),
  BACKUP_CRON_SCHEDULE: optional('BACKUP_CRON_SCHEDULE', '0 2 * * *'),

  // Abgeleitete Werte
  get IS_PRODUCTION(): boolean { return this.NODE_ENV === 'production'; },
  get IS_DEVELOPMENT(): boolean { return this.NODE_ENV === 'development'; },
  get IS_TEST(): boolean { return this.NODE_ENV === 'test'; },
} as const;
