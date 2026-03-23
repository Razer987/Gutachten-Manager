/**
 * @file apps/api/src/modules/notizen/notizen.validators.ts
 */
import { z } from 'zod';

export const CreateNotizSchema = z.object({
  inhalt: z.string().min(1, 'Inhalt ist erforderlich'),
  autor: z.string().max(100).optional().nullable(),
});

export const UpdateNotizSchema = CreateNotizSchema.partial();

export type CreateNotizDto = z.infer<typeof CreateNotizSchema>;
export type UpdateNotizDto = z.infer<typeof UpdateNotizSchema>;
