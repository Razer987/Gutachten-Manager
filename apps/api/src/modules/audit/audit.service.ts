/**
 * @file apps/api/src/modules/audit/audit.service.ts
 */
import { prisma } from '@gutachten/database';

import { findOrThrow } from '../../lib/find-or-throw';

export const auditService = {
  async list(gutachtenId: string) {
    await findOrThrow(prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } }), 'Gutachten', gutachtenId);

    return prisma.auditLog.findMany({
      where: { gutachtenId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },
};
