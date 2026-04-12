/**
 * @file apps/api/src/modules/schaden/schaden.validators.ts
 */
import { z } from 'zod';

export const CreateSchadenspostenSchema = z.object({
  position: z.coerce.number().int().min(1),
  bezeichnung: z.string().trim().min(1).max(500),
  beschreibung: z.string().trim().optional().nullable(),
  betragCents: z.coerce.number().int().min(0),
  kategorie: z.string().trim().min(1).max(100),
});

export const UpdateSchadenspostenSchema = CreateSchadenspostenSchema.partial();

export type CreateSchadenspostenDto = z.infer<typeof CreateSchadenspostenSchema>;
export type UpdateSchadenspostenDto = z.infer<typeof UpdateSchadenspostenSchema>;
