/**
 * Unit-Tests für apps/api/src/lib/pagination.ts
 */

import { createPaginationMeta, parsePagination } from '@/lib/pagination';

describe('parsePagination', () => {
  it('gibt Standardwerte zurück wenn keine Parameter übergeben', () => {
    const result = parsePagination();
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it('berechnet skip korrekt (page 2, pageSize 20)', () => {
    const result = parsePagination(2, 20);
    expect(result.skip).toBe(20);
    expect(result.take).toBe(20);
  });

  it('berechnet skip korrekt (page 3, pageSize 10)', () => {
    const result = parsePagination(3, 10);
    expect(result.skip).toBe(20);
    expect(result.take).toBe(10);
  });

  it('begrenzt pageSize auf maximal 100', () => {
    const result = parsePagination(1, 999);
    expect(result.pageSize).toBe(100);
    expect(result.take).toBe(100);
  });

  it('stellt sicher dass page mindestens 1 ist', () => {
    const result = parsePagination(0);
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('behandelt negative Werte als Seite 1', () => {
    const result = parsePagination(-5);
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('behandelt ungültige Strings als Standardwerte', () => {
    const result = parsePagination('abc', 'xyz');
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('akzeptiert Strings als Parameter', () => {
    const result = parsePagination('2', '10');
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.skip).toBe(10);
  });

  it('stellt sicher dass pageSize mindestens 1 ist', () => {
    const result = parsePagination(1, 0);
    expect(result.pageSize).toBe(1);
  });
});

describe('createPaginationMeta', () => {
  it('berechnet totalPages korrekt', () => {
    const params = parsePagination(1, 20);
    const meta = createPaginationMeta(100, params);
    expect(meta.totalPages).toBe(5);
  });

  it('rundet totalPages auf', () => {
    const params = parsePagination(1, 20);
    const meta = createPaginationMeta(101, params);
    expect(meta.totalPages).toBe(6);
  });

  it('gibt 0 totalPages bei 0 Einträgen zurück', () => {
    const params = parsePagination(1, 20);
    const meta = createPaginationMeta(0, params);
    expect(meta.totalPages).toBe(0);
    expect(meta.total).toBe(0);
  });

  it('gibt korrekte page und pageSize zurück', () => {
    const params = parsePagination(3, 15);
    const meta = createPaginationMeta(100, params);
    expect(meta.page).toBe(3);
    expect(meta.pageSize).toBe(15);
    expect(meta.total).toBe(100);
    expect(meta.totalPages).toBe(7);
  });

  it('gibt 1 totalPage bei total === pageSize zurück', () => {
    const params = parsePagination(1, 20);
    const meta = createPaginationMeta(20, params);
    expect(meta.totalPages).toBe(1);
  });
});
