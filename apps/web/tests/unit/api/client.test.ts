/**
 * Unit-Tests für apps/web/src/lib/api/client.ts
 */

import { apiClient, ApiClientError } from '@/lib/api/client';

// fetch global mocken
const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockSuccess<T>(data: T) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data }),
  });
}

function mockError(status: number, code: string, message: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ success: false, error: { code, message } }),
  });
}

describe('apiClient.get', () => {
  beforeEach(() => mockFetch.mockClear());

  it('führt GET-Request durch und gibt data zurück', async () => {
    mockSuccess({ id: '1', name: 'Test' });

    const result = await apiClient.get<{ id: string; name: string }>('/test');

    expect(result).toEqual({ id: '1', name: 'Test' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('wirft ApiClientError bei Fehlerresponse', async () => {
    mockError(404, 'NOT_FOUND', 'Ressource nicht gefunden');

    await expect(apiClient.get('/test')).rejects.toThrow(ApiClientError);
  });

  it('setzt statusCode und code auf ApiClientError', async () => {
    mockError(404, 'NOT_FOUND', 'Ressource nicht gefunden');

    try {
      await apiClient.get('/test');
      fail('Kein Fehler geworfen');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiClientError);
      const err = e as ApiClientError;
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Ressource nicht gefunden');
    }
  });
});

describe('apiClient.post', () => {
  beforeEach(() => mockFetch.mockClear());

  it('führt POST-Request mit JSON-Body durch', async () => {
    mockSuccess({ id: '1', titel: 'Test' });

    await apiClient.post('/gutachten', { titel: 'Test' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/gutachten'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ titel: 'Test' }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });
});

describe('apiClient.patch', () => {
  beforeEach(() => mockFetch.mockClear());

  it('führt PATCH-Request mit JSON-Body durch', async () => {
    mockSuccess({ id: '1', titel: 'Geändert' });

    await apiClient.patch('/gutachten/1', { titel: 'Geändert' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/gutachten/1'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('apiClient.delete', () => {
  beforeEach(() => mockFetch.mockClear());

  it('führt DELETE-Request durch', async () => {
    mockSuccess({ message: 'Gelöscht' });

    await apiClient.delete('/gutachten/1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/gutachten/1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('ApiClientError', () => {
  it('hat korrekte Eigenschaften', () => {
    const err = new ApiClientError(422, 'VALIDATION_ERROR', 'Pflichtfeld fehlt');
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Pflichtfeld fehlt');
    expect(err.name).toBe('ApiClientError');
    expect(err).toBeInstanceOf(Error);
  });
});
