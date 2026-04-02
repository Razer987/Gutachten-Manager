/**
 * Integrationstests für den Health-Check-Endpunkt.
 * GET /api/v1/health
 */

import request from 'supertest';
import { app } from '@/app';

describe('GET /api/v1/health', () => {
  it('gibt 200 mit success:true zurück', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('gibt version und timestamp zurück', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.body.data).toMatchObject({
      status: 'ok',
      version: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('gibt gültigen ISO-Timestamp zurück', async () => {
    const res = await request(app).get('/api/v1/health');
    const timestamp = res.body.data.timestamp;

    expect(() => new Date(timestamp)).not.toThrow();
    expect(new Date(timestamp).getTime()).not.toBeNaN();
  });
});

describe('GET /api/v1/nicht-vorhanden', () => {
  it('gibt 404 für unbekannte Endpunkte zurück', async () => {
    const res = await request(app).get('/api/v1/nicht-vorhanden');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
