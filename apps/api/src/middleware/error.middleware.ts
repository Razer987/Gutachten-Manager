/**
 * @file apps/api/src/middleware/error.middleware.ts
 * @description Zentraler Fehlerbehandlungs-Middleware für Express.
 *
 * Fängt alle unbehandelten Fehler ab und gibt einheitliche Fehler-Responses zurück.
 * Verhindert dass Stack-Traces und interne Details an den Client gelangen.
 *
 * Einbinden in app.ts:
 *   app.use(errorMiddleware)    // MUSS nach allen anderen Middlewares kommen!
 */

import type { NextFunction, Request, Response, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { logger } from '@/config/logger';
import { API_ERROR_CODES } from '@gutachten/shared';

/** Eigene Fehler-Klasse für HTTP-Fehler */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Erstellt einen standardisierten 404-Fehler */
export function notFound(resource: string, id?: string): AppError {
  const msg = id
    ? `${resource} mit ID "${id}" wurde nicht gefunden.`
    : `${resource} wurde nicht gefunden.`;
  return new AppError(404, API_ERROR_CODES.NOT_FOUND, msg);
}

/** Erstellt einen standardisierten 409-Konflikt-Fehler */
export function conflict(message: string): AppError {
  return new AppError(409, API_ERROR_CODES.CONFLICT, message);
}

/**
 * Express Error-Middleware.
 * Signatur mit 4 Parametern ist wichtig — Express erkennt Error-Middlewares daran!
 */
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Zod-Validierungsfehler (ungültige Request-Daten)
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: 'Eingabedaten sind ungültig.',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Eigene App-Fehler (404, 409, etc.)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Unbekannte Fehler — Intern loggen, generische Antwort senden
  const error = err instanceof Error ? err : new Error(String(err));
  logger.error('Unbehandelter Fehler', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: {
      code: API_ERROR_CODES.INTERNAL_ERROR,
      message: 'Ein interner Serverfehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    },
  });
}

/**
 * Wraps an async Express handler so that errors are forwarded to next().
 * Without this wrapper, unhandled promise rejections crash the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
