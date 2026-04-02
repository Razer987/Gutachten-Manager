/**
 * Unit-Tests für apps/api/src/modules/gutachten/gutachten.validators.ts
 */

import {
  CreateGutachtenSchema,
  GutachtenListQuerySchema,
  UpdateStatusSchema,
} from '@/modules/gutachten/gutachten.validators';

describe('CreateGutachtenSchema', () => {
  it('validiert einen gültigen Datensatz', () => {
    const result = CreateGutachtenSchema.safeParse({
      titel: 'Unfallgutachten BMW 3er',
    });
    expect(result.success).toBe(true);
  });

  it('setzt status auf AUFGENOMMEN als Standard', () => {
    const result = CreateGutachtenSchema.parse({ titel: 'Test' });
    expect(result.status).toBe('AUFGENOMMEN');
  });

  it('lehnt Titel unter 3 Zeichen ab', () => {
    const result = CreateGutachtenSchema.safeParse({ titel: 'AB' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('3 Zeichen');
    }
  });

  it('lehnt Titel über 200 Zeichen ab', () => {
    const result = CreateGutachtenSchema.safeParse({ titel: 'A'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('akzeptiert optionale Felder', () => {
    const result = CreateGutachtenSchema.parse({
      titel: 'Test-Gutachten',
      beschreibung: 'Eine Beschreibung',
      aktenzeichen: 'GA-2026-001',
      status: 'BEAUFTRAGT',
      frist: '2026-12-31T23:59:59.000Z',
      auftragsdatum: '2026-01-15T08:00:00.000Z',
    });
    expect(result.titel).toBe('Test-Gutachten');
    expect(result.status).toBe('BEAUFTRAGT');
    expect(result.frist).toBe('2026-12-31T23:59:59.000Z');
  });

  it('akzeptiert null für frist und auftragsdatum', () => {
    const result = CreateGutachtenSchema.parse({
      titel: 'Test',
      frist: null,
      auftragsdatum: null,
    });
    expect(result.frist).toBeNull();
    expect(result.auftragsdatum).toBeNull();
  });

  it('lehnt ungültigen status ab', () => {
    const result = CreateGutachtenSchema.safeParse({
      titel: 'Test',
      status: 'UNGUELTIG',
    });
    expect(result.success).toBe(false);
  });

  it('lehnt ungültige CUID für kundeId ab', () => {
    const result = CreateGutachtenSchema.safeParse({
      titel: 'Test',
      kundeId: 'kein-cuid',
    });
    expect(result.success).toBe(false);
  });

  it('akzeptiert null für kundeId', () => {
    const result = CreateGutachtenSchema.parse({
      titel: 'Test',
      kundeId: null,
    });
    expect(result.kundeId).toBeNull();
  });
});

describe('UpdateStatusSchema', () => {
  it('validiert alle erlaubten Status-Werte', () => {
    const statusWerte = ['AUFGENOMMEN', 'BEAUFTRAGT', 'BESICHTIGUNG', 'ENTWURF', 'FREIGABE', 'FERTIG', 'ARCHIV'];
    statusWerte.forEach((status) => {
      const result = UpdateStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    });
  });

  it('akzeptiert optionalen Kommentar', () => {
    const result = UpdateStatusSchema.parse({
      status: 'BEAUFTRAGT',
      kommentar: 'Auftrag erteilt am 01.01.2026',
    });
    expect(result.kommentar).toBe('Auftrag erteilt am 01.01.2026');
  });

  it('lehnt Kommentare über 500 Zeichen ab', () => {
    const result = UpdateStatusSchema.safeParse({
      status: 'BEAUFTRAGT',
      kommentar: 'A'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('lehnt ungültigen Status ab', () => {
    const result = UpdateStatusSchema.safeParse({ status: 'OFFEN' });
    expect(result.success).toBe(false);
  });
});

describe('GutachtenListQuerySchema', () => {
  it('setzt Standardwerte', () => {
    const result = GutachtenListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.sortBy).toBe('createdAt');
    expect(result.sortDir).toBe('desc');
  });

  it('wandelt String-Nummern in Zahlen um', () => {
    const result = GutachtenListQuerySchema.parse({ page: '2', pageSize: '10' });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
  });

  it('begrenzt pageSize auf 100', () => {
    const result = GutachtenListQuerySchema.parse({ pageSize: '200' });
    expect(result.pageSize).toBe(100);
  });

  it('akzeptiert Status-Filter', () => {
    const result = GutachtenListQuerySchema.parse({ status: 'FERTIG' });
    expect(result.status).toBe('FERTIG');
  });

  it('akzeptiert ueberfaellig als Boolean-String', () => {
    const result = GutachtenListQuerySchema.parse({ ueberfaellig: 'true' });
    expect(result.ueberfaellig).toBe(true);
  });
});
