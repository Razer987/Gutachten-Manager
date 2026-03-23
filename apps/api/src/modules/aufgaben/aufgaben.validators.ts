/**
 * @file apps/api/src/modules/aufgaben/aufgaben.validators.ts
 */
import { z } from 'zod';

export const CreateAufgabeSchema = z.object({
  titel: z.string().min(1).max(500),
  erledigt: z.coerce.boolean().default(false),
  faelligAm: z.string().datetime().optional().nullable(),
  prioritaet: z.enum(['NIEDRIG', 'NORMAL', 'HOCH', 'KRITISCH']).default('NORMAL'),
  zugewiesen: z.string().max(100).optional().nullable(),
});

export const UpdateAufgabeSchema = CreateAufgabeSchema.partial();

export type CreateAufgabeDto = z.infer<typeof CreateAufgabeSchema>;
export type UpdateAufgabeDto = z.infer<typeof UpdateAufgabeSchema>;
