/**
 * Integrationstests für das Gutachten-Modul.
 * GET/POST/PATCH/DELETE /api/v1/gutachten
 *
 * Prisma wird über moduleNameMapper gemockt — kein echter DB-Zugriff.
 */

import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@gutachten/database';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Beispiel-Datensatz der vom DB-Mock zurückgegeben wird
const gutachtenFixture = {
  id: 'cltest00000000000000000001',
  aktenzeichen: 'GA-2026-001',
  titel: 'Test-Gutachten BMW',
  status: 'AUFGENOMMEN',
  beschreibung: null,
  frist: null,
  auftragsdatum: null,
  abschlussdatum: null,
  kundeId: null,
  gutachterId: null,
  createdAt: new Date('2026-01-01T08:00:00.000Z'),
  updatedAt: new Date('2026-01-01T08:00:00.000Z'),
  kunde: null,
  gutachter: null,
  verwandteGutachten: [],
  verwandteMitGutachten: [],
  _count: { aufgaben: 0, dateien: 0 },
};

describe('GET /api/v1/gutachten', () => {
  beforeEach(() => {
    mockPrisma.gutachten.findMany.mockResolvedValue([gutachtenFixture] as any);
    mockPrisma.gutachten.count.mockResolvedValue(1);
  });

  it('gibt eine paginierte Liste zurück', async () => {
    const res = await request(app).get('/api/v1/gutachten');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.gutachten).toHaveLength(1);
    expect(res.body.data.meta).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('übergibt page und pageSize an Prisma', async () => {
    await request(app).get('/api/v1/gutachten?page=2&pageSize=5');

    expect(mockPrisma.gutachten.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
      }),
    );
  });

  it('filtert nach Status', async () => {
    await request(app).get('/api/v1/gutachten?status=FERTIG');

    expect(mockPrisma.gutachten.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'FERTIG' }),
      }),
    );
  });

  it('lehnt ungültigen Status mit 400 ab', async () => {
    const res = await request(app).get('/api/v1/gutachten?status=UNGUELTIG');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/v1/gutachten/:id', () => {
  it('gibt 200 mit Gutachten zurück', async () => {
    mockPrisma.gutachten.findUnique.mockResolvedValue(gutachtenFixture as any);

    const res = await request(app).get('/api/v1/gutachten/cltest00000000000000000001');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.aktenzeichen).toBe('GA-2026-001');
  });

  it('gibt 404 zurück wenn Gutachten nicht existiert', async () => {
    mockPrisma.gutachten.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/v1/gutachten/clnichtvorhanden00000001');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/v1/gutachten', () => {
  beforeEach(() => {
    // Mock für Aktenzeichen-Generierung
    mockPrisma.gutachten.findFirst.mockResolvedValue(null);
    mockPrisma.gutachten.create.mockResolvedValue(gutachtenFixture as any);
  });

  it('erstellt ein neues Gutachten und gibt 201 zurück', async () => {
    const res = await request(app)
      .post('/api/v1/gutachten')
      .send({ titel: 'Test-Gutachten BMW' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('lehnt fehlendem Titel mit 400 ab', async () => {
    const res = await request(app)
      .post('/api/v1/gutachten')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('lehnt Titel unter 3 Zeichen mit 400 ab', async () => {
    const res = await request(app)
      .post('/api/v1/gutachten')
      .send({ titel: 'AB' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('PATCH /api/v1/gutachten/:id', () => {
  it('aktualisiert ein Gutachten und gibt 200 zurück', async () => {
    const updated = { ...gutachtenFixture, titel: 'Geänderter Titel' };
    mockPrisma.gutachten.findUnique.mockResolvedValue(gutachtenFixture as any);
    mockPrisma.gutachten.update.mockResolvedValue(updated as any);

    const res = await request(app)
      .patch('/api/v1/gutachten/cltest00000000000000000001')
      .send({ titel: 'Geänderter Titel' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('PATCH /api/v1/gutachten/:id/status', () => {
  it('ändert den Status und gibt 200 zurück', async () => {
    const updated = { ...gutachtenFixture, status: 'BEAUFTRAGT' };
    mockPrisma.gutachten.findUnique.mockResolvedValue(gutachtenFixture as any);
    mockPrisma.gutachten.update.mockResolvedValue(updated as any);
    mockPrisma.auditLog.create.mockResolvedValue({} as any);

    const res = await request(app)
      .patch('/api/v1/gutachten/cltest00000000000000000001/status')
      .send({ status: 'BEAUFTRAGT' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('lehnt ungültigen Status mit 400 ab', async () => {
    const res = await request(app)
      .patch('/api/v1/gutachten/cltest00000000000000000001/status')
      .send({ status: 'OFFEN' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
