/**
 * @file apps/api/src/modules/dashboard/dashboard.service.ts
 */
import { prisma } from '@gutachten/database';

// ─── In-Memory-Cache für Dashboard-Stats (TTL: 2 Minuten) ───────────────────
// Dashboard wird sehr häufig aufgerufen. Cache reduziert DB-Last erheblich.
// Bei 10 gleichzeitigen Benutzern: 5 DB-Queries statt 50 pro Aufruf.

type StatsResult = Awaited<ReturnType<typeof fetchStats>>;
type MonatsResult = Awaited<ReturnType<typeof fetchMonatsuebersicht>>;

const statsCache = {
  data: null as StatsResult | null,
  cachedAt: 0,
  TTL_MS: 2 * 60 * 1000, // 2 Minuten

  isValid(): boolean {
    return this.data !== null && Date.now() - this.cachedAt < this.TTL_MS;
  },
  set(data: StatsResult) { this.data = data; this.cachedAt = Date.now(); },
};

const monatsCache = {
  data: null as MonatsResult | null,
  cachedAt: 0,
  TTL_MS: 10 * 60 * 1000, // 10 Minuten (Monatsdaten ändern sich langsam)

  isValid(): boolean {
    return this.data !== null && Date.now() - this.cachedAt < this.TTL_MS;
  },
  set(data: MonatsResult) { this.data = data; this.cachedAt = Date.now(); },
};

// ─── Interne Fetch-Funktionen ─────────────────────────────────────────────────

async function fetchStats() {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    gesamt,
    statusVerteilung,
    ueberfaellige,
    faelligIn30Tagen,
    aktuelleGutachten,
  ] = await Promise.all([
    prisma.gutachten.count(),
    prisma.gutachten.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.gutachten.count({
      where: {
        frist: { lt: now },
        status: { notIn: ['FERTIG', 'ARCHIV'] },
      },
    }),
    prisma.gutachten.count({
      where: {
        frist: { gte: now, lte: in30Days },
        status: { notIn: ['FERTIG', 'ARCHIV'] },
      },
    }),
    prisma.gutachten.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      where: { status: { notIn: ['ARCHIV'] } },
      select: {
        id: true,
        aktenzeichen: true,
        titel: true,
        status: true,
        frist: true,
        updatedAt: true,
        kunde: { select: { id: true, vorname: true, nachname: true } },
      },
    }),
  ]);

  const statusMap = Object.fromEntries(
    statusVerteilung.map((s) => [s.status, s._count.status])
  );

  return {
    gesamt,
    aktiv: gesamt - (statusMap['ARCHIV'] ?? 0) - (statusMap['FERTIG'] ?? 0),
    fertig: statusMap['FERTIG'] ?? 0,
    ueberfaellige,
    faelligIn30Tagen,
    statusVerteilung: statusMap,
    aktuelleGutachten,
  };
}

async function fetchMonatsuebersicht() {
  const vor12Monaten = new Date();
  vor12Monaten.setMonth(vor12Monaten.getMonth() - 11);
  vor12Monaten.setDate(1);
  vor12Monaten.setHours(0, 0, 0, 0);

  const gutachten = await prisma.gutachten.findMany({
    where: { createdAt: { gte: vor12Monaten } },
    select: { createdAt: true, status: true },
  });

  const monthlyData: Record<string, { erstellt: number; fertig: number }> = {};

  for (const g of gutachten) {
    const key = `${g.createdAt.getFullYear()}-${String(g.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[key]) { monthlyData[key] = { erstellt: 0, fertig: 0 }; }
    monthlyData[key].erstellt++;
    if (g.status === 'FERTIG' || g.status === 'ARCHIV') {
      monthlyData[key].fertig++;
    }
  }

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monat, data]) => ({ monat, ...data }));
}

// ─── Public Service ───────────────────────────────────────────────────────────

export const dashboardService = {
  /**
   * Gibt aggregierte Dashboard-Statistiken zurück.
   * Ergebnis wird für 2 Minuten gecacht (5 parallele DB-Queries).
   */
  async getStats() {
    if (statsCache.isValid()) return statsCache.data!;
    const data = await fetchStats();
    statsCache.set(data);
    return data;
  },

  /**
   * Gibt Monatsübersicht der letzten 12 Monate zurück.
   * Ergebnis wird für 10 Minuten gecacht (Monatsdaten ändern sich selten).
   */
  async getMonatsuebersicht() {
    if (monatsCache.isValid()) return monatsCache.data!;
    const data = await fetchMonatsuebersicht();
    monatsCache.set(data);
    return data;
  },

  /**
   * Gibt Gutachten zurück, die in den nächsten 30 Tagen fällig sind.
   * Nicht gecacht — Fristen-Daten müssen immer aktuell sein.
   */
  async getFristen() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return prisma.gutachten.findMany({
      where: {
        frist: { gte: now, lte: in30Days },
        status: { notIn: ['FERTIG', 'ARCHIV'] },
      },
      orderBy: { frist: 'asc' },
      select: {
        id: true,
        aktenzeichen: true,
        titel: true,
        status: true,
        frist: true,
        gutachter: { select: { id: true, vorname: true, nachname: true } },
        kunde: { select: { id: true, vorname: true, nachname: true } },
      },
    });
  },
};
