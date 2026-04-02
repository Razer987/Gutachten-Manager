/**
 * Unit-Tests für packages/shared/src/utils/currency.utils.ts
 */

import { formatEuro, euroZuCents, centsZuEuro, summiereSchaeden } from '@gutachten/shared';

describe('formatEuro', () => {
  it('formatiert Centbetrag korrekt zu Euro-String', () => {
    const result = formatEuro(150000); // 1500,00 €
    expect(result).toContain('1.500,00');
    expect(result).toContain('€');
  });

  it('formatiert 0 Cent korrekt', () => {
    const result = formatEuro(0);
    expect(result).toContain('0,00');
  });

  it('gibt — für null zurück', () => {
    expect(formatEuro(null)).toBe('–');
  });

  it('gibt — für undefined zurück', () => {
    expect(formatEuro(undefined)).toBe('–');
  });

  it('formatiert große Beträge mit Tausendertrennzeichen', () => {
    const result = formatEuro(100000000); // 1.000.000,00 €
    expect(result).toContain('1.000.000,00');
  });
});

describe('euroZuCents', () => {
  it('wandelt Euro-Dezimalzahl korrekt in Cents um', () => {
    expect(euroZuCents(1500.5)).toBe(150050);
    expect(euroZuCents(0)).toBe(0);
    expect(euroZuCents(1)).toBe(100);
  });

  it('rundet Fließkomma-Fehler korrekt', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS
    expect(euroZuCents(0.1 + 0.2)).toBe(30);
  });
});

describe('centsZuEuro', () => {
  it('wandelt Cents korrekt in Euro zurück', () => {
    expect(centsZuEuro(150050)).toBe(1500.5);
    expect(centsZuEuro(0)).toBe(0);
    expect(centsZuEuro(100)).toBe(1);
  });
});

describe('summiereSchaeden', () => {
  it('summiert mehrere Schadensposten', () => {
    const posten = [
      { betragCents: 10000 },
      { betragCents: 25000 },
      { betragCents: 5000 },
    ];
    expect(summiereSchaeden(posten)).toBe(40000);
  });

  it('gibt 0 für leere Liste zurück', () => {
    expect(summiereSchaeden([])).toBe(0);
  });

  it('gibt Einzelwert für ein Element zurück', () => {
    expect(summiereSchaeden([{ betragCents: 99900 }])).toBe(99900);
  });
});
