/**
 * @file apps/api/src/modules/fahrzeuge/fahrzeuge.validators.ts
 */
import { z } from 'zod';

export const CreateFahrzeugSchema = z.object({
  kennzeichen: z.string().min(1).max(20),
  fahrgestell: z.string().max(50).optional().nullable(),
  marke: z.string().min(1).max(100),
  modell: z.string().min(1).max(100),
  baujahr: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  farbe: z.string().max(100).optional().nullable(),
  kraftstoff: z.string().max(50).optional().nullable(),
  versicherung: z.string().max(255).optional().nullable(),
  versicherungsNr: z.string().max(100).optional().nullable(),
});

export const UpdateFahrzeugSchema = CreateFahrzeugSchema.partial();

export type CreateFahrzeugDto = z.infer<typeof CreateFahrzeugSchema>;
export type UpdateFahrzeugDto = z.infer<typeof UpdateFahrzeugSchema>;
