/**
 * @file apps/api/src/modules/audit/audit.service.ts
 */
import { prisma } from '@gutachten/database';

import { notFound } from '../../middleware/error.middleware';

export const auditService = {
  async list(gutachtenId: string) {
    const gutachten = await prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }

    return prisma.auditLog.findMany({
      where: { gutachtenId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },
};
