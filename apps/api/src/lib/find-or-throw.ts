import { notFound } from '../middleware/error.middleware';

/**
 * Führt eine Prisma-findUnique-Abfrage aus und wirft einen 404-Fehler wenn
 * kein Datensatz gefunden wurde.
 *
 * Eliminiert das wiederkehrende Muster:
 *   const x = await prisma.model.findUnique(...);
 *   if (!x) throw notFound('Model', id);
 *
 * @param promise Das Ergebnis von prisma.model.findUnique(...)
 * @param resourceName Name der Ressource für die Fehlermeldung (z.B. 'Gutachten')
 * @param id Optionale ID für die Fehlermeldung
 */
export async function findOrThrow<T>(
  promise: Promise<T | null>,
  resourceName: string,
  id?: string,
): Promise<T> {
  const result = await promise;
  if (result === null || result === undefined) {
    throw notFound(resourceName, id);
  }
  return result;
}
