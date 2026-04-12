/**
 * @file apps/api/src/modules/aufgaben/aufgaben.validators.ts
 */
import { z } from 'zod';

export const CreateAufgabeSchema = z.object({
  titel: z.string().trim().min(1).max(500),
  erledigt: z.coerce.boolean().default(false),
  faelligAm: z.string().trim().datetime().optional().nullable(),
  prioritaet: z.enum(['NIEDRIG', 'NORMAL', 'HOCH', 'KRITISCH']).default('NORMAL'),
  zugewiesen: z.string().trim().max(100).optional().nullable(),
});

export const UpdateAufgabeSchema = CreateAufgabeSchema.partial();

export type CreateAufgabeDto = z.infer<typeof CreateAufgabeSchema>;
export type UpdateAufgabeDto = z.infer<typeof UpdateAufgabeSchema>;
