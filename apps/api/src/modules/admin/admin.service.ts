/**
 * @file apps/api/src/modules/admin/admin.service.ts
 */
import { prisma } from '@gutachten/database';

// ─── In-Memory-Cache für Feature-Flags (TTL: 5 Minuten) ─────────────────────
// Feature-Flags ändern sich selten. Cache verhindert unnötige DB-Abfragen.
// Cache wird bei toggleFeatureFlag() invalidiert.
const featureFlagCache = {
  data: null as Awaited<ReturnType<typeof prisma.featureFlag.findMany>> | null,
  cachedAt: 0,
  TTL_MS: 5 * 60 * 1000, // 5 Minuten

  isValid(): boolean {
    return this.data !== null && Date.now() - this.cachedAt < this.TTL_MS;
  },

  set(data: Awaited<ReturnType<typeof prisma.featureFlag.findMany>>) {
    this.data = data;
    this.cachedAt = Date.now();
  },

  invalidate() {
    this.data = null;
    this.cachedAt = 0;
  },
};

export const adminService = {
  /**
   * Gibt alle Feature-Flags zurück, alphabetisch sortiert.
   * Ergebnis wird für 5 Minuten gecacht um DB-Last zu reduzieren.
   */
  async getFeatureFlags() {
    if (featureFlagCache.isValid()) {
      return featureFlagCache.data!;
    }
    const flags = await prisma.featureFlag.findMany({ orderBy: { name: 'asc' } });
    featureFlagCache.set(flags);
    return flags;
  },

  /**
   * Aktiviert oder deaktiviert ein Feature-Flag.
   * Erstellt den Eintrag falls noch nicht vorhanden (upsert).
   * Invalidiert den Cache nach Änderung.
   */
  async toggleFeatureFlag(name: string, aktiv: boolean) {
    featureFlagCache.invalidate();
    return prisma.featureFlag.upsert({
      where: { name },
      create: { name, aktiv },
      update: { aktiv },
    });
  },
};
