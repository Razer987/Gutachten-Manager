/**
 * @file apps/api/src/middleware/auth.middleware.ts
 * @description Auth-Middleware — Platzhalter für JWT-Authentifizierung.
 *
 * AKTUELLER STAND: Entwicklungs-Modus
 *   - Alle Anfragen werden durchgelassen (kein echtes Token erforderlich)
 *   - req.user wird mit einem System-Benutzer befüllt
 *
 * PRODUKTIONS-IMPLEMENTIERUNG (TODO):
 *   1. JWT aus Authorization-Header extrahieren: `Bearer <token>`
 *   2. Token mit `jsonwebtoken.verify(token, env.JWT_SECRET)` validieren
 *   3. Benutzer-ID aus dem Token in der DB nachschlagen
 *   4. req.user mit echten Benutzerdaten befüllen
 *   5. Bei ungültigem Token → throw unauthorized(...)
 *
 * Beispiel echter Implementierung:
 * @example
 * ```typescript
 * import jwt from 'jsonwebtoken';
 * import { env } from '@/config/env';
 *
 * export async function requireAuth(req: Request, res: Response, next: NextFunction) {
 *   const authHeader = req.headers.authorization;
 *   if (!authHeader?.startsWith('Bearer ')) throw unauthorized('Kein Token übermittelt.');
 *   const token = authHeader.slice(7);
 *   try {
 *     const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; rolle: BenutzerRolle };
 *     req.user = { id: payload.sub, rolle: payload.rolle };
 *     next();
 *   } catch {
 *     throw unauthorized('Token ist ungültig oder abgelaufen.');
 *   }
 * }
 * ```
 */

import type { NextFunction, Request, Response } from 'express';

import { API_ERROR_CODES } from '@gutachten/shared';

import { AppError } from './error.middleware';

/** Mögliche Benutzerrollen im System */
export type BenutzerRolle = 'BENUTZER' | 'GUTACHTER' | 'ADMIN';

/** Authentifizierter Benutzer — wird von requireAuth in req.user gesetzt */
export interface AuthUser {
  id: string;
  rolle: BenutzerRolle;
}

// TypeScript-Erweiterung für Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Stellt sicher, dass der Benutzer authentifiziert ist.
 *
 * PLATZHALTER: Befüllt req.user mit System-Benutzer und lässt durch.
 * In Produktion: JWT aus Authorization-Header validieren.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  // TODO: Echte JWT-Validierung implementieren (siehe JSDoc oben)
  // Platzhalter: In Entwicklung alle Anfragen als System-Benutzer durchlassen
  req.user = { id: 'system', rolle: 'ADMIN' };
  next();
}

/**
 * Stellt sicher, dass der Benutzer Admin-Rechte hat.
 *
 * Muss NACH requireAuth eingesetzt werden, da req.user benötigt wird.
 * Wirft einen 403-Fehler wenn der Benutzer kein Admin ist.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AppError(401, API_ERROR_CODES.UNAUTHORIZED, 'Authentifizierung erforderlich.');
  }
  if (req.user.rolle !== 'ADMIN') {
    throw new AppError(403, API_ERROR_CODES.FORBIDDEN, 'Keine Administratorrechte.');
  }
  next();
}
