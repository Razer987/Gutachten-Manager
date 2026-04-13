/**
 * @file apps/web/src/lib/api/client.ts
 * @description Typisierter API-Client für alle Backend-Anfragen.
 *
 * Kapselt alle fetch()-Aufrufe und stellt sicher dass:
 *   - Die Basis-URL aus Umgebungsvariablen kommt
 *   - Fehler einheitlich behandelt werden
 *   - TypeScript-Typen korrekt sind
 *   - Lange Requests ordentlich abgebrochen werden (AbortSignal)
 *
 * Verwendung:
 *   import { apiClient } from '@/lib/api/client'
 *   const gutachten = await apiClient.get<Gutachten[]>('/gutachten')
 */

import type { ApiResponse } from '@gutachten/shared';

const API_BASE_URL =
  process.env['NEXT_PUBLIC_API_URL'] ?? '/api/v1';

/** Konfigurationsoptionen für API-Anfragen */
interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** Fehler der vom API-Client geworfen wird */
export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Führt eine typisierte API-Anfrage durch.
 * @throws ApiClientError bei HTTP-Fehler
 */
async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options.signal,
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success) {
    throw new ApiClientError(
      response.status,
      data.error.code,
      data.error.message,
    );
  }

  return data.data;
}

/** Upload-Anfrage (multipart/form-data) */
async function upload<T>(
  endpoint: string,
  formData: FormData,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    // Kein Content-Type Header — Browser setzt ihn automatisch mit Boundary
    body: formData,
    signal: options.signal,
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success) {
    throw new ApiClientError(
      response.status,
      data.error.code,
      data.error.message,
    );
  }

  return data.data;
}

/** Typisierter API-Client */
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>('GET', endpoint, undefined, options),

  post: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>('POST', endpoint, body, options),

  put: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>('PUT', endpoint, body, options),

  patch: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>('PATCH', endpoint, body, options),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>('DELETE', endpoint, undefined, options),

  upload: <T>(endpoint: string, formData: FormData, options?: RequestOptions) =>
    upload<T>(endpoint, formData, options),
};
