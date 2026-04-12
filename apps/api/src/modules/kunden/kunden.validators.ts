/**
 * @file apps/api/src/modules/kunden/kunden.validators.ts
 */
import { z } from 'zod';

export const CreateKundeSchema = z.object({
  vorname: z.string().trim().min(1).max(100).optional().nullable(),
  nachname: z.string().trim().min(1, 'Nachname ist erforderlich').max(200),
  firma: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().email('Ungültige E-Mail').max(255).optional().nullable(),
  telefon: z.string().trim().max(50).optional().nullable(),
  mobil: z.string().trim().max(50).optional().nullable(),
  strasse: z.string().trim().max(255).optional().nullable(),
  plz: z.string().trim().max(10).optional().nullable(),
  stadt: z.string().trim().max(100).optional().nullable(),
  land: z.string().trim().max(100).default('Deutschland'),
  notizen: z.string().trim().optional().nullable(),
});

export const UpdateKundeSchema = CreateKundeSchema.partial();

export const KundenListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  suche: z.string().trim().max(200).optional(),
  sortBy: z.enum(['nachname', 'vorname', 'email', 'createdAt']).default('nachname'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

export const KontaktHistorieSchema = z.object({
  art: z.string().trim().min(1).max(50),
  inhalt: z.string().trim().min(1, 'Inhalt ist erforderlich'),
  bearbeiter: z.string().trim().max(100).optional().nullable(),
  kontaktDat: z.string().trim().datetime().optional(),
});

export type CreateKundeDto = z.infer<typeof CreateKundeSchema>;
export type UpdateKundeDto = z.infer<typeof UpdateKundeSchema>;
export type KundenListQuery = z.infer<typeof KundenListQuerySchema>;
export type KontaktHistorieDto = z.infer<typeof KontaktHistorieSchema>;
