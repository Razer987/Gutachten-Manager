/**
 * @file apps/api/src/modules/personen/personen.validators.ts
 */
import { z } from 'zod';

export const CreatePersonSchema = z.object({
  typ: z.enum(['FAHRER', 'BEIFAHRER', 'FUSSGAENGER', 'ZEUGE', 'VERLETZTE']),
  vorname: z.string().trim().min(1).max(100),
  nachname: z.string().trim().min(1).max(100),
  geburtsdatum: z.string().trim().datetime().optional().nullable(),
  strasse: z.string().trim().max(255).optional().nullable(),
  plz: z.string().trim().max(10).optional().nullable(),
  stadt: z.string().trim().max(100).optional().nullable(),
  telefon: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email().max(255).optional().nullable(),
  fuehrerschein: z.string().trim().max(100).optional().nullable(),
  fuehrerscheinklasse: z.string().trim().max(50).optional().nullable(),
  zeugenaussage: z.string().trim().optional().nullable(),
  fahrzeugId: z.string().trim().cuid().optional().nullable(),
});

export const UpdatePersonSchema = CreatePersonSchema.partial();

export type CreatePersonDto = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonDto = z.infer<typeof UpdatePersonSchema>;
