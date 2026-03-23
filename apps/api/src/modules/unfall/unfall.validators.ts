/**
 * @file apps/api/src/modules/unfall/unfall.validators.ts
 */
import { z } from 'zod';

export const UpsertUnfallSchema = z.object({
  unfallZeit: z.string().datetime().optional().nullable(),
  strasse: z.string().max(255).optional().nullable(),
  hausnummer: z.string().max(20).optional().nullable(),
  plz: z.string().max(10).optional().nullable(),
  stadt: z.string().max(100).optional().nullable(),
  land: z.string().max(100).default('Deutschland'),
  breitengrad: z.coerce.number().min(-90).max(90).optional().nullable(),
  laengengrad: z.coerce.number().min(-180).max(180).optional().nullable(),
  strassentyp: z.string().max(100).optional().nullable(),
  unfallHergang: z.string().optional().nullable(),
  wetterlage: z.enum(['KLAR', 'BEWOELKT', 'REGEN', 'STARKREGEN', 'SCHNEE', 'GLAETTE', 'NEBEL', 'STURM']).optional().nullable(),
  temperatur: z.coerce.number().optional().nullable(),
  sichtverhaeltnis: z.enum(['GUT', 'MITTEL', 'SCHLECHT', 'NACHT', 'DAEMMERUNG']).optional().nullable(),
  strassenzustand: z.enum(['TROCKEN', 'NASS', 'SCHNEEBEDECKT', 'VEREIST', 'VERSCHMUTZT']).optional().nullable(),
  polizeiAktenzeichen: z.string().max(100).optional().nullable(),
  polizeiDienststelle: z.string().max(255).optional().nullable(),
  polizeiEinsatznummer: z.string().max(100).optional().nullable(),
  polizeiProtokollDatum: z.string().datetime().optional().nullable(),
  lichtverhaeltnis: z.string().max(50).optional().nullable(),
});

export type UpsertUnfallDto = z.infer<typeof UpsertUnfallSchema>;
