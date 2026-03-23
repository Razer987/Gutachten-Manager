/**
 * @file apps/api/src/modules/termine/termine.validators.ts
 */
import { z } from 'zod';

export const CreateTerminSchema = z.object({
  titel: z.string().min(1).max(200),
  beschreibung: z.string().optional().nullable(),
  start: z.string().datetime(),
  ende: z.string().datetime(),
  ort: z.string().max(500).optional().nullable(),
  erinnerung: z.coerce.number().int().min(0).optional().nullable(),
  farbe: z.string().max(20).optional().nullable(),
  gutachtenId: z.string().cuid(),
});

export const UpdateTerminSchema = z.object({
  titel: z.string().min(1).max(200).optional(),
  beschreibung: z.string().optional().nullable(),
  start: z.string().datetime().optional(),
  ende: z.string().datetime().optional(),
  ort: z.string().max(500).optional().nullable(),
  erinnerung: z.coerce.number().int().min(0).optional().nullable(),
  farbe: z.string().max(20).optional().nullable(),
});

export const TermineListQuerySchema = z.object({
  von: z.string().datetime().optional(),
  bis: z.string().datetime().optional(),
  gutachtenId: z.string().cuid().optional(),
});

export type CreateTerminDto = z.infer<typeof CreateTerminSchema>;
export type UpdateTerminDto = z.infer<typeof UpdateTerminSchema>;
export type TermineListQuery = z.infer<typeof TermineListQuerySchema>;
