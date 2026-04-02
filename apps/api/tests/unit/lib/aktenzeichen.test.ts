/**
 * Unit-Tests für apps/api/src/lib/aktenzeichen.ts
 */

import { validiereAktenzeichen, generiereAktenzeichen } from '@/lib/aktenzeichen';
import { prisma } from '@gutachten/database';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('validiereAktenzeichen', () => {
  it('gibt true für gültige Aktenzeichen zurück', () => {
    expect(validiereAktenzeichen('GA-2026-001')).toBe(true);
    expect(validiereAktenzeichen('ABC')).toBe(true);
    expect(validiereAktenzeichen('12345')).toBe(true);
    expect(validiereAktenzeichen('GA-2026-999')).toBe(true);
  });

  it('gibt false für zu kurze Aktenzeichen zurück', () => {
    expect(validiereAktenzeichen('')).toBe(false);
    expect(validiereAktenzeichen('AB')).toBe(false);
    expect(validiereAktenzeichen('  ')).toBe(false);
  });

  it('gibt false für zu lange Aktenzeichen zurück (> 50 Zeichen)', () => {
    const lang = 'A'.repeat(51);
    expect(validiereAktenzeichen(lang)).toBe(false);
  });

  it('akzeptiert Aktenzeichen mit genau 50 Zeichen', () => {
    const genau50 = 'A'.repeat(50);
    expect(validiereAktenzeichen(genau50)).toBe(true);
  });

  it('akzeptiert Aktenzeichen mit genau 3 Zeichen', () => {
    expect(validiereAktenzeichen('ABC')).toBe(true);
  });
});

describe('generiereAktenzeichen', () => {
  const aktuellesJahr = new Date().getFullYear();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generiert GA-JJJJ-001 wenn noch kein Gutachten existiert', async () => {
    mockPrisma.gutachten.findFirst.mockResolvedValue(null);

    const ergebnis = await generiereAktenzeichen();

    expect(ergebnis).toBe(`GA-${aktuellesJahr}-001`);
  });

  it('inkrementiert die Nummer beim letzten Gutachten', async () => {
    mockPrisma.gutachten.findFirst.mockResolvedValue({
      aktenzeichen: `GA-${aktuellesJahr}-042`,
    } as any);

    const ergebnis = await generiereAktenzeichen();

    expect(ergebnis).toBe(`GA-${aktuellesJahr}-043`);
  });

  it('füllt die Nummer auf 3 Stellen auf', async () => {
    mockPrisma.gutachten.findFirst.mockResolvedValue({
      aktenzeichen: `GA-${aktuellesJahr}-009`,
    } as any);

    const ergebnis = await generiereAktenzeichen();

    expect(ergebnis).toBe(`GA-${aktuellesJahr}-010`);
  });

  it('verwendet das aktuelle Jahr im Präfix', async () => {
    mockPrisma.gutachten.findFirst.mockResolvedValue(null);

    const ergebnis = await generiereAktenzeichen();

    expect(ergebnis).toMatch(new RegExp(`^GA-${aktuellesJahr}-\\d{3,}$`));
  });

  it('sucht nur nach Gutachten des aktuellen Jahres', async () => {
    mockPrisma.gutachten.findFirst.mockResolvedValue(null);

    await generiereAktenzeichen();

    expect(mockPrisma.gutachten.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          aktenzeichen: {
            startsWith: `GA-${aktuellesJahr}-`,
          },
        },
      }),
    );
  });

  it('behandelt eine vierstellige Nummer korrekt', async () => {
    mockPrisma.gutachten.findFirst.mockResolvedValue({
      aktenzeichen: `GA-${aktuellesJahr}-999`,
    } as any);

    const ergebnis = await generiereAktenzeichen();

    expect(ergebnis).toBe(`GA-${aktuellesJahr}-1000`);
  });
});
