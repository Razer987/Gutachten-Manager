/**
 * @file apps/api/src/config/logger.ts
 * @description Winston-Logger Konfiguration.
 *
 * Erstellt einen zentralen Logger der:
 *   - In Entwicklung: Farbig in die Konsole schreibt
 *   - In Produktion: In Dateien schreibt (error.log, combined.log)
 *   - Automatisch rotiert (tägliche Rotation)
 *
 * Verwendung in anderen Dateien:
 *   import { logger } from '@/config/logger'
 *   logger.info('Server gestartet auf Port 4000')
 *   logger.error('Datenbankfehler', { error: err.message })
 */

import path from 'path';
import winston from 'winston';

import { env } from './env';

// Deutsches Datumsformat für Logs
const TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/** Formatierung für Entwicklung (lesbar, farbig) */
const developmentFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: TIMESTAMP_FORMAT }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${String(timestamp)}] ${level}: ${String(message)}${metaStr}`;
  }),
);

/** Formatierung für Produktion (JSON, maschinenlesbar) */
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: TIMESTAMP_FORMAT }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/** Transports (Ausgabe-Ziele) je nach Umgebung */
function createTransports(): winston.transport[] {
  if (env.IS_TEST) {
    // Im Test: Keine Ausgabe (stille Logs)
    return [new winston.transports.Console({ silent: true })];
  }

  if (env.IS_DEVELOPMENT) {
    return [new winston.transports.Console({ format: developmentFormat })];
  }

  // Produktion: Dateien
  return [
    // Alle Logs
    new winston.transports.File({
      filename: path.join(env.LOG_DIR, 'api-combined.log'),
      format: productionFormat,
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,               // Letzten 5 Dateien behalten
    }),
    // Nur Fehler
    new winston.transports.File({
      filename: path.join(env.LOG_DIR, 'api-error.log'),
      level: 'error',
      format: productionFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
    // Auch in Konsole (für Docker-Logs)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: TIMESTAMP_FORMAT }),
        winston.format.printf(({ timestamp, level, message }) =>
          `[${String(timestamp)}] ${level.toUpperCase()}: ${String(message)}`,
        ),
      ),
    }),
  ];
}

/** Zentraler Logger der gesamten API */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  transports: createTransports(),
  // Unbehandelte Ausnahmen abfangen
  exceptionHandlers: env.IS_PRODUCTION
    ? [new winston.transports.File({ filename: path.join(env.LOG_DIR, 'api-exceptions.log') })]
    : [],
  exitOnError: false,
});
