/**
 * @file apps/api/src/modules/personen/personen.validators.ts
 */
import { z } from 'zod';

export const CreatePersonSchema = z.object({
  typ: z.enum(['FAHRER', 'BEIFAHRER', 'FUSSGAENGER', 'ZEUGE', 'VERLETZTE']),
  vorname: z.string().min(1).max(100),
  nachname: z.string().min(1).max(100),
  geburtsdatum: z.string().datetime().optional().nullable(),
  strasse: z.string().max(255).optional().nullable(),
  plz: z.string().max(10).optional().nullable(),
  stadt: z.string().max(100).optional().nullable(),
  telefon: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  fuehrerschein: z.string().max(100).optional().nullable(),
  fuehrerscheinklasse: z.string().max(50).optional().nullable(),
  zeugenaussage: z.string().optional().nullable(),
  fahrzeugId: z.string().cuid().optional().nullable(),
});

export const UpdatePersonSchema = CreatePersonSchema.partial();

export type CreatePersonDto = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonDto = z.infer<typeof UpdatePersonSchema>;
