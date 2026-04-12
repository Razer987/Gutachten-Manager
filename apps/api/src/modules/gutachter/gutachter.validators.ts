/**
 * @file apps/api/src/modules/gutachter/gutachter.validators.ts
 */
import { z } from 'zod';

export const CreateGutachterSchema = z.object({
  vorname: z.string().trim().min(1).max(100),
  nachname: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255).optional().nullable(),
  telefon: z.string().trim().max(50).optional().nullable(),
  fachgebiet: z.string().trim().max(500).optional().nullable(),
});

export const UpdateGutachterSchema = CreateGutachterSchema.partial();

export const GutachterListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  suche: z.string().trim().max(200).optional(),
});

export type CreateGutachterDto = z.infer<typeof CreateGutachterSchema>;
export type UpdateGutachterDto = z.infer<typeof UpdateGutachterSchema>;
export type GutachterListQuery = z.infer<typeof GutachterListQuerySchema>;
