/**
 * @file packages/database/src/index.ts
 * @description Prisma-Client Singleton für den Gutachten-Manager.
 *
 * Exportiert einen einzigen, geteilten PrismaClient der in der gesamten
 * Anwendung verwendet wird. Das Singleton-Pattern verhindert mehrfache
 * Datenbankverbindungen in der Entwicklungsumgebung (Hot-Reload Problem).
 *
 * Verwendung in anderen Paketen:
 *   import { prisma } from '@gutachten/database'
 *   const gutachten = await prisma.gutachten.findMany()
 */

import { PrismaClient } from '@prisma/client';

// Globaler Typ für den Singleton im Development-Modus
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * PrismaClient Singleton.
 *
 * Im Entwicklungsmodus (NODE_ENV !== 'production') wird der Client global
 * gespeichert um mehrfache Instanziierungen bei Hot-Reloads zu vermeiden.
 * In der Produktion wird eine neue Instanz erstellt.
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });
}

export const prisma: PrismaClient =
  process.env['NODE_ENV'] === 'production'
    ? createPrismaClient()
    : (global.__prisma ?? (global.__prisma = createPrismaClient()));

// Alle Prisma-Typen re-exportieren für einfache Verwendung
export * from '@prisma/client';
