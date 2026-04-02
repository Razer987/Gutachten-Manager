/**
 * Mock für @gutachten/database (Prisma)
 * Wird in allen Tests automatisch verwendet wenn moduleNameMapper greift.
 */

const mockPrisma = {
  gutachten: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  kunden: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  gutachter: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  termin: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  featureFlag: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
};

export const prisma = mockPrisma;

// Prisma Enums
export const GutachtenStatus = {
  AUFGENOMMEN: 'AUFGENOMMEN',
  BEAUFTRAGT: 'BEAUFTRAGT',
  BESICHTIGUNG: 'BESICHTIGUNG',
  ENTWURF: 'ENTWURF',
  FREIGABE: 'FREIGABE',
  FERTIG: 'FERTIG',
  ARCHIV: 'ARCHIV',
} as const;

export type Prisma = {
  GutachtenSelect: Record<string, unknown>;
};
