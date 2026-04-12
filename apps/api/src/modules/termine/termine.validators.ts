/**
 * @file apps/api/src/modules/termine/termine.validators.ts
 */
import { z } from 'zod';

export const CreateTerminSchema = z.object({
  titel: z.string().trim().min(1).max(200),
  beschreibung: z.string().trim().optional().nullable(),
  start: z.string().trim().datetime(),
  ende: z.string().trim().datetime(),
  ort: z.string().trim().max(500).optional().nullable(),
  erinnerung: z.coerce.number().int().min(0).optional().nullable(),
  farbe: z.string().trim().max(20).optional().nullable(),
  gutachtenId: z.string().trim().cuid().optional().nullable(),
});

export const UpdateTerminSchema = z.object({
  titel: z.string().trim().min(1).max(200).optional(),
  beschreibung: z.string().trim().optional().nullable(),
  start: z.string().trim().datetime().optional(),
  ende: z.string().trim().datetime().optional(),
  ort: z.string().trim().max(500).optional().nullable(),
  erinnerung: z.coerce.number().int().min(0).optional().nullable(),
  farbe: z.string().trim().max(20).optional().nullable(),
});

export const TermineListQuerySchema = z.object({
  von: z.string().trim().datetime().optional(),
  bis: z.string().trim().datetime().optional(),
  gutachtenId: z.string().trim().cuid().optional(),
});

export type CreateTerminDto = z.infer<typeof CreateTerminSchema>;
export type UpdateTerminDto = z.infer<typeof UpdateTerminSchema>;
export type TermineListQuery = z.infer<typeof TermineListQuerySchema>;
