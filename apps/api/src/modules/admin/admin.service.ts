/**
 * @file apps/api/src/modules/admin/admin.service.ts
 */
import { prisma } from '@gutachten/database';

export const adminService = {
  async getFeatureFlags() {
    return prisma.featureFlag.findMany({ orderBy: { name: 'asc' } });
  },

  async toggleFeatureFlag(name: string, aktiv: boolean) {
    return prisma.featureFlag.upsert({
      where: { name },
      create: { name, aktiv },
      update: { aktiv },
    });
  },
};
