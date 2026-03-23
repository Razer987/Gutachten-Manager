/**
 * @file apps/api/src/modules/gutachten/gutachten.validators.ts
 * @description Zod-Validierungsschemas für Gutachten-Requests.
 *
 * Jeder API-Endpunkt hat ein eigenes Schema.
 * Zod validiert die Eingaben und gibt typisierte Objekte zurück.
 *
 * Wichtig: Validierung findet auf BEIDEN Seiten statt:
 *   1. Frontend (React Hook Form + Zod): sofortiges Feedback für den User
 *   2. Backend (diese Datei): Sicherheits-Validierung, API ist niemals vertrauenswürdig
 */

import { z } from 'zod';

/** Status-Werte (muss mit Prisma-Enum übereinstimmen) */
const GutachtenStatusEnum = z.enum([
  'AUFGENOMMEN',
  'BEAUFTRAGT',
  'BESICHTIGUNG',
  'ENTWURF',
  'FREIGABE',
  'FERTIG',
  'ARCHIV',
]);

/** Schema für neues Gutachten (POST /api/v1/gutachten) */
export const CreateGutachtenSchema = z.object({
  titel: z
    .string()
    .min(3, 'Titel muss mindestens 3 Zeichen lang sein')
    .max(200, 'Titel darf maximal 200 Zeichen lang sein'),

  beschreibung: z.string().optional(),

  aktenzeichen: z
    .string()
    .min(3, 'Aktenzeichen muss mindestens 3 Zeichen lang sein')
    .max(50)
    .optional(), // Optional — wird auto-generiert wenn nicht angegeben

  status: GutachtenStatusEnum.default('AUFGENOMMEN'),

  frist: z
    .string()
    .datetime({ message: 'Frist muss ein gültiges Datum sein (ISO 8601)' })
    .optional()
    .nullable(),

  auftragsdatum: z.string().datetime().optional().nullable(),

  kundeId: z.string().cuid({ message: 'Ungültige Kunden-ID' }).optional().nullable(),

  gutachterId: z.string().cuid({ message: 'Ungültige Gutachter-ID' }).optional().nullable(),
});

/** Schema für Gutachten bearbeiten (PATCH /api/v1/gutachten/:id) */
export const UpdateGutachtenSchema = CreateGutachtenSchema.partial();

/** Schema für Status-Änderung (PATCH /api/v1/gutachten/:id/status) */
export const UpdateStatusSchema = z.object({
  status: GutachtenStatusEnum,
  kommentar: z.string().max(500).optional(),
});

/** Schema für Gutachten-Verknüpfung */
export const VerknuepfungSchema = z.object({
  gutachtenId: z.string().cuid({ message: 'Ungültige Gutachten-ID' }),
});

/** Schema für Filter-/Such-Parameter (GET /api/v1/gutachten) */
export const GutachtenListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: GutachtenStatusEnum.optional(),
  kundeId: z.string().cuid().optional(),
  gutachterId: z.string().cuid().optional(),
  suche: z.string().max(200).optional(),
  sortBy: z.enum(['aktenzeichen', 'titel', 'status', 'frist', 'createdAt', 'updatedAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  // Fristen-Filter
  fristBis: z.string().datetime().optional(),
  fristVon: z.string().datetime().optional(),
  // Nur überfällige anzeigen
  ueberfaellig: z.coerce.boolean().optional(),
});

// Typen exportieren für Verwendung in Controller und Service
export type CreateGutachtenDto = z.infer<typeof CreateGutachtenSchema>;
export type UpdateGutachtenDto = z.infer<typeof UpdateGutachtenSchema>;
export type UpdateStatusDto = z.infer<typeof UpdateStatusSchema>;
export type GutachtenListQuery = z.infer<typeof GutachtenListQuerySchema>;
