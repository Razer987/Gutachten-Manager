/**
 * @file apps/api/src/modules/suche/suche.service.ts
 */
import { prisma } from '@gutachten/database';

export const sucheService = {
  async suche(q: string) {
    if (q.length < 2) { return { gutachten: [], kunden: [], gutachter: [] }; }

    const [gutachten, kunden, gutachter] = await Promise.all([
      prisma.gutachten.findMany({
        where: {
          OR: [
            { titel: { contains: q, mode: 'insensitive' } },
            { aktenzeichen: { contains: q, mode: 'insensitive' } },
            { beschreibung: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, aktenzeichen: true, titel: true, status: true },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.kunde.findMany({
        where: {
          OR: [
            { nachname: { contains: q, mode: 'insensitive' } },
            { vorname: { contains: q, mode: 'insensitive' } },
            { firma: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, vorname: true, nachname: true, firma: true, email: true },
        take: 10,
        orderBy: { nachname: 'asc' },
      }),
      prisma.gutachter.findMany({
        where: {
          OR: [
            { nachname: { contains: q, mode: 'insensitive' } },
            { vorname: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, vorname: true, nachname: true, email: true },
        take: 10,
        orderBy: { nachname: 'asc' },
      }),
    ]);

    const total = gutachten.length + kunden.length + gutachter.length;
    return { gutachten, kunden, gutachter, total };
  },
};
