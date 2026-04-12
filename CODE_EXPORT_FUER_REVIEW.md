# Gutachten-Manager — Vollständiger Code-Export
# Für Code-Review mit ChatGPT / Gemini
# Generiert: 2026-04-12
# Alle relevanten Quelldateien des Projekts

================================================================================

## apps/api/src/app.ts
```typescript
/**
 * @file apps/api/src/app.ts
 * @description Express-Anwendungskonfiguration.
 *
 * Erstellt und konfiguriert die Express-App mit allen Middlewares.
 * Die App wird in server.ts gestartet (Trennung erlaubt besseres Testing).
 *
 * Middleware-Reihenfolge (WICHTIG — Reihenfolge beeinflusst Verhalten):
 *   1. Helmet      — Security-Headers
 *   2. CORS        — Cross-Origin Requests erlauben
 *   3. Compression — Gzip-Komprimierung
 *   4. Morgan      — HTTP-Request-Logging
 *   5. JSON Parser — Request-Body parsen
 *   6. Router      — Feature-Routen
 *   7. 404-Handler — Nicht gefundene Routen
 *   8. Error-Handler — Alle Fehler zentral behandeln
 */

import path from 'path';

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { errorMiddleware } from '@/middleware/error.middleware';
import { v1Router } from '@/v1/router';

const app = express();

// ---------------------------------------------------------------------------
// Security-Middleware
// ---------------------------------------------------------------------------

// Helmet: Setzt sichere HTTP-Headers (XSS-Schutz, MIME-Sniffing, etc.)
app.use(
  helmet({
    // Content-Security-Policy für API deaktivieren (Frontend macht das selbst)
    contentSecurityPolicy: false,
  }),
);

// CORS: Erlaubt Anfragen von konfigurierten Origins
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// ---------------------------------------------------------------------------
// Performance-Middleware
// ---------------------------------------------------------------------------

// Gzip-Komprimierung für alle Responses
app.use(compression());

// ---------------------------------------------------------------------------
// Request-Logging
// ---------------------------------------------------------------------------

// Morgan: Loggt alle HTTP-Anfragen (wird in production kürzer)
app.use(
  morgan(env.IS_DEVELOPMENT ? 'dev' : 'combined', {
    stream: {
      // Morgan in Winston-Logger umleiten
      write: (message: string) => logger.http(message.trim()),
    },
    // Health-Check-Requests nicht loggen (erzeugen zu viel Lärm)
    skip: (req) => req.url === '/api/v1/health',
  }),
);

// ---------------------------------------------------------------------------
// Body-Parser
// ---------------------------------------------------------------------------

// JSON-Body parsen (max. 10MB für große Rich-Text-Dokumente)
app.use(express.json({ limit: '10mb' }));

// URL-encoded Form-Daten parsen
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------------------------------------------------------------------------
// Statische Dateien (Upload-Verzeichnis)
// ---------------------------------------------------------------------------

// Hochgeladene Dateien werden direkt ausgeliefert
// URL: /uploads/<filename>
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// ---------------------------------------------------------------------------
// API-Routen
// ---------------------------------------------------------------------------

app.use('/api/v1', v1Router);

// ---------------------------------------------------------------------------
// 404-Handler (muss nach allen Routen kommen)
// ---------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpunkt nicht gefunden: ${req.method} ${req.url}`,
    },
  });
});

// ---------------------------------------------------------------------------
// Zentraler Fehler-Handler (muss als LETZTES registriert werden)
// ---------------------------------------------------------------------------

app.use(errorMiddleware);

export { app };

```

## apps/api/src/server.ts
```typescript
/**
 * @file apps/api/src/server.ts
 * @description Einstiegspunkt — startet den HTTP-Server.
 *
 * Trennung von app.ts (Express-Konfiguration) und server.ts (Serverstart)
 * ermöglicht besseres Testing (app.ts kann ohne Serverstart importiert werden).
 *
 * Startreihenfolge:
 *   1. Umgebungsvariablen validieren
 *   2. Datenbankverbindung prüfen
 *   3. Notwendige Verzeichnisse erstellen
 *   4. HTTP-Server starten
 *   5. Geplante Aufgaben starten (Backup-Cron)
 */

import fs from 'fs';
import http from 'http';
import path from 'path';

import { prisma } from '@gutachten/database';

import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { starteBackupCron } from './services/backup.service';

// ---------------------------------------------------------------------------
// Notwendige Verzeichnisse erstellen
// ---------------------------------------------------------------------------

function erstelleVerzeichnisse(): void {
  const verzeichnisse = [
    path.resolve(env.UPLOAD_DIR),
    path.resolve(env.LOG_DIR),
    path.resolve(env.BACKUP_DIR),
  ];

  for (const dir of verzeichnisse) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Verzeichnis erstellt: ${dir}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Datenbankverbindung prüfen
// ---------------------------------------------------------------------------

async function pruefeDatenbankverbindung(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Datenbankverbindung erfolgreich');
  } catch (error) {
    logger.error('Datenbankverbindung fehlgeschlagen', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Server starten
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
  // Verzeichnisse sicherstellen
  erstelleVerzeichnisse();

  // Datenbankverbindung prüfen
  await pruefeDatenbankverbindung();

  // HTTP-Server erstellen und starten
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`  Gutachten-Manager API gestartet`);
    logger.info(`  Version:     2026.03.1`);
    logger.info(`  Umgebung:    ${env.NODE_ENV}`);
    logger.info(`  Port:        ${env.PORT}`);
    logger.info(`  Health-Check: http://localhost:${env.PORT}/api/v1/health`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });

  // Backup-Cron starten
  starteBackupCron();

  // ---------------------------------------------------------------------------
  // Graceful Shutdown — Server sauber herunterfahren
  // ---------------------------------------------------------------------------

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} empfangen — Server wird beendet...`);

    server.close(async () => {
      logger.info('HTTP-Server gestoppt');

      try {
        await prisma.$disconnect();
        logger.info('Datenbankverbindung getrennt');
      } catch (error) {
        logger.error('Fehler beim Trennen der Datenbankverbindung', { error });
      }

      logger.info('Server erfolgreich beendet');
      process.exit(0);
    });

    // Erzwungenes Beenden nach 10 Sekunden
    setTimeout(() => {
      logger.error('Erzwungenes Beenden nach Timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Unbehandelte Promise-Rejections abfangen
  process.on('unhandledRejection', (reason) => {
    logger.error('Unbehandelte Promise-Rejection', { reason });
  });
}

// Server starten
start().catch((error) => {
  logger.error('Fehler beim Serverstart', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});

```

## apps/api/src/modules/fahrzeuge/fahrzeuge.controller.ts
```typescript
/**
 * @file apps/api/src/modules/fahrzeuge/fahrzeuge.controller.ts
 */
import type { Request, Response } from 'express';
import { fahrzeugeService } from './fahrzeuge.service';
import { CreateFahrzeugSchema, UpdateFahrzeugSchema } from './fahrzeuge.validators';

export const fahrzeugeController = {
  async list(req: Request, res: Response) {
    const fahrzeuge = await fahrzeugeService.list(req.params.gutachtenId);
    res.json({ success: true, data: fahrzeuge });
  },
  async findById(req: Request, res: Response) {
    const fahrzeug = await fahrzeugeService.findById(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: fahrzeug });
  },
  async create(req: Request, res: Response) {
    const dto = CreateFahrzeugSchema.parse(req.body);
    const fahrzeug = await fahrzeugeService.create(req.params.gutachtenId, dto);
    res.status(201).json({ success: true, data: fahrzeug });
  },
  async update(req: Request, res: Response) {
    const dto = UpdateFahrzeugSchema.parse(req.body);
    const fahrzeug = await fahrzeugeService.update(req.params.gutachtenId, req.params.id, dto);
    res.json({ success: true, data: fahrzeug });
  },
  async delete(req: Request, res: Response) {
    const result = await fahrzeugeService.delete(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: result });
  },
};

```

## apps/api/src/modules/fahrzeuge/fahrzeuge.routes.ts
```typescript
/**
 * @file apps/api/src/modules/fahrzeuge/fahrzeuge.routes.ts
 */
import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';
import { fahrzeugeController } from './fahrzeuge.controller';

const router = Router({ mergeParams: true });
router.get('/', asyncHandler(fahrzeugeController.list));
router.post('/', asyncHandler(fahrzeugeController.create));
router.get('/:id', asyncHandler(fahrzeugeController.findById));
router.patch('/:id', asyncHandler(fahrzeugeController.update));
router.delete('/:id', asyncHandler(fahrzeugeController.delete));
export { router as fahrzeugeRouter };

```

## apps/api/src/modules/fahrzeuge/fahrzeuge.service.ts
```typescript
/**
 * @file apps/api/src/modules/fahrzeuge/fahrzeuge.service.ts
 */
import { prisma } from '@gutachten/database';
import { notFound } from '@/middleware/error.middleware';
import type { CreateFahrzeugDto, UpdateFahrzeugDto } from './fahrzeuge.validators';

export const fahrzeugeService = {
  async list(gutachtenId: string) {
    return prisma.fahrzeug.findMany({
      where: { gutachtenId },
      orderBy: { createdAt: 'asc' },
      include: { personen: { select: { id: true, vorname: true, nachname: true, typ: true } } },
    });
  },

  async findById(gutachtenId: string, id: string) {
    const fahrzeug = await prisma.fahrzeug.findFirst({
      where: { id, gutachtenId },
      include: { personen: true },
    });
    if (!fahrzeug) { throw notFound('Fahrzeug', id); }
    return fahrzeug;
  },

  async create(gutachtenId: string, dto: CreateFahrzeugDto) {
    const gutachten = await prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }
    return prisma.fahrzeug.create({ data: { gutachtenId, ...dto } });
  },

  async update(gutachtenId: string, id: string, dto: UpdateFahrzeugDto) {
    const existing = await prisma.fahrzeug.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Fahrzeug', id); }
    return prisma.fahrzeug.update({ where: { id }, data: dto });
  },

  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.fahrzeug.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Fahrzeug', id); }
    await prisma.fahrzeug.delete({ where: { id } });
    return { message: 'Fahrzeug wurde gelöscht.' };
  },
};

```

## apps/api/src/modules/fahrzeuge/fahrzeuge.validators.ts
```typescript
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

```

## apps/api/src/modules/suche/suche.controller.ts
```typescript
/**
 * @file apps/api/src/modules/suche/suche.controller.ts
 */
import { z } from 'zod';
import type { Request, Response } from 'express';

import { sucheService } from './suche.service';

const SucheQuerySchema = z.object({
  q: z.string().min(1).max(200),
});

export const sucheController = {
  async suche(req: Request, res: Response) {
    const { q } = SucheQuerySchema.parse(req.query);
    const result = await sucheService.suche(q);
    res.json({ success: true, data: result });
  },
};

```

## apps/api/src/modules/suche/suche.routes.ts
```typescript
/**
 * @file apps/api/src/modules/suche/suche.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';

import { sucheController } from './suche.controller';

const router = Router();

router.get('/', asyncHandler(sucheController.suche));

export { router as sucheRouter };

```

## apps/api/src/modules/suche/suche.service.ts
```typescript
/**
 * @file apps/api/src/modules/suche/suche.service.ts
 */
import { prisma } from '@gutachten/database';

export const sucheService = {
  async suche(q: string) {
    if (q.length < 2) { return { gutachten: [], kunden: [], gutachter: [] }; }

    const [gutachten, kunden, gutachter] = await Promise.all([
      prisma.gutachten.findMany({
        where: {
          OR: [
            { titel: { contains: q, mode: 'insensitive' } },
            { aktenzeichen: { contains: q, mode: 'insensitive' } },
            { beschreibung: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, aktenzeichen: true, titel: true, status: true },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.kunde.findMany({
        where: {
          OR: [
            { nachname: { contains: q, mode: 'insensitive' } },
            { vorname: { contains: q, mode: 'insensitive' } },
            { firma: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, vorname: true, nachname: true, firma: true, email: true },
        take: 10,
        orderBy: { nachname: 'asc' },
      }),
      prisma.gutachter.findMany({
        where: {
          OR: [
            { nachname: { contains: q, mode: 'insensitive' } },
            { vorname: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, vorname: true, nachname: true, email: true },
        take: 10,
        orderBy: { nachname: 'asc' },
      }),
    ]);

    const total = gutachten.length + kunden.length + gutachter.length;
    return { gutachten, kunden, gutachter, total };
  },
};

```

## apps/api/src/modules/admin/admin.controller.ts
```typescript
/**
 * @file apps/api/src/modules/admin/admin.controller.ts
 */
import { z } from 'zod';
import type { Request, Response } from 'express';

import { adminService } from './admin.service';

const ToggleFlagSchema = z.object({
  aktiv: z.boolean(),
});

export const adminController = {
  async getFeatureFlags(_req: Request, res: Response) {
    const flags = await adminService.getFeatureFlags();
    res.json({ success: true, data: flags });
  },

  async toggleFeatureFlag(req: Request, res: Response) {
    const { aktiv } = ToggleFlagSchema.parse(req.body);
    const flag = await adminService.toggleFeatureFlag(req.params.name, aktiv);
    res.json({ success: true, data: flag });
  },
};

```

## apps/api/src/modules/admin/admin.routes.ts
```typescript
/**
 * @file apps/api/src/modules/admin/admin.routes.ts
 */
import { Router } from 'express';
import type { Request, Response } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';
import { erstelleBackup, listeBackups } from '@/services/backup.service';

import { adminController } from './admin.controller';

const router = Router();

router.get('/feature-flags', asyncHandler(adminController.getFeatureFlags));
router.patch('/feature-flags/:name', asyncHandler(adminController.toggleFeatureFlag));

// Backup-Endpunkte
router.get(
  '/backups',
  asyncHandler(async (_req: Request, res: Response) => {
    const backups = listeBackups();
    res.json({ success: true, data: backups });
  }),
);

router.post(
  '/backups',
  asyncHandler(async (_req: Request, res: Response) => {
    await erstelleBackup();
    res.json({ success: true, data: { message: 'Backup erfolgreich erstellt.' } });
  }),
);

export { router as adminRouter };

```

## apps/api/src/modules/admin/admin.service.ts
```typescript
/**
 * @file apps/api/src/modules/admin/admin.service.ts
 */
import { prisma } from '@gutachten/database';

export const adminService = {
  async getFeatureFlags() {
    return prisma.featureFlag.findMany({ orderBy: { name: 'asc' } });
  },

  async toggleFeatureFlag(name: string, aktiv: boolean) {
    return prisma.featureFlag.upsert({
      where: { name },
      create: { name, aktiv },
      update: { aktiv },
    });
  },
};

```

## apps/api/src/modules/gutachter/gutachter.controller.ts
```typescript
/**
 * @file apps/api/src/modules/gutachter/gutachter.controller.ts
 */
import type { Request, Response } from 'express';

import { gutachterService } from './gutachter.service';
import { CreateGutachterSchema, GutachterListQuerySchema, UpdateGutachterSchema } from './gutachter.validators';

export const gutachterController = {
  async list(req: Request, res: Response) {
    const query = GutachterListQuerySchema.parse(req.query);
    const result = await gutachterService.list(query);
    res.json({ success: true, data: result });
  },

  async findById(req: Request, res: Response) {
    const gutachter = await gutachterService.findById(req.params.id);
    res.json({ success: true, data: gutachter });
  },

  async create(req: Request, res: Response) {
    const dto = CreateGutachterSchema.parse(req.body);
    const gutachter = await gutachterService.create(dto);
    res.status(201).json({ success: true, data: gutachter });
  },

  async update(req: Request, res: Response) {
    const dto = UpdateGutachterSchema.parse(req.body);
    const gutachter = await gutachterService.update(req.params.id, dto);
    res.json({ success: true, data: gutachter });
  },

  async delete(req: Request, res: Response) {
    const result = await gutachterService.delete(req.params.id);
    res.json({ success: true, data: result });
  },
};

```

## apps/api/src/modules/gutachter/gutachter.routes.ts
```typescript
/**
 * @file apps/api/src/modules/gutachter/gutachter.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';

import { gutachterController } from './gutachter.controller';

const router = Router();

router.get('/', asyncHandler(gutachterController.list));
router.post('/', asyncHandler(gutachterController.create));
router.get('/:id', asyncHandler(gutachterController.findById));
router.patch('/:id', asyncHandler(gutachterController.update));
router.delete('/:id', asyncHandler(gutachterController.delete));

export { router as gutachterRouter };

```

## apps/api/src/modules/gutachter/gutachter.service.ts
```typescript
/**
 * @file apps/api/src/modules/gutachter/gutachter.service.ts
 */
import { prisma, type Prisma } from '@gutachten/database';

import { createPaginationMeta, parsePagination } from '@/lib/pagination';
import { notFound } from '@/middleware/error.middleware';

import type { CreateGutachterDto, GutachterListQuery, UpdateGutachterDto } from './gutachter.validators';

export const gutachterService = {
  async list(query: GutachterListQuery) {
    const pagination = parsePagination(query.page, query.pageSize);
    const where: Prisma.GutachterWhereInput = {};

    if (query.suche) {
      where.OR = [
        { nachname: { contains: query.suche, mode: 'insensitive' } },
        { vorname: { contains: query.suche, mode: 'insensitive' } },
        { email: { contains: query.suche, mode: 'insensitive' } },
      ];
    }

    const [gutachter, total] = await Promise.all([
      prisma.gutachter.findMany({
        where,
        orderBy: { nachname: 'asc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.gutachter.count({ where }),
    ]);

    return { gutachter, meta: createPaginationMeta(total, pagination) };
  },

  async findById(id: string) {
    const gutachter = await prisma.gutachter.findUnique({
      where: { id },
      include: {
        gutachten: {
          select: { id: true, aktenzeichen: true, titel: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!gutachter) { throw notFound('Gutachter', id); }
    return gutachter;
  },

  async create(dto: CreateGutachterDto) {
    return prisma.gutachter.create({ data: dto });
  },

  async update(id: string, dto: UpdateGutachterDto) {
    const existing = await prisma.gutachter.findUnique({ where: { id }, select: { id: true } });
    if (!existing) { throw notFound('Gutachter', id); }
    return prisma.gutachter.update({ where: { id }, data: dto });
  },

  async delete(id: string) {
    const existing = await prisma.gutachter.findUnique({ where: { id }, select: { id: true, nachname: true } });
    if (!existing) { throw notFound('Gutachter', id); }
    await prisma.gutachter.delete({ where: { id } });
    return { message: `Gutachter "${existing.nachname}" wurde gelöscht.` };
  },
};

```

## apps/api/src/modules/gutachter/gutachter.validators.ts
```typescript
/**
 * @file apps/api/src/modules/gutachter/gutachter.validators.ts
 */
import { z } from 'zod';

export const CreateGutachterSchema = z.object({
  vorname: z.string().min(1).max(100),
  nachname: z.string().min(1).max(100),
  email: z.string().email().max(255).optional().nullable(),
  telefon: z.string().max(50).optional().nullable(),
  fachgebiet: z.string().max(500).optional().nullable(),
});

export const UpdateGutachterSchema = CreateGutachterSchema.partial();

export const GutachterListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  suche: z.string().max(200).optional(),
});

export type CreateGutachterDto = z.infer<typeof CreateGutachterSchema>;
export type UpdateGutachterDto = z.infer<typeof UpdateGutachterSchema>;
export type GutachterListQuery = z.infer<typeof GutachterListQuerySchema>;

```

## apps/api/src/modules/notizen/notizen.controller.ts
```typescript
/**
 * @file apps/api/src/modules/notizen/notizen.controller.ts
 */
import type { Request, Response } from 'express';
import { notizenService } from './notizen.service';
import { CreateNotizSchema, UpdateNotizSchema } from './notizen.validators';

export const notizenController = {
  async list(req: Request, res: Response) {
    const notizen = await notizenService.list(req.params.gutachtenId);
    res.json({ success: true, data: notizen });
  },
  async create(req: Request, res: Response) {
    const dto = CreateNotizSchema.parse(req.body);
    const notiz = await notizenService.create(req.params.gutachtenId, dto);
    res.status(201).json({ success: true, data: notiz });
  },
  async update(req: Request, res: Response) {
    const dto = UpdateNotizSchema.parse(req.body);
    const notiz = await notizenService.update(req.params.gutachtenId, req.params.id, dto);
    res.json({ success: true, data: notiz });
  },
  async delete(req: Request, res: Response) {
    const result = await notizenService.delete(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: result });
  },
};

```

## apps/api/src/modules/notizen/notizen.routes.ts
```typescript
/**
 * @file apps/api/src/modules/notizen/notizen.routes.ts
 */
import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';
import { notizenController } from './notizen.controller';

const router = Router({ mergeParams: true });
router.get('/', asyncHandler(notizenController.list));
router.post('/', asyncHandler(notizenController.create));
router.patch('/:id', asyncHandler(notizenController.update));
router.delete('/:id', asyncHandler(notizenController.delete));
export { router as notizenRouter };

```

## apps/api/src/modules/notizen/notizen.service.ts
```typescript
/**
 * @file apps/api/src/modules/notizen/notizen.service.ts
 */
import { prisma } from '@gutachten/database';
import { notFound } from '@/middleware/error.middleware';
import type { CreateNotizDto, UpdateNotizDto } from './notizen.validators';

export const notizenService = {
  async list(gutachtenId: string) {
    return prisma.notiz.findMany({
      where: { gutachtenId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(gutachtenId: string, dto: CreateNotizDto) {
    const gutachten = await prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }
    return prisma.notiz.create({ data: { gutachtenId, ...dto } });
  },

  async update(gutachtenId: string, id: string, dto: UpdateNotizDto) {
    const existing = await prisma.notiz.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Notiz', id); }
    return prisma.notiz.update({ where: { id }, data: dto });
  },

  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.notiz.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Notiz', id); }
    await prisma.notiz.delete({ where: { id } });
    return { message: 'Notiz wurde gelöscht.' };
  },
};

```

## apps/api/src/modules/notizen/notizen.validators.ts
```typescript
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

```

## apps/api/src/modules/audit/audit.controller.ts
```typescript
/**
 * @file apps/api/src/modules/audit/audit.controller.ts
 */
import type { Request, Response } from 'express';

import { auditService } from './audit.service';

export const auditController = {
  async list(req: Request, res: Response) {
    const logs = await auditService.list(req.params.gutachtenId);
    res.json({ success: true, data: logs });
  },
};

```

## apps/api/src/modules/audit/audit.routes.ts
```typescript
/**
 * @file apps/api/src/modules/audit/audit.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';

import { auditController } from './audit.controller';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(auditController.list));

export { router as auditRouter };

```

## apps/api/src/modules/audit/audit.service.ts
```typescript
/**
 * @file apps/api/src/modules/audit/audit.service.ts
 */
import { prisma } from '@gutachten/database';

import { notFound } from '@/middleware/error.middleware';

export const auditService = {
  async list(gutachtenId: string) {
    const gutachten = await prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }

    return prisma.auditLog.findMany({
      where: { gutachtenId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },
};

```

## apps/api/src/modules/termine/termine.controller.ts
```typescript
/**
 * @file apps/api/src/modules/termine/termine.controller.ts
 */
import type { Request, Response } from 'express';

import { termineService } from './termine.service';
import { CreateTerminSchema, TermineListQuerySchema, UpdateTerminSchema } from './termine.validators';

export const termineController = {
  async list(req: Request, res: Response) {
    const query = TermineListQuerySchema.parse(req.query);
    const termine = await termineService.list(query);
    res.json({ success: true, data: termine });
  },

  async findById(req: Request, res: Response) {
    const termin = await termineService.findById(req.params.id);
    res.json({ success: true, data: termin });
  },

  async create(req: Request, res: Response) {
    const dto = CreateTerminSchema.parse(req.body);
    const termin = await termineService.create(dto);
    res.status(201).json({ success: true, data: termin });
  },

  async update(req: Request, res: Response) {
    const dto = UpdateTerminSchema.parse(req.body);
    const termin = await termineService.update(req.params.id, dto);
    res.json({ success: true, data: termin });
  },

  async delete(req: Request, res: Response) {
    const result = await termineService.delete(req.params.id);
    res.json({ success: true, data: result });
  },
};

```

## apps/api/src/modules/termine/termine.routes.ts
```typescript
/**
 * @file apps/api/src/modules/termine/termine.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';

import { termineController } from './termine.controller';

const router = Router();

router.get('/', asyncHandler(termineController.list));
router.post('/', asyncHandler(termineController.create));
router.get('/:id', asyncHandler(termineController.findById));
router.patch('/:id', asyncHandler(termineController.update));
router.delete('/:id', asyncHandler(termineController.delete));

export { router as termineRouter };

```

## apps/api/src/modules/termine/termine.service.ts
```typescript
/**
 * @file apps/api/src/modules/termine/termine.service.ts
 */
import { prisma, type Prisma } from '@gutachten/database';

import { notFound } from '@/middleware/error.middleware';

import type { CreateTerminDto, TermineListQuery, UpdateTerminDto } from './termine.validators';

export const termineService = {
  async list(query: TermineListQuery) {
    const where: Prisma.TerminWhereInput = {};

    if (query.gutachtenId) { where.gutachtenId = query.gutachtenId; }

    if (query.von ?? query.bis) {
      where.start = {
        ...(query.von ? { gte: new Date(query.von) } : {}),
        ...(query.bis ? { lte: new Date(query.bis) } : {}),
      };
    }

    return prisma.termin.findMany({
      where,
      orderBy: { start: 'asc' },
      include: {
        gutachten: { select: { id: true, aktenzeichen: true, titel: true } },
      },
    });
  },

  async findById(id: string) {
    const termin = await prisma.termin.findUnique({
      where: { id },
      include: { gutachten: { select: { id: true, aktenzeichen: true, titel: true } } },
    });
    if (!termin) { throw notFound('Termin', id); }
    return termin;
  },

  async create(dto: CreateTerminDto) {
    return prisma.termin.create({
      data: {
        titel: dto.titel,
        beschreibung: dto.beschreibung,
        start: new Date(dto.start),
        ende: new Date(dto.ende),
        ort: dto.ort,
        erinnerung: dto.erinnerung,
        farbe: dto.farbe,
        gutachtenId: dto.gutachtenId ?? null,
      },
      include: {
        gutachten: { select: { id: true, aktenzeichen: true, titel: true } },
      },
    });
  },

  async update(id: string, dto: UpdateTerminDto) {
    const existing = await prisma.termin.findUnique({ where: { id }, select: { id: true } });
    if (!existing) { throw notFound('Termin', id); }

    return prisma.termin.update({
      where: { id },
      data: {
        ...(dto.titel !== undefined && { titel: dto.titel }),
        ...(dto.beschreibung !== undefined && { beschreibung: dto.beschreibung }),
        ...(dto.start !== undefined && { start: new Date(dto.start) }),
        ...(dto.ende !== undefined && { ende: new Date(dto.ende) }),
        ...(dto.ort !== undefined && { ort: dto.ort }),
        ...(dto.erinnerung !== undefined && { erinnerung: dto.erinnerung }),
        ...(dto.farbe !== undefined && { farbe: dto.farbe }),
      },
      include: {
        gutachten: { select: { id: true, aktenzeichen: true, titel: true } },
      },
    });
  },

  async delete(id: string) {
    const existing = await prisma.termin.findUnique({ where: { id }, select: { id: true } });
    if (!existing) { throw notFound('Termin', id); }
    await prisma.termin.delete({ where: { id } });
    return { message: 'Termin wurde gelöscht.' };
  },
};

```

## apps/api/src/modules/termine/termine.validators.ts
```typescript
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
  gutachtenId: z.string().cuid().optional().nullable(),
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

```

## apps/api/src/modules/gutachten/gutachten.controller.ts
```typescript
/**
 * @file apps/api/src/modules/gutachten/gutachten.controller.ts
 */
import type { Request, Response } from 'express';

import { gutachtenService } from './gutachten.service';
import {
  CreateGutachtenSchema,
  GutachtenListQuerySchema,
  UpdateGutachtenSchema,
  UpdateStatusSchema,
  VerknuepfungSchema,
} from './gutachten.validators';

export const gutachtenController = {
  async list(req: Request, res: Response) {
    const query = GutachtenListQuerySchema.parse(req.query);
    const result = await gutachtenService.list(query);
    res.json({ success: true, data: result });
  },

  async findById(req: Request, res: Response) {
    const gutachten = await gutachtenService.findById(req.params.id);
    res.json({ success: true, data: gutachten });
  },

  async create(req: Request, res: Response) {
    const dto = CreateGutachtenSchema.parse(req.body);
    const gutachten = await gutachtenService.create(dto);
    res.status(201).json({ success: true, data: gutachten });
  },

  async update(req: Request, res: Response) {
    const dto = UpdateGutachtenSchema.parse(req.body);
    const gutachten = await gutachtenService.update(req.params.id, dto);
    res.json({ success: true, data: gutachten });
  },

  async updateStatus(req: Request, res: Response) {
    const dto = UpdateStatusSchema.parse(req.body);
    const gutachten = await gutachtenService.updateStatus(req.params.id, dto);
    res.json({ success: true, data: gutachten });
  },

  async delete(req: Request, res: Response) {
    const result = await gutachtenService.delete(req.params.id);
    res.json({ success: true, data: result });
  },

  async verknuepfen(req: Request, res: Response) {
    const dto = VerknuepfungSchema.parse(req.body);
    const result = await gutachtenService.verknuepfen(req.params.id, dto.gutachtenId);
    res.json({ success: true, data: result });
  },
};

```

## apps/api/src/modules/gutachten/gutachten.routes.ts
```typescript
/**
 * @file apps/api/src/modules/gutachten/gutachten.routes.ts
 */
import { Router } from 'express';
import type { Request, Response } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';

import { gutachtenController } from './gutachten.controller';
import { erstelleGutachtenPdf } from './pdf.service';

const router = Router();

router.get('/', asyncHandler(gutachtenController.list));
router.post('/', asyncHandler(gutachtenController.create));
router.get('/:id', asyncHandler(gutachtenController.findById));
router.patch('/:id', asyncHandler(gutachtenController.update));
router.delete('/:id', asyncHandler(gutachtenController.delete));
router.patch('/:id/status', asyncHandler(gutachtenController.updateStatus));
router.post('/:id/verknuepfen', asyncHandler(gutachtenController.verknuepfen));

// PDF-Export
router.get(
  '/:id/pdf',
  asyncHandler(async (req: Request, res: Response) => {
    await erstelleGutachtenPdf(req.params.id, res);
  }),
);

export { router as gutachtenRouter };

```

## apps/api/src/modules/gutachten/gutachten.service.ts
```typescript
/**
 * @file apps/api/src/modules/gutachten/gutachten.service.ts
 * @description Business-Logik für das Gutachten-Modul.
 *
 * Service-Schicht enthält die gesamte Geschäftslogik:
 *   - Datenbankabfragen via Prisma
 *   - Aktenzeichen-Generierung
 *   - Audit-Log-Einträge erstellen
 *   - Berechnung abgeleiteter Werte
 *
 * Der Controller ruft den Service auf und gibt nur das Ergebnis weiter.
 * Kein HTTP-spezifischer Code (Request, Response) im Service!
 */

import { prisma, type Prisma } from '@gutachten/database';

import { generiereAktenzeichen } from '@/lib/aktenzeichen';
import {
  createPaginationMeta,
  parsePagination,
} from '@/lib/pagination';
import { conflict, notFound } from '@/middleware/error.middleware';

import type {
  CreateGutachtenDto,
  GutachtenListQuery,
  UpdateGutachtenDto,
  UpdateStatusDto,
} from './gutachten.validators';

// Felder die bei der Listenansicht zurückgegeben werden (Performance)
const GUTACHTEN_LIST_SELECT = {
  id: true,
  aktenzeichen: true,
  titel: true,
  status: true,
  frist: true,
  auftragsdatum: true,
  abschlussdatum: true,
  createdAt: true,
  updatedAt: true,
  kunde: {
    select: { id: true, vorname: true, nachname: true },
  },
  gutachter: {
    select: { id: true, vorname: true, nachname: true },
  },
  _count: {
    select: {
      aufgaben: { where: { erledigt: false } },
      dateien: true,
    },
  },
} satisfies Prisma.GutachtenSelect;

// Felder für die Detailansicht (vollständig)
const GUTACHTEN_DETAIL_SELECT = {
  ...GUTACHTEN_LIST_SELECT,
  beschreibung: true,
  verwandteGutachten: {
    select: { id: true, aktenzeichen: true, titel: true, status: true },
  },
  verwandteMitGutachten: {
    select: { id: true, aktenzeichen: true, titel: true, status: true },
  },
} satisfies Prisma.GutachtenSelect;

export const gutachtenService = {
  /**
   * Alle Gutachten auflisten (paginiert, gefiltert, sortiert)
   */
  async list(query: GutachtenListQuery) {
    const pagination = parsePagination(query.page, query.pageSize);

    // WHERE-Bedingungen aufbauen
    const where: Prisma.GutachtenWhereInput = {};

    if (query.status) { where.status = query.status; }
    if (query.kundeId) { where.kundeId = query.kundeId; }
    if (query.gutachterId) { where.gutachterId = query.gutachterId; }

    // Überfällige: Frist < jetzt UND Status nicht FERTIG/ARCHIV
    if (query.ueberfaellig) {
      where.frist = { lt: new Date() };
      where.status = { notIn: ['FERTIG', 'ARCHIV'] };
    }

    // Fristen-Bereich
    if (query.fristVon ?? query.fristBis) {
      where.frist = {
        ...(query.fristVon ? { gte: new Date(query.fristVon) } : {}),
        ...(query.fristBis ? { lte: new Date(query.fristBis) } : {}),
      };
    }

    // Volltextsuche über Titel und Aktenzeichen
    if (query.suche) {
      where.OR = [
        { titel: { contains: query.suche, mode: 'insensitive' } },
        { aktenzeichen: { contains: query.suche, mode: 'insensitive' } },
        { beschreibung: { contains: query.suche, mode: 'insensitive' } },
      ];
    }

    // Daten und Gesamtanzahl parallel abfragen
    const [gutachten, total] = await Promise.all([
      prisma.gutachten.findMany({
        where,
        select: GUTACHTEN_LIST_SELECT,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.gutachten.count({ where }),
    ]);

    return {
      gutachten,
      meta: createPaginationMeta(total, pagination),
    };
  },

  /**
   * Ein einzelnes Gutachten abrufen (vollständig)
   */
  async findById(id: string) {
    const gutachten = await prisma.gutachten.findUnique({
      where: { id },
      select: GUTACHTEN_DETAIL_SELECT,
    });

    if (!gutachten) { throw notFound('Gutachten', id); }
    return gutachten;
  },

  /**
   * Neues Gutachten erstellen
   */
  async create(dto: CreateGutachtenDto) {
    // Aktenzeichen: manuell oder auto-generiert
    let aktenzeichen = dto.aktenzeichen?.trim();

    if (!aktenzeichen) {
      aktenzeichen = await generiereAktenzeichen();
    } else {
      // Prüfen ob Aktenzeichen bereits vergeben
      const existing = await prisma.gutachten.findUnique({
        where: { aktenzeichen },
        select: { id: true },
      });
      if (existing) {
        throw conflict(`Aktenzeichen "${aktenzeichen}" ist bereits vergeben.`);
      }
    }

    // Gutachten erstellen
    const gutachten = await prisma.gutachten.create({
      data: {
        aktenzeichen,
        titel: dto.titel,
        beschreibung: dto.beschreibung,
        status: dto.status,
        frist: dto.frist ? new Date(dto.frist) : null,
        auftragsdatum: dto.auftragsdatum ? new Date(dto.auftragsdatum) : null,
        kundeId: dto.kundeId ?? null,
        gutachterId: dto.gutachterId ?? null,
      },
      select: GUTACHTEN_DETAIL_SELECT,
    });

    // Audit-Log-Eintrag
    await prisma.auditLog.create({
      data: {
        gutachtenId: gutachten.id,
        aktion: 'ERSTELLT',
        bearbeiter: 'System',
        beschreibung: `Gutachten ${aktenzeichen} wurde angelegt`,
      },
    });

    return gutachten;
  },

  /**
   * Gutachten bearbeiten
   */
  async update(id: string, dto: UpdateGutachtenDto) {
    // Existenz prüfen
    const existing = await prisma.gutachten.findUnique({
      where: { id },
      select: { id: true, aktenzeichen: true, status: true, titel: true },
    });
    if (!existing) { throw notFound('Gutachten', id); }

    // Wenn Aktenzeichen geändert wird: Duplikat-Prüfung
    if (dto.aktenzeichen && dto.aktenzeichen !== existing.aktenzeichen) {
      const duplicate = await prisma.gutachten.findUnique({
        where: { aktenzeichen: dto.aktenzeichen },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== id) {
        throw conflict(`Aktenzeichen "${dto.aktenzeichen}" ist bereits vergeben.`);
      }
    }

    const gutachten = await prisma.gutachten.update({
      where: { id },
      data: {
        ...(dto.titel !== undefined && { titel: dto.titel }),
        ...(dto.beschreibung !== undefined && { beschreibung: dto.beschreibung }),
        ...(dto.aktenzeichen !== undefined && { aktenzeichen: dto.aktenzeichen }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.frist !== undefined && { frist: dto.frist ? new Date(dto.frist) : null }),
        ...(dto.auftragsdatum !== undefined && {
          auftragsdatum: dto.auftragsdatum ? new Date(dto.auftragsdatum) : null,
        }),
        ...(dto.kundeId !== undefined && { kundeId: dto.kundeId }),
        ...(dto.gutachterId !== undefined && { gutachterId: dto.gutachterId }),
      },
      select: GUTACHTEN_DETAIL_SELECT,
    });

    // Audit-Log
    await prisma.auditLog.create({
      data: {
        gutachtenId: id,
        aktion: 'AKTUALISIERT',
        bearbeiter: 'System',
        beschreibung: `Gutachten ${existing.aktenzeichen} wurde bearbeitet`,
        alterWert: { titel: existing.titel, status: existing.status },
        neuerWert: { titel: dto.titel ?? existing.titel, status: dto.status ?? existing.status },
      },
    });

    return gutachten;
  },

  /**
   * Status eines Gutachtens ändern
   */
  async updateStatus(id: string, dto: UpdateStatusDto) {
    const existing = await prisma.gutachten.findUnique({
      where: { id },
      select: { id: true, aktenzeichen: true, status: true },
    });
    if (!existing) { throw notFound('Gutachten', id); }

    const updates: Prisma.GutachtenUpdateInput = { status: dto.status };

    // Abschlussdatum setzen wenn Status FERTIG oder ARCHIV
    if (dto.status === 'FERTIG' || dto.status === 'ARCHIV') {
      updates.abschlussdatum = new Date();
    }

    const gutachten = await prisma.gutachten.update({
      where: { id },
      data: updates,
      select: GUTACHTEN_LIST_SELECT,
    });

    // Audit-Log für Status-Änderung
    await prisma.auditLog.create({
      data: {
        gutachtenId: id,
        aktion: 'STATUS_GEAENDERT',
        bearbeiter: 'System',
        beschreibung: dto.kommentar
          ? `Status geändert: ${existing.status} → ${dto.status}. Kommentar: ${dto.kommentar}`
          : `Status geändert: ${existing.status} → ${dto.status}`,
        alterWert: { status: existing.status },
        neuerWert: { status: dto.status },
      },
    });

    return gutachten;
  },

  /**
   * Gutachten löschen (soft delete: in ARCHIV verschieben)
   */
  async delete(id: string) {
    const existing = await prisma.gutachten.findUnique({
      where: { id },
      select: { id: true, aktenzeichen: true },
    });
    if (!existing) { throw notFound('Gutachten', id); }

    // Statt hartem Löschen: In ARCHIV verschieben
    await prisma.gutachten.update({
      where: { id },
      data: { status: 'ARCHIV' },
    });

    await prisma.auditLog.create({
      data: {
        gutachtenId: id,
        aktion: 'STATUS_GEAENDERT',
        bearbeiter: 'System',
        beschreibung: `Gutachten ${existing.aktenzeichen} wurde archiviert`,
      },
    });

    return { message: `Gutachten ${existing.aktenzeichen} wurde archiviert.` };
  },

  /**
   * Zwei Gutachten miteinander verknüpfen
   */
  async verknuepfen(id: string, zielId: string) {
    // Beide müssen existieren
    const [quelle, ziel] = await Promise.all([
      prisma.gutachten.findUnique({ where: { id }, select: { id: true } }),
      prisma.gutachten.findUnique({ where: { id: zielId }, select: { id: true } }),
    ]);

    if (!quelle) { throw notFound('Gutachten', id); }
    if (!ziel) { throw notFound('Gutachten', zielId); }
    if (id === zielId) { throw conflict('Ein Gutachten kann nicht mit sich selbst verknüpft werden.'); }

    await prisma.gutachten.update({
      where: { id },
      data: {
        verwandteGutachten: { connect: { id: zielId } },
      },
    });

    return { message: 'Gutachten erfolgreich verknüpft.' };
  },
};

```

## apps/api/src/modules/gutachten/gutachten.validators.ts
```typescript
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

```

## apps/api/src/modules/gutachten/pdf.service.ts
```typescript
/**
 * @file apps/api/src/modules/gutachten/pdf.service.ts
 * @description PDF-Generierung für Gutachten mit pdfkit.
 */

import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import { prisma } from '@gutachten/database';
import { notFound } from '@/middleware/error.middleware';
import { logger } from '@/config/logger';

const STATUS_LABELS: Record<string, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiv',
};

const fmt = (n: number) =>
  n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const fmtDate = (d: Date | string | null): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('de-DE');
};

/** Erstellt und streamt ein Gutachten-PDF als HTTP-Response */
export async function erstelleGutachtenPdf(
  id: string,
  res: Response,
): Promise<void> {
  // Alle Daten laden
  const gutachten = await prisma.gutachten.findUnique({
    where: { id },
    include: {
      kunde: true,
      gutachter: true,
      fahrzeuge: true,
      personen: true,
      schadensposten: { orderBy: { position: 'asc' } },
      notizen: { orderBy: { createdAt: 'desc' }, take: 10 },
      aufgaben: { orderBy: { createdAt: 'asc' } },
      unfall: true,             // korrekt: unfall (nicht unfalldaten)
    },
  });

  if (!gutachten) throw notFound('Gutachten', id);

  logger.info(`PDF wird erstellt: ${gutachten.aktenzeichen}`);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 60, right: 60 },
    info: {
      Title: `Gutachten ${gutachten.aktenzeichen}`,
      Author: 'Gutachten-Manager',
    },
  });

  // HTTP-Header
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="GA-${gutachten.aktenzeichen}.pdf"`,
  );
  doc.pipe(res);

  const W = 495; // Nutzbare Breite
  const GRAU = '#666666';
  const DUNKEL = '#1a1a1a';
  const BLAU = '#1565C0';
  const HELL = '#f5f5f5';

  // ─── Hilfsfunktionen ────────────────────────────────────────────────────────

  const sectionTitle = (text: string) => {
    doc.moveDown(0.5);
    doc
      .fillColor(BLAU)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(text);
    doc
      .moveTo(doc.page.margins.left, doc.y + 2)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
      .strokeColor(BLAU)
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.4);
    doc.fillColor(DUNKEL).fontSize(10).font('Helvetica');
  };

  const labelValue = (label: string, value: string, x = doc.page.margins.left, width = W) => {
    const labelW = 140;
    doc
      .fillColor(GRAU)
      .fontSize(9)
      .font('Helvetica')
      .text(label, x, doc.y, { width: labelW, continued: true });
    doc
      .fillColor(DUNKEL)
      .fontSize(10)
      .font('Helvetica')
      .text(value, { width: width - labelW });
  };

  // ─── Kopfzeile ───────────────────────────────────────────────────────────────

  doc
    .fillColor(BLAU)
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('GUTACHTEN', { align: 'right' });

  doc
    .fillColor(DUNKEL)
    .fontSize(14)
    .font('Helvetica')
    .text(gutachten.aktenzeichen, { align: 'right' });

  doc
    .fillColor(GRAU)
    .fontSize(9)
    .text(`Erstellt am ${new Date().toLocaleDateString('de-DE')} · Gutachten-Manager v2026.03.1`, { align: 'right' });

  doc.moveDown(1);

  // Titelzeile
  doc
    .fillColor(DUNKEL)
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(gutachten.titel);

  doc
    .fillColor(GRAU)
    .fontSize(10)
    .font('Helvetica')
    .text(`Status: ${STATUS_LABELS[gutachten.status] ?? gutachten.status}`);

  doc.moveDown(1);
  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#dddddd').lineWidth(1).stroke();

  // ─── Stammdaten ──────────────────────────────────────────────────────────────

  sectionTitle('1. Stammdaten');
  labelValue('Aktenzeichen:', gutachten.aktenzeichen);
  labelValue('Titel:', gutachten.titel);
  labelValue('Status:', STATUS_LABELS[gutachten.status] ?? gutachten.status);
  labelValue('Auftragsdatum:', fmtDate(gutachten.auftragsdatum));
  labelValue('Frist:', fmtDate(gutachten.frist));
  labelValue('Abschlussdatum:', fmtDate(gutachten.abschlussdatum));
  if (gutachten.beschreibung) {
    labelValue('Beschreibung:', gutachten.beschreibung);
  }

  // ─── Auftraggeber ─────────────────────────────────────────────────────────────

  sectionTitle('2. Auftraggeber');
  if (gutachten.kunde) {
    const k = gutachten.kunde;
    const name = [k.vorname, k.nachname].filter(Boolean).join(' ');
    labelValue('Name:', name);
    if (k.email) labelValue('E-Mail:', k.email);
    if (k.telefon) labelValue('Telefon:', k.telefon);
    const adresse = [k.strasse, k.plz, k.stadt].filter(Boolean).join(', ');
    if (adresse) labelValue('Adresse:', adresse);
  } else {
    doc.fillColor(GRAU).text('Kein Auftraggeber zugewiesen.');
  }

  // ─── Gutachter ────────────────────────────────────────────────────────────────

  sectionTitle('3. Zuständiger Gutachter');
  if (gutachten.gutachter) {
    const g = gutachten.gutachter;
    labelValue('Name:', `${g.vorname} ${g.nachname}`);
    if (g.email) labelValue('E-Mail:', g.email);
    if (g.telefon) labelValue('Telefon:', g.telefon);
  } else {
    doc.fillColor(GRAU).text('Kein Gutachter zugewiesen.');
  }

  // ─── Unfalldaten ─────────────────────────────────────────────────────────────

  sectionTitle('4. Unfalldaten');
  const ud = gutachten.unfall;   // korrekt: unfall (nicht unfalldaten)
  if (ud) {
    const ort = [ud.strasse, ud.hausnummer, ud.plz, ud.stadt].filter(Boolean).join(' ');
    if (ort) labelValue('Unfallort:', ort);
    if (ud.unfallZeit) labelValue('Unfallzeit:', fmtDate(ud.unfallZeit));
    if (ud.polizeiAktenzeichen) labelValue('Polizei-Az.:', ud.polizeiAktenzeichen);
    if (ud.strassenzustand) labelValue('Straßenzustand:', ud.strassenzustand);   // korrekt: strassenzustand
    if (ud.wetterlage) labelValue('Wetterlage:', ud.wetterlage);                 // korrekt: wetterlage
    if (ud.lichtverhaeltnis) labelValue('Lichtverhältnis:', ud.lichtverhaeltnis); // korrekt: lichtverhaeltnis
    if (ud.unfallHergang) {
      doc.moveDown(0.3);
      doc.fillColor(GRAU).fontSize(9).text('Unfallhergang:');
      doc.fillColor(DUNKEL).fontSize(10).text(ud.unfallHergang, { width: W });
    }
  } else {
    doc.fillColor(GRAU).text('Keine Unfalldaten erfasst.');
  }

  // ─── Fahrzeuge ────────────────────────────────────────────────────────────────

  sectionTitle('5. Beteiligte Fahrzeuge');
  if (gutachten.fahrzeuge.length === 0) {
    doc.fillColor(GRAU).text('Keine Fahrzeuge erfasst.');
  } else {
    gutachten.fahrzeuge.forEach((f, i) => {
      doc.fillColor(DUNKEL).font('Helvetica-Bold').fontSize(10).text(`Fahrzeug ${i + 1}:`);
      doc.font('Helvetica');
      const info = [
        f.kennzeichen && `Kennzeichen: ${f.kennzeichen}`,
        (f.marke || f.modell) && `Marke/Modell: ${[f.marke, f.modell].filter(Boolean).join(' ')}`,
        f.baujahr && `Baujahr: ${f.baujahr}`,
        f.farbe && `Farbe: ${f.farbe}`,
        f.fahrgestell && `FIN: ${f.fahrgestell}`,  // korrekt: fahrgestell (nicht fahrgestellnummer)
      ].filter(Boolean).join(' · ');
      doc.fillColor(DUNKEL).fontSize(10).text(info || '—');
      doc.moveDown(0.2);
    });
  }

  // ─── Personen ─────────────────────────────────────────────────────────────────

  sectionTitle('6. Beteiligte Personen');
  if (gutachten.personen.length === 0) {
    doc.fillColor(GRAU).text('Keine Personen erfasst.');
  } else {
    gutachten.personen.forEach((p) => {
      const name = [p.vorname, p.nachname].filter(Boolean).join(' ');
      const info = [
        p.telefon && `Tel: ${p.telefon}`,
        p.email && `E-Mail: ${p.email}`,
      ].filter(Boolean).join(' · ');
      doc
        .fillColor(DUNKEL)
        .font('Helvetica')
        .fontSize(10)
        .text(`${p.typ}: ${name}${info ? ' — ' + info : ''}`);
    });
  }

  // ─── Schadensposten ──────────────────────────────────────────────────────────

  sectionTitle('7. Schadensposten');
  if (gutachten.schadensposten.length === 0) {
    doc.fillColor(GRAU).text('Keine Schadensposten erfasst.');
  } else {
    const colX = [doc.page.margins.left, doc.page.margins.left + 30, doc.page.margins.left + 280, doc.page.margins.left + 380];

    // Tabellenkopf
    doc
      .rect(doc.page.margins.left, doc.y, W, 18)
      .fill(HELL);
    const headY = doc.y + 4;
    doc.fillColor(DUNKEL).font('Helvetica-Bold').fontSize(9);
    doc.text('#', colX[0], headY, { width: 25, align: 'right' });
    doc.text('Bezeichnung', colX[1] + 5, headY, { width: 250 });
    doc.text('Kategorie', colX[2], headY, { width: 95 });
    doc.text('Betrag', colX[3], headY, { width: 115, align: 'right' });
    doc.moveDown(0.1);

    // betragCents ist in Cent gespeichert — Division durch 100 für Euro-Anzeige
    let gesamtCents = 0;
    gutachten.schadensposten.forEach((sp) => {
      gesamtCents += sp.betragCents;                   // korrekt: betragCents
      const y = doc.y + 3;
      doc.fillColor(DUNKEL).font('Helvetica').fontSize(9);
      doc.text(String(sp.position), colX[0], y, { width: 25, align: 'right' });
      doc.text(sp.bezeichnung, colX[1] + 5, y, { width: 250 });  // korrekt: bezeichnung
      doc.text(sp.kategorie ?? '—', colX[2], y, { width: 95 }); // korrekt: kategorie
      doc.text(fmt(sp.betragCents / 100), colX[3], y, { width: 115, align: 'right' }); // Cents → Euro
    });

    doc.moveDown(0.3);
    doc
      .moveTo(colX[2], doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor('#aaaaaa').lineWidth(0.5).stroke();
    doc.moveDown(0.2);

    const totalY = doc.y + 3;
    doc.fillColor(DUNKEL).font('Helvetica-Bold').fontSize(10);
    doc.text('GESAMTSCHADEN:', colX[2], totalY, { width: 95 });
    doc.text(fmt(gesamtCents / 100), colX[3], totalY, { width: 115, align: 'right' }); // Cents → Euro
    doc.moveDown(0.5);
  }

  // ─── Notizen ─────────────────────────────────────────────────────────────────

  if (gutachten.notizen.length > 0) {
    sectionTitle('8. Notizen');
    gutachten.notizen.forEach((n) => {
      doc
        .fillColor(GRAU)
        .fontSize(8)
        .text(`${fmtDate(n.createdAt)}${n.autor ? ' · ' + n.autor : ''}:`);
      doc
        .fillColor(DUNKEL)
        .fontSize(9)
        .text(n.inhalt, { width: W });
      doc.moveDown(0.3);
    });
  }

  // ─── Aufgaben ─────────────────────────────────────────────────────────────────

  if (gutachten.aufgaben.length > 0) {
    sectionTitle('9. Aufgaben');
    gutachten.aufgaben.forEach((a) => {
      const status = a.erledigt ? '[X]' : '[ ]';
      const frist = a.faelligAm ? ` (Fällig: ${fmtDate(a.faelligAm)})` : '';
      doc
        .fillColor(a.erledigt ? GRAU : DUNKEL)
        .fontSize(10)
        .text(`${status} ${a.titel}${frist}`, { width: W });
    });
  }

  // ─── Fußzeile ─────────────────────────────────────────────────────────────────

  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc
      .fillColor(GRAU)
      .fontSize(8)
      .text(
        `Gutachten-Manager · ${gutachten.aktenzeichen} · Seite ${i + 1}/${totalPages}`,
        doc.page.margins.left,
        doc.page.height - 40,
        { align: 'center', width: W },
      );
  }

  doc.end();
  logger.info(`PDF erstellt: ${gutachten.aktenzeichen}`);
}

```

## apps/api/src/modules/unfall/unfall.controller.ts
```typescript
/**
 * @file apps/api/src/modules/unfall/unfall.controller.ts
 */
import type { Request, Response } from 'express';
import { unfallService } from './unfall.service';
import { UpsertUnfallSchema } from './unfall.validators';

export const unfallController = {
  async findByGutachtenId(req: Request, res: Response) {
    const unfall = await unfallService.findByGutachtenId(req.params.gutachtenId);
    res.json({ success: true, data: unfall });
  },

  async upsert(req: Request, res: Response) {
    const dto = UpsertUnfallSchema.parse(req.body);
    const unfall = await unfallService.upsert(req.params.gutachtenId, dto);
    res.json({ success: true, data: unfall });
  },
};

```

## apps/api/src/modules/unfall/unfall.routes.ts
```typescript
/**
 * @file apps/api/src/modules/unfall/unfall.routes.ts
 */
import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';
import { unfallController } from './unfall.controller';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(unfallController.findByGutachtenId));
router.put('/', asyncHandler(unfallController.upsert));

export { router as unfallRouter };

```

## apps/api/src/modules/unfall/unfall.service.ts
```typescript
/**
 * @file apps/api/src/modules/unfall/unfall.service.ts
 */
import { prisma } from '@gutachten/database';
import { notFound } from '@/middleware/error.middleware';
import type { UpsertUnfallDto } from './unfall.validators';

export const unfallService = {
  async findByGutachtenId(gutachtenId: string) {
    return prisma.unfall.findUnique({ where: { gutachtenId } });
  },

  async upsert(gutachtenId: string, dto: UpsertUnfallDto) {
    const gutachten = await prisma.gutachten.findUnique({
      where: { id: gutachtenId },
      select: { id: true },
    });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }

    return prisma.unfall.upsert({
      where: { gutachtenId },
      create: {
        gutachtenId,
        ...dto,
        unfallZeit: dto.unfallZeit ? new Date(dto.unfallZeit) : null,
        polizeiProtokollDatum: dto.polizeiProtokollDatum ? new Date(dto.polizeiProtokollDatum) : null,
      },
      update: {
        ...dto,
        unfallZeit: dto.unfallZeit ? new Date(dto.unfallZeit) : null,
        polizeiProtokollDatum: dto.polizeiProtokollDatum ? new Date(dto.polizeiProtokollDatum) : null,
      },
    });
  },
};

```

## apps/api/src/modules/unfall/unfall.validators.ts
```typescript
/**
 * @file apps/api/src/modules/unfall/unfall.validators.ts
 */
import { z } from 'zod';

export const UpsertUnfallSchema = z.object({
  unfallZeit: z.string().datetime().optional().nullable(),
  strasse: z.string().max(255).optional().nullable(),
  hausnummer: z.string().max(20).optional().nullable(),
  plz: z.string().max(10).optional().nullable(),
  stadt: z.string().max(100).optional().nullable(),
  land: z.string().max(100).default('Deutschland'),
  breitengrad: z.coerce.number().min(-90).max(90).optional().nullable(),
  laengengrad: z.coerce.number().min(-180).max(180).optional().nullable(),
  strassentyp: z.string().max(100).optional().nullable(),
  unfallHergang: z.string().optional().nullable(),
  wetterlage: z.enum(['KLAR', 'BEWOELKT', 'REGEN', 'STARKREGEN', 'SCHNEE', 'GLAETTE', 'NEBEL', 'STURM']).optional().nullable(),
  temperatur: z.coerce.number().optional().nullable(),
  sichtverhaeltnis: z.enum(['GUT', 'MITTEL', 'SCHLECHT', 'NACHT', 'DAEMMERUNG']).optional().nullable(),
  strassenzustand: z.enum(['TROCKEN', 'NASS', 'SCHNEEBEDECKT', 'VEREIST', 'VERSCHMUTZT']).optional().nullable(),
  polizeiAktenzeichen: z.string().max(100).optional().nullable(),
  polizeiDienststelle: z.string().max(255).optional().nullable(),
  polizeiEinsatznummer: z.string().max(100).optional().nullable(),
  polizeiProtokollDatum: z.string().datetime().optional().nullable(),
  lichtverhaeltnis: z.string().max(50).optional().nullable(),
});

export type UpsertUnfallDto = z.infer<typeof UpsertUnfallSchema>;

```

## apps/api/src/modules/personen/personen.controller.ts
```typescript
/**
 * @file apps/api/src/modules/personen/personen.controller.ts
 */
import type { Request, Response } from 'express';
import { personenService } from './personen.service';
import { CreatePersonSchema, UpdatePersonSchema } from './personen.validators';

export const personenController = {
  async list(req: Request, res: Response) {
    const personen = await personenService.list(req.params.gutachtenId);
    res.json({ success: true, data: personen });
  },
  async findById(req: Request, res: Response) {
    const person = await personenService.findById(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: person });
  },
  async create(req: Request, res: Response) {
    const dto = CreatePersonSchema.parse(req.body);
    const person = await personenService.create(req.params.gutachtenId, dto);
    res.status(201).json({ success: true, data: person });
  },
  async update(req: Request, res: Response) {
    const dto = UpdatePersonSchema.parse(req.body);
    const person = await personenService.update(req.params.gutachtenId, req.params.id, dto);
    res.json({ success: true, data: person });
  },
  async delete(req: Request, res: Response) {
    const result = await personenService.delete(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: result });
  },
};

```

## apps/api/src/modules/personen/personen.routes.ts
```typescript
/**
 * @file apps/api/src/modules/personen/personen.routes.ts
 */
import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';
import { personenController } from './personen.controller';

const router = Router({ mergeParams: true });
router.get('/', asyncHandler(personenController.list));
router.post('/', asyncHandler(personenController.create));
router.get('/:id', asyncHandler(personenController.findById));
router.patch('/:id', asyncHandler(personenController.update));
router.delete('/:id', asyncHandler(personenController.delete));
export { router as personenRouter };

```

## apps/api/src/modules/personen/personen.service.ts
```typescript
/**
 * @file apps/api/src/modules/personen/personen.service.ts
 */
import { prisma } from '@gutachten/database';
import { notFound } from '@/middleware/error.middleware';
import type { CreatePersonDto, UpdatePersonDto } from './personen.validators';

export const personenService = {
  async list(gutachtenId: string) {
    return prisma.person.findMany({
      where: { gutachtenId },
      orderBy: { createdAt: 'asc' },
      include: { fahrzeug: { select: { id: true, kennzeichen: true, marke: true, modell: true } } },
    });
  },

  async findById(gutachtenId: string, id: string) {
    const person = await prisma.person.findFirst({
      where: { id, gutachtenId },
      include: { fahrzeug: true },
    });
    if (!person) { throw notFound('Person', id); }
    return person;
  },

  async create(gutachtenId: string, dto: CreatePersonDto) {
    const gutachten = await prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }
    return prisma.person.create({
      data: {
        gutachtenId,
        ...dto,
        geburtsdatum: dto.geburtsdatum ? new Date(dto.geburtsdatum) : null,
      },
    });
  },

  async update(gutachtenId: string, id: string, dto: UpdatePersonDto) {
    const existing = await prisma.person.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Person', id); }
    return prisma.person.update({
      where: { id },
      data: {
        ...dto,
        geburtsdatum: dto.geburtsdatum ? new Date(dto.geburtsdatum) : undefined,
      },
    });
  },

  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.person.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Person', id); }
    await prisma.person.delete({ where: { id } });
    return { message: 'Person wurde gelöscht.' };
  },
};

```

## apps/api/src/modules/personen/personen.validators.ts
```typescript
/**
 * @file apps/api/src/modules/personen/personen.validators.ts
 */
import { z } from 'zod';

export const CreatePersonSchema = z.object({
  typ: z.enum(['FAHRER', 'BEIFAHRER', 'FUSSGAENGER', 'ZEUGE', 'VERLETZTE']),
  vorname: z.string().min(1).max(100),
  nachname: z.string().min(1).max(100),
  geburtsdatum: z.string().datetime().optional().nullable(),
  strasse: z.string().max(255).optional().nullable(),
  plz: z.string().max(10).optional().nullable(),
  stadt: z.string().max(100).optional().nullable(),
  telefon: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  fuehrerschein: z.string().max(100).optional().nullable(),
  fuehrerscheinklasse: z.string().max(50).optional().nullable(),
  zeugenaussage: z.string().optional().nullable(),
  fahrzeugId: z.string().cuid().optional().nullable(),
});

export const UpdatePersonSchema = CreatePersonSchema.partial();

export type CreatePersonDto = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonDto = z.infer<typeof UpdatePersonSchema>;

```

## apps/api/src/modules/dateien/dateien.controller.ts
```typescript
/**
 * @file apps/api/src/modules/dateien/dateien.controller.ts
 */
import path from 'path';

import { z } from 'zod';
import type { Request, Response } from 'express';

import { dateienService } from './dateien.service';

const UpdateBeschreibungSchema = z.object({
  beschreibung: z.string().max(500).optional().nullable(),
});

export const dateienController = {
  async list(req: Request, res: Response) {
    const dateien = await dateienService.list(req.params.gutachtenId);
    res.json({ success: true, data: dateien });
  },

  async upload(req: Request, res: Response) {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'Keine Datei hochgeladen.' } });
      return;
    }
    const beschreibung = typeof req.body?.beschreibung === 'string' ? req.body.beschreibung : null;
    const datei = await dateienService.upload(req.params.gutachtenId, req.file, beschreibung);
    res.status(201).json({ success: true, data: datei });
  },

  async findById(req: Request, res: Response) {
    const datei = await dateienService.findById(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: datei });
  },

  async delete(req: Request, res: Response) {
    const result = await dateienService.delete(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: result });
  },

  async download(req: Request, res: Response) {
    const datei = await dateienService.findById(req.params.gutachtenId, req.params.id);
    res.download(path.resolve(datei.pfad), datei.originalname);
  },

  async updateBeschreibung(req: Request, res: Response) {
    const { beschreibung } = UpdateBeschreibungSchema.parse(req.body);
    const datei = await dateienService.updateBeschreibung(req.params.gutachtenId, req.params.id, beschreibung ?? null);
    res.json({ success: true, data: datei });
  },
};

```

## apps/api/src/modules/dateien/dateien.routes.ts
```typescript
/**
 * @file apps/api/src/modules/dateien/dateien.routes.ts
 */
import path from 'path';

import { Router } from 'express';
import multer from 'multer';

import { env } from '@/config/env';
import { asyncHandler } from '@/middleware/error.middleware';

import { dateienController } from './dateien.controller';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(env.UPLOAD_DIR));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Dateityp nicht erlaubt: ${file.mimetype}`));
    }
  },
});

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(dateienController.list));
router.post('/', upload.single('datei'), asyncHandler(dateienController.upload));
router.get('/:id/download', asyncHandler(dateienController.download));
router.get('/:id', asyncHandler(dateienController.findById));
router.patch('/:id', asyncHandler(dateienController.updateBeschreibung));
router.delete('/:id', asyncHandler(dateienController.delete));

export { router as dateienRouter };

```

## apps/api/src/modules/dateien/dateien.service.ts
```typescript
/**
 * @file apps/api/src/modules/dateien/dateien.service.ts
 */
import fs from 'fs';
import path from 'path';

import type { Express } from 'express';
import { prisma } from '@gutachten/database';

import { notFound } from '@/middleware/error.middleware';

export const dateienService = {
  async upload(gutachtenId: string, file: Express.Multer.File, beschreibung: string | null) {
    const gutachten = await prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }

    return prisma.datei.create({
      data: {
        gutachtenId,
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        groesse: file.size,
        pfad: file.path,
        beschreibung,
      },
    });
  },

  async list(gutachtenId: string) {
    return prisma.datei.findMany({
      where: { gutachtenId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(gutachtenId: string, id: string) {
    const datei = await prisma.datei.findFirst({ where: { id, gutachtenId } });
    if (!datei) { throw notFound('Datei', id); }
    return datei;
  },

  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.datei.findFirst({ where: { id, gutachtenId }, select: { id: true, originalname: true, pfad: true } });
    if (!existing) { throw notFound('Datei', id); }
    await prisma.datei.delete({ where: { id } });
    // Datei vom Dateisystem löschen (Fehler ignorieren — DB ist führend)
    if (existing.pfad) {
      try { fs.unlinkSync(path.resolve(existing.pfad)); } catch { /* ignorieren */ }
    }
    return { message: `Datei "${existing.originalname}" wurde gelöscht.` };
  },

  async updateBeschreibung(gutachtenId: string, id: string, beschreibung: string | null) {
    const existing = await prisma.datei.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Datei', id); }
    return prisma.datei.update({ where: { id }, data: { beschreibung } });
  },
};

```

## apps/api/src/modules/schaden/schaden.controller.ts
```typescript
/**
 * @file apps/api/src/modules/schaden/schaden.controller.ts
 */
import type { Request, Response } from 'express';
import { schadenService } from './schaden.service';
import { CreateSchadenspostenSchema, UpdateSchadenspostenSchema } from './schaden.validators';

export const schadenController = {
  async list(req: Request, res: Response) {
    const result = await schadenService.list(req.params.gutachtenId);
    res.json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const dto = CreateSchadenspostenSchema.parse(req.body);
    const posten = await schadenService.create(req.params.gutachtenId, dto);
    res.status(201).json({ success: true, data: posten });
  },
  async update(req: Request, res: Response) {
    const dto = UpdateSchadenspostenSchema.parse(req.body);
    const posten = await schadenService.update(req.params.gutachtenId, req.params.id, dto);
    res.json({ success: true, data: posten });
  },
  async delete(req: Request, res: Response) {
    const result = await schadenService.delete(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: result });
  },
};

```

## apps/api/src/modules/schaden/schaden.routes.ts
```typescript
/**
 * @file apps/api/src/modules/schaden/schaden.routes.ts
 */
import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';
import { schadenController } from './schaden.controller';

const router = Router({ mergeParams: true });
router.get('/', asyncHandler(schadenController.list));
router.post('/', asyncHandler(schadenController.create));
router.patch('/:id', asyncHandler(schadenController.update));
router.delete('/:id', asyncHandler(schadenController.delete));
export { router as schadenRouter };

```

## apps/api/src/modules/schaden/schaden.service.ts
```typescript
/**
 * @file apps/api/src/modules/schaden/schaden.service.ts
 */
import { prisma } from '@gutachten/database';
import { notFound } from '@/middleware/error.middleware';
import type { CreateSchadenspostenDto, UpdateSchadenspostenDto } from './schaden.validators';

export const schadenService = {
  async list(gutachtenId: string) {
    const posten = await prisma.schadensposten.findMany({
      where: { gutachtenId },
      orderBy: { position: 'asc' },
    });

    const gesamtCents = posten.reduce((sum, p) => sum + p.betragCents, 0);

    return {
      posten,
      summen: {
        gesamtCents,
        gesamtEuro: gesamtCents / 100,
        anzahl: posten.length,
      },
    };
  },

  async create(gutachtenId: string, dto: CreateSchadenspostenDto) {
    const gutachten = await prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }
    return prisma.schadensposten.create({ data: { gutachtenId, ...dto } });
  },

  async update(gutachtenId: string, id: string, dto: UpdateSchadenspostenDto) {
    const existing = await prisma.schadensposten.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Schadensposten', id); }
    return prisma.schadensposten.update({ where: { id }, data: dto });
  },

  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.schadensposten.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Schadensposten', id); }
    await prisma.schadensposten.delete({ where: { id } });
    return { message: 'Schadensposten wurde gelöscht.' };
  },
};

```

## apps/api/src/modules/schaden/schaden.validators.ts
```typescript
/**
 * @file apps/api/src/modules/schaden/schaden.validators.ts
 */
import { z } from 'zod';

export const CreateSchadenspostenSchema = z.object({
  position: z.coerce.number().int().min(1),
  bezeichnung: z.string().min(1).max(500),
  beschreibung: z.string().optional().nullable(),
  betragCents: z.coerce.number().int().min(0),
  kategorie: z.string().min(1).max(100),
});

export const UpdateSchadenspostenSchema = CreateSchadenspostenSchema.partial();

export type CreateSchadenspostenDto = z.infer<typeof CreateSchadenspostenSchema>;
export type UpdateSchadenspostenDto = z.infer<typeof UpdateSchadenspostenSchema>;

```

## apps/api/src/modules/dashboard/dashboard.controller.ts
```typescript
/**
 * @file apps/api/src/modules/dashboard/dashboard.controller.ts
 */
import type { Request, Response } from 'express';

import { dashboardService } from './dashboard.service';

export const dashboardController = {
  async getStats(_req: Request, res: Response) {
    const stats = await dashboardService.getStats();
    res.json({ success: true, data: stats });
  },

  async getMonatsuebersicht(_req: Request, res: Response) {
    const data = await dashboardService.getMonatsuebersicht();
    res.json({ success: true, data });
  },

  async getFristen(_req: Request, res: Response) {
    const fristen = await dashboardService.getFristen();
    res.json({ success: true, data: fristen });
  },
};

```

## apps/api/src/modules/dashboard/dashboard.routes.ts
```typescript
/**
 * @file apps/api/src/modules/dashboard/dashboard.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';

import { dashboardController } from './dashboard.controller';

const router = Router();

router.get('/stats', asyncHandler(dashboardController.getStats));
router.get('/monatsuebersicht', asyncHandler(dashboardController.getMonatsuebersicht));
router.get('/fristen', asyncHandler(dashboardController.getFristen));

export { router as dashboardRouter };

```

## apps/api/src/modules/dashboard/dashboard.service.ts
```typescript
/**
 * @file apps/api/src/modules/dashboard/dashboard.service.ts
 */
import { prisma } from '@gutachten/database';

export const dashboardService = {
  async getStats() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      gesamt,
      statusVerteilung,
      ueberfaellige,
      faelligIn30Tagen,
      aktuelleGutachten,
    ] = await Promise.all([
      prisma.gutachten.count(),
      prisma.gutachten.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.gutachten.count({
        where: {
          frist: { lt: now },
          status: { notIn: ['FERTIG', 'ARCHIV'] },
        },
      }),
      prisma.gutachten.count({
        where: {
          frist: { gte: now, lte: in30Days },
          status: { notIn: ['FERTIG', 'ARCHIV'] },
        },
      }),
      prisma.gutachten.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
        where: { status: { notIn: ['ARCHIV'] } },
        select: {
          id: true,
          aktenzeichen: true,
          titel: true,
          status: true,
          frist: true,
          updatedAt: true,
          kunde: { select: { id: true, vorname: true, nachname: true } },
        },
      }),
    ]);

    const statusMap = Object.fromEntries(
      statusVerteilung.map((s) => [s.status, s._count.status])
    );

    return {
      gesamt,
      aktiv: gesamt - (statusMap['ARCHIV'] ?? 0) - (statusMap['FERTIG'] ?? 0),
      fertig: statusMap['FERTIG'] ?? 0,
      ueberfaellige,
      faelligIn30Tagen,
      statusVerteilung: statusMap,
      aktuelleGutachten,
    };
  },

  async getMonatsuebersicht() {
    const vor12Monaten = new Date();
    vor12Monaten.setMonth(vor12Monaten.getMonth() - 11);
    vor12Monaten.setDate(1);
    vor12Monaten.setHours(0, 0, 0, 0);

    const gutachten = await prisma.gutachten.findMany({
      where: { createdAt: { gte: vor12Monaten } },
      select: { createdAt: true, status: true },
    });

    const monthlyData: Record<string, { erstellt: number; fertig: number }> = {};

    for (const g of gutachten) {
      const key = `${g.createdAt.getFullYear()}-${String(g.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) { monthlyData[key] = { erstellt: 0, fertig: 0 }; }
      monthlyData[key].erstellt++;
      if (g.status === 'FERTIG' || g.status === 'ARCHIV') {
        monthlyData[key].fertig++;
      }
    }

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monat, data]) => ({ monat, ...data }));
  },

  async getFristen() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return prisma.gutachten.findMany({
      where: {
        frist: { gte: now, lte: in30Days },
        status: { notIn: ['FERTIG', 'ARCHIV'] },
      },
      orderBy: { frist: 'asc' },
      select: {
        id: true,
        aktenzeichen: true,
        titel: true,
        status: true,
        frist: true,
        gutachter: { select: { id: true, vorname: true, nachname: true } },
        kunde: { select: { id: true, vorname: true, nachname: true } },
      },
    });
  },
};

```

## apps/api/src/modules/kunden/kunden.controller.ts
```typescript
/**
 * @file apps/api/src/modules/kunden/kunden.controller.ts
 */
import type { Request, Response } from 'express';

import { kundenService } from './kunden.service';
import { CreateKundeSchema, KontaktHistorieSchema, KundenListQuerySchema, UpdateKundeSchema } from './kunden.validators';

export const kundenController = {
  async list(req: Request, res: Response) {
    const query = KundenListQuerySchema.parse(req.query);
    const result = await kundenService.list(query);
    res.json({ success: true, data: result });
  },

  async findById(req: Request, res: Response) {
    const kunde = await kundenService.findById(req.params.id);
    res.json({ success: true, data: kunde });
  },

  async create(req: Request, res: Response) {
    const dto = CreateKundeSchema.parse(req.body);
    const kunde = await kundenService.create(dto);
    res.status(201).json({ success: true, data: kunde });
  },

  async update(req: Request, res: Response) {
    const dto = UpdateKundeSchema.parse(req.body);
    const kunde = await kundenService.update(req.params.id, dto);
    res.json({ success: true, data: kunde });
  },

  async delete(req: Request, res: Response) {
    const result = await kundenService.delete(req.params.id);
    res.json({ success: true, data: result });
  },

  async addKontakt(req: Request, res: Response) {
    const dto = KontaktHistorieSchema.parse(req.body);
    const kontakt = await kundenService.addKontakt(req.params.id, dto);
    res.status(201).json({ success: true, data: kontakt });
  },
};

```

## apps/api/src/modules/kunden/kunden.routes.ts
```typescript
/**
 * @file apps/api/src/modules/kunden/kunden.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';

import { kundenController } from './kunden.controller';

const router = Router();

router.get('/', asyncHandler(kundenController.list));
router.post('/', asyncHandler(kundenController.create));
router.get('/:id', asyncHandler(kundenController.findById));
router.patch('/:id', asyncHandler(kundenController.update));
router.delete('/:id', asyncHandler(kundenController.delete));
router.post('/:id/kontakte', asyncHandler(kundenController.addKontakt));

export { router as kundenRouter };

```

## apps/api/src/modules/kunden/kunden.service.ts
```typescript
/**
 * @file apps/api/src/modules/kunden/kunden.service.ts
 */
import { prisma, type Prisma } from '@gutachten/database';

import { createPaginationMeta, parsePagination } from '@/lib/pagination';
import { notFound } from '@/middleware/error.middleware';

import type { CreateKundeDto, KontaktHistorieDto, KundenListQuery, UpdateKundeDto } from './kunden.validators';

const KUNDE_SELECT = {
  id: true,
  vorname: true,
  nachname: true,
  firma: true,
  email: true,
  telefon: true,
  mobil: true,
  strasse: true,
  plz: true,
  stadt: true,
  land: true,
  notizen: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { gutachten: true, kontakthistorie: true } },
} satisfies Prisma.KundeSelect;

export const kundenService = {
  async list(query: KundenListQuery) {
    const pagination = parsePagination(query.page, query.pageSize);
    const where: Prisma.KundeWhereInput = {};

    if (query.suche) {
      where.OR = [
        { nachname: { contains: query.suche, mode: 'insensitive' } },
        { vorname: { contains: query.suche, mode: 'insensitive' } },
        { firma: { contains: query.suche, mode: 'insensitive' } },
        { email: { contains: query.suche, mode: 'insensitive' } },
      ];
    }

    const [kunden, total] = await Promise.all([
      prisma.kunde.findMany({
        where,
        select: KUNDE_SELECT,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.kunde.count({ where }),
    ]);

    return { kunden, meta: createPaginationMeta(total, pagination) };
  },

  async findById(id: string) {
    const kunde = await prisma.kunde.findUnique({
      where: { id },
      include: {
        kontakthistorie: { orderBy: { kontaktDat: 'desc' }, take: 50 },
        gutachten: {
          select: { id: true, aktenzeichen: true, titel: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!kunde) { throw notFound('Kunde', id); }
    return kunde;
  },

  async create(dto: CreateKundeDto) {
    return prisma.kunde.create({ data: dto, select: KUNDE_SELECT });
  },

  async update(id: string, dto: UpdateKundeDto) {
    const existing = await prisma.kunde.findUnique({ where: { id }, select: { id: true } });
    if (!existing) { throw notFound('Kunde', id); }
    return prisma.kunde.update({ where: { id }, data: dto, select: KUNDE_SELECT });
  },

  async delete(id: string) {
    const existing = await prisma.kunde.findUnique({ where: { id }, select: { id: true, nachname: true } });
    if (!existing) { throw notFound('Kunde', id); }
    await prisma.kunde.delete({ where: { id } });
    return { message: `Kunde "${existing.nachname}" wurde gelöscht.` };
  },

  async addKontakt(kundeId: string, dto: KontaktHistorieDto) {
    const existing = await prisma.kunde.findUnique({ where: { id: kundeId }, select: { id: true } });
    if (!existing) { throw notFound('Kunde', kundeId); }
    return prisma.kontaktHistorie.create({
      data: {
        kundeId,
        art: dto.art,
        inhalt: dto.inhalt,
        bearbeiter: dto.bearbeiter,
        kontaktDat: dto.kontaktDat ? new Date(dto.kontaktDat) : new Date(),
      },
    });
  },
};

```

## apps/api/src/modules/kunden/kunden.validators.ts
```typescript
/**
 * @file apps/api/src/modules/kunden/kunden.validators.ts
 */
import { z } from 'zod';

export const CreateKundeSchema = z.object({
  vorname: z.string().min(1).max(100).optional().nullable(),
  nachname: z.string().min(1, 'Nachname ist erforderlich').max(200),
  firma: z.string().max(200).optional().nullable(),
  email: z.string().email('Ungültige E-Mail').max(255).optional().nullable(),
  telefon: z.string().max(50).optional().nullable(),
  mobil: z.string().max(50).optional().nullable(),
  strasse: z.string().max(255).optional().nullable(),
  plz: z.string().max(10).optional().nullable(),
  stadt: z.string().max(100).optional().nullable(),
  land: z.string().max(100).default('Deutschland'),
  notizen: z.string().optional().nullable(),
});

export const UpdateKundeSchema = CreateKundeSchema.partial();

export const KundenListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  suche: z.string().max(200).optional(),
  sortBy: z.enum(['nachname', 'vorname', 'email', 'createdAt']).default('nachname'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

export const KontaktHistorieSchema = z.object({
  art: z.string().min(1).max(50),
  inhalt: z.string().min(1, 'Inhalt ist erforderlich'),
  bearbeiter: z.string().max(100).optional().nullable(),
  kontaktDat: z.string().datetime().optional(),
});

export type CreateKundeDto = z.infer<typeof CreateKundeSchema>;
export type UpdateKundeDto = z.infer<typeof UpdateKundeSchema>;
export type KundenListQuery = z.infer<typeof KundenListQuerySchema>;
export type KontaktHistorieDto = z.infer<typeof KontaktHistorieSchema>;

```

## apps/api/src/modules/aufgaben/aufgaben.controller.ts
```typescript
/**
 * @file apps/api/src/modules/aufgaben/aufgaben.controller.ts
 */
import type { Request, Response } from 'express';
import { aufgabenService } from './aufgaben.service';
import { CreateAufgabeSchema, UpdateAufgabeSchema } from './aufgaben.validators';

export const aufgabenController = {
  async list(req: Request, res: Response) {
    const aufgaben = await aufgabenService.list(req.params.gutachtenId);
    res.json({ success: true, data: aufgaben });
  },
  async create(req: Request, res: Response) {
    const dto = CreateAufgabeSchema.parse(req.body);
    const aufgabe = await aufgabenService.create(req.params.gutachtenId, dto);
    res.status(201).json({ success: true, data: aufgabe });
  },
  async update(req: Request, res: Response) {
    const dto = UpdateAufgabeSchema.parse(req.body);
    const aufgabe = await aufgabenService.update(req.params.gutachtenId, req.params.id, dto);
    res.json({ success: true, data: aufgabe });
  },
  async delete(req: Request, res: Response) {
    const result = await aufgabenService.delete(req.params.gutachtenId, req.params.id);
    res.json({ success: true, data: result });
  },
};

```

## apps/api/src/modules/aufgaben/aufgaben.routes.ts
```typescript
/**
 * @file apps/api/src/modules/aufgaben/aufgaben.routes.ts
 */
import { Router } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';
import { aufgabenController } from './aufgaben.controller';

const router = Router({ mergeParams: true });
router.get('/', asyncHandler(aufgabenController.list));
router.post('/', asyncHandler(aufgabenController.create));
router.patch('/:id', asyncHandler(aufgabenController.update));
router.delete('/:id', asyncHandler(aufgabenController.delete));
export { router as aufgabenRouter };

```

## apps/api/src/modules/aufgaben/aufgaben.service.ts
```typescript
/**
 * @file apps/api/src/modules/aufgaben/aufgaben.service.ts
 */
import { prisma } from '@gutachten/database';
import { notFound } from '@/middleware/error.middleware';
import type { CreateAufgabeDto, UpdateAufgabeDto } from './aufgaben.validators';

export const aufgabenService = {
  async list(gutachtenId: string) {
    return prisma.aufgabe.findMany({
      where: { gutachtenId },
      orderBy: [{ erledigt: 'asc' }, { faelligAm: 'asc' }, { createdAt: 'desc' }],
    });
  },

  async create(gutachtenId: string, dto: CreateAufgabeDto) {
    const gutachten = await prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }
    return prisma.aufgabe.create({
      data: {
        gutachtenId,
        ...dto,
        faelligAm: dto.faelligAm ? new Date(dto.faelligAm) : null,
      },
    });
  },

  async update(gutachtenId: string, id: string, dto: UpdateAufgabeDto) {
    const existing = await prisma.aufgabe.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Aufgabe', id); }

    const data: Parameters<typeof prisma.aufgabe.update>[0]['data'] = { ...dto };
    if (dto.faelligAm !== undefined) {
      data.faelligAm = dto.faelligAm ? new Date(dto.faelligAm) : null;
    }
    if (dto.erledigt === true) {
      data.erledigtAm = new Date();
    }

    return prisma.aufgabe.update({ where: { id }, data });
  },

  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.aufgabe.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Aufgabe', id); }
    await prisma.aufgabe.delete({ where: { id } });
    return { message: 'Aufgabe wurde gelöscht.' };
  },
};

```

## apps/api/src/modules/aufgaben/aufgaben.validators.ts
```typescript
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

```

## apps/api/src/v1/router.ts
```typescript
/**
 * @file apps/api/src/v1/router.ts
 * @description Haupt-Router für API Version 1.
 *
 * Registriert alle Feature-Module unter /api/v1/.
 * Um ein neues Modul hinzuzufügen:
 *   1. Modul in src/modules/<name>/ erstellen
 *   2. Hier importieren und registrieren
 *   3. Fertig — keine anderen Dateien müssen geändert werden
 */

import { Router } from 'express';

import { env } from '@/config/env';
import { adminRouter } from '@/modules/admin/admin.routes';
import { aufgabenRouter } from '@/modules/aufgaben/aufgaben.routes';
import { auditRouter } from '@/modules/audit/audit.routes';
import { dashboardRouter } from '@/modules/dashboard/dashboard.routes';
import { dateienRouter } from '@/modules/dateien/dateien.routes';
import { fahrzeugeRouter } from '@/modules/fahrzeuge/fahrzeuge.routes';
import { gutachtenRouter } from '@/modules/gutachten/gutachten.routes';
import { gutachterRouter } from '@/modules/gutachter/gutachter.routes';
import { kundenRouter } from '@/modules/kunden/kunden.routes';
import { notizenRouter } from '@/modules/notizen/notizen.routes';
import { personenRouter } from '@/modules/personen/personen.routes';
import { schadenRouter } from '@/modules/schaden/schaden.routes';
import { sucheRouter } from '@/modules/suche/suche.routes';
import { termineRouter } from '@/modules/termine/termine.routes';
import { unfallRouter } from '@/modules/unfall/unfall.routes';

const router = Router();

// ---------------------------------------------------------------------------
// Health-Check
// ---------------------------------------------------------------------------
/**
 * GET /api/v1/health
 * Gibt den Status der API zurück. Wird von Docker und Load-Balancern genutzt.
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: '2026.03.1',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
  });
});

// ---------------------------------------------------------------------------
// API-Übersicht
// ---------------------------------------------------------------------------
/**
 * GET /api/v1/
 * Gibt eine Übersicht aller verfügbaren Endpunkte zurück.
 */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Gutachten-Manager API',
      version: 'v1',
      endpoints: [
        { method: 'GET',    path: '/api/v1/health',          description: 'Health-Check' },
        { method: 'GET',    path: '/api/v1/gutachten',        description: 'Alle Gutachten' },
        { method: 'POST',   path: '/api/v1/gutachten',        description: 'Gutachten erstellen' },
        { method: 'GET',    path: '/api/v1/gutachten/:id',    description: 'Gutachten abrufen' },
        { method: 'PATCH',  path: '/api/v1/gutachten/:id',    description: 'Gutachten bearbeiten' },
        { method: 'DELETE', path: '/api/v1/gutachten/:id',    description: 'Gutachten löschen' },
        { method: 'GET',    path: '/api/v1/kunden',           description: 'Alle Kunden' },
        { method: 'POST',   path: '/api/v1/kunden',           description: 'Kunden erstellen' },
        { method: 'GET',    path: '/api/v1/kalender',         description: 'Termine' },
        { method: 'GET',    path: '/api/v1/dashboard/stats',  description: 'Dashboard-Statistiken' },
        { method: 'GET',    path: '/api/v1/suche',            description: 'Volltextsuche' },
        { method: 'GET',    path: '/api/v1/admin/feature-flags', description: 'Feature-Flags' },
      ],
    },
  });
});

// ---------------------------------------------------------------------------
// Feature-Module
// ---------------------------------------------------------------------------

// Haupt-Ressourcen
router.use('/gutachten', gutachtenRouter);
router.use('/kunden', kundenRouter);
router.use('/gutachter', gutachterRouter);
router.use('/termine', termineRouter);
router.use('/kalender', termineRouter);
router.use('/dashboard', dashboardRouter);
router.use('/suche', sucheRouter);
router.use('/admin', adminRouter);

// Sub-Ressourcen für Gutachten
router.use('/gutachten/:gutachtenId/unfall', unfallRouter);
router.use('/gutachten/:gutachtenId/fahrzeuge', fahrzeugeRouter);
router.use('/gutachten/:gutachtenId/personen', personenRouter);
router.use('/gutachten/:gutachtenId/schaden', schadenRouter);
router.use('/gutachten/:gutachtenId/notizen', notizenRouter);
router.use('/gutachten/:gutachtenId/aufgaben', aufgabenRouter);
router.use('/gutachten/:gutachtenId/dateien', dateienRouter);
router.use('/gutachten/:gutachtenId/audit', auditRouter);

export { router as v1Router };

```

## apps/api/src/config/env.ts
```typescript
/**
 * @file apps/api/src/config/env.ts
 * @description Typisierte und validierte Umgebungsvariablen.
 *
 * Alle Umgebungsvariablen werden hier einmalig gelesen und validiert.
 * Bei fehlenden Pflicht-Variablen wirft die Anwendung sofort einen Fehler
 * mit einer klaren Fehlermeldung — statt still zu versagen.
 *
 * Verwendung:
 *   import { env } from '@/config/env'
 *   console.log(env.PORT)  // typisiert als number
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Fehlende Pflicht-Umgebungsvariable: ${name}\n` +
      `Bitte .env.example als Vorlage verwenden und .env erstellen.`,
    );
  }
  return value;
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

function optionalNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) { return defaultValue; }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Umgebungsvariable ${name} muss eine Zahl sein, ist aber: "${value}"`);
  }
  return parsed;
}

/** Alle validierten Umgebungsvariablen der API */
export const env = {
  // Server
  NODE_ENV: optional('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  PORT: optionalNumber('PORT', 4000),

  // Datenbank
  DATABASE_URL: required('DATABASE_URL'),

  // CORS
  CORS_ORIGINS: optional('CORS_ORIGINS', 'http://localhost:3000').split(',').map(s => s.trim()),

  // Uploads
  MAX_UPLOAD_SIZE_MB: optionalNumber('MAX_UPLOAD_SIZE_MB', 50),
  UPLOAD_DIR: optional('UPLOAD_DIR', './uploads'),

  // Logging
  LOG_LEVEL: optional('LOG_LEVEL', 'info') as 'error' | 'warn' | 'info' | 'debug',
  LOG_DIR: optional('LOG_DIR', './logs'),

  // Backup
  BACKUP_DIR: optional('BACKUP_DIR', './backups'),
  BACKUP_RETENTION_DAYS: optionalNumber('BACKUP_RETENTION_DAYS', 30),
  BACKUP_CRON_SCHEDULE: optional('BACKUP_CRON_SCHEDULE', '0 2 * * *'),

  // Abgeleitete Werte
  get IS_PRODUCTION(): boolean { return this.NODE_ENV === 'production'; },
  get IS_DEVELOPMENT(): boolean { return this.NODE_ENV === 'development'; },
  get IS_TEST(): boolean { return this.NODE_ENV === 'test'; },
} as const;

```

## apps/api/src/config/logger.ts
```typescript
/**
 * @file apps/api/src/config/logger.ts
 * @description Winston-Logger Konfiguration.
 *
 * Erstellt einen zentralen Logger der:
 *   - In Entwicklung: Farbig in die Konsole schreibt
 *   - In Produktion: In Dateien schreibt (error.log, combined.log)
 *   - Automatisch rotiert (tägliche Rotation)
 *
 * Verwendung in anderen Dateien:
 *   import { logger } from '@/config/logger'
 *   logger.info('Server gestartet auf Port 4000')
 *   logger.error('Datenbankfehler', { error: err.message })
 */

import path from 'path';
import winston from 'winston';

import { env } from './env';

// Deutsches Datumsformat für Logs
const TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/** Formatierung für Entwicklung (lesbar, farbig) */
const developmentFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: TIMESTAMP_FORMAT }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${String(timestamp)}] ${level}: ${String(message)}${metaStr}`;
  }),
);

/** Formatierung für Produktion (JSON, maschinenlesbar) */
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: TIMESTAMP_FORMAT }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/** Transports (Ausgabe-Ziele) je nach Umgebung */
function createTransports(): winston.transport[] {
  if (env.IS_TEST) {
    // Im Test: Keine Ausgabe (stille Logs)
    return [new winston.transports.Console({ silent: true })];
  }

  if (env.IS_DEVELOPMENT) {
    return [new winston.transports.Console({ format: developmentFormat })];
  }

  // Produktion: Dateien
  return [
    // Alle Logs
    new winston.transports.File({
      filename: path.join(env.LOG_DIR, 'api-combined.log'),
      format: productionFormat,
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,               // Letzten 5 Dateien behalten
    }),
    // Nur Fehler
    new winston.transports.File({
      filename: path.join(env.LOG_DIR, 'api-error.log'),
      level: 'error',
      format: productionFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
    // Auch in Konsole (für Docker-Logs)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: TIMESTAMP_FORMAT }),
        winston.format.printf(({ timestamp, level, message }) =>
          `[${String(timestamp)}] ${level.toUpperCase()}: ${String(message)}`,
        ),
      ),
    }),
  ];
}

/** Zentraler Logger der gesamten API */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  transports: createTransports(),
  // Unbehandelte Ausnahmen abfangen
  exceptionHandlers: env.IS_PRODUCTION
    ? [new winston.transports.File({ filename: path.join(env.LOG_DIR, 'api-exceptions.log') })]
    : [],
  exitOnError: false,
});

```

## apps/api/src/middleware/error.middleware.ts
```typescript
/**
 * @file apps/api/src/middleware/error.middleware.ts
 * @description Zentraler Fehlerbehandlungs-Middleware für Express.
 *
 * Fängt alle unbehandelten Fehler ab und gibt einheitliche Fehler-Responses zurück.
 * Verhindert dass Stack-Traces und interne Details an den Client gelangen.
 *
 * Einbinden in app.ts:
 *   app.use(errorMiddleware)    // MUSS nach allen anderen Middlewares kommen!
 */

import type { NextFunction, Request, Response, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { logger } from '@/config/logger';
import { API_ERROR_CODES } from '@gutachten/shared';

/** Eigene Fehler-Klasse für HTTP-Fehler */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Erstellt einen standardisierten 404-Fehler */
export function notFound(resource: string, id?: string): AppError {
  const msg = id
    ? `${resource} mit ID "${id}" wurde nicht gefunden.`
    : `${resource} wurde nicht gefunden.`;
  return new AppError(404, API_ERROR_CODES.NOT_FOUND, msg);
}

/** Erstellt einen standardisierten 409-Konflikt-Fehler */
export function conflict(message: string): AppError {
  return new AppError(409, API_ERROR_CODES.CONFLICT, message);
}

/**
 * Express Error-Middleware.
 * Signatur mit 4 Parametern ist wichtig — Express erkennt Error-Middlewares daran!
 */
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Zod-Validierungsfehler (ungültige Request-Daten)
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: 'Eingabedaten sind ungültig.',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Eigene App-Fehler (404, 409, etc.)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Unbekannte Fehler — Intern loggen, generische Antwort senden
  const error = err instanceof Error ? err : new Error(String(err));
  logger.error('Unbehandelter Fehler', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: {
      code: API_ERROR_CODES.INTERNAL_ERROR,
      message: 'Ein interner Serverfehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    },
  });
}

/**
 * Wraps an async Express handler so that errors are forwarded to next().
 * Without this wrapper, unhandled promise rejections crash the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

```

## apps/api/src/services/backup.service.ts
```typescript
/**
 * @file apps/api/src/services/backup.service.ts
 * @description Automatisches Backup-System mit node-cron.
 *
 * Erstellt täglich einen JSON-Export aller wichtigen Daten.
 * Alte Backups werden nach BACKUP_RETENTION_DAYS automatisch gelöscht.
 *
 * Standard-Schedule: täglich um 02:00 Uhr (konfigurierbar via BACKUP_CRON_SCHEDULE)
 */

import fs from 'fs';
import path from 'path';

import cron from 'node-cron';
import { prisma } from '@gutachten/database';

import { env } from '@/config/env';
import { logger } from '@/config/logger';

/** Erstellt ein JSON-Backup aller Daten */
async function erstelleBackup(): Promise<void> {
  const startzeit = Date.now();
  const zeitstempel = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dateiname = `backup-${zeitstempel}.json`;
  const dateipfad = path.join(env.BACKUP_DIR, dateiname);

  logger.info(`Backup wird erstellt: ${dateiname}`);

  try {
    // Alle Kerndaten exportieren
    const [gutachten, kunden, gutachter, termine, featureFlags] = await Promise.all([
      prisma.gutachten.findMany({
        include: {
          kunde: true,
          gutachter: true,
          fahrzeuge: true,
          personen: true,
          schadensposten: true,
          notizen: true,
          aufgaben: true,
          unfall: true,         // korrekt: unfall (nicht unfalldaten)
        },
      }),
      prisma.kunde.findMany(),  // korrekt: prisma.kunde (Modell heißt Kunde, nicht Kunden)
      prisma.gutachter.findMany(),
      prisma.termin.findMany(),
      prisma.featureFlag.findMany(),
    ]);

    const backup = {
      meta: {
        version: '2026.03.1',
        erstellt: new Date().toISOString(),
        eintraege: {
          gutachten: gutachten.length,
          kunden: kunden.length,
          gutachter: gutachter.length,
          termine: termine.length,
        },
      },
      gutachten,
      kunden,
      gutachter,
      termine,
      featureFlags,
    };

    fs.writeFileSync(dateipfad, JSON.stringify(backup, null, 2), 'utf-8');

    const dauer = Date.now() - startzeit;
    const groesse = (fs.statSync(dateipfad).size / 1024).toFixed(1);
    logger.info(`Backup erfolgreich: ${dateiname} (${groesse} KB, ${dauer}ms)`);

    // Alte Backups bereinigen
    await bereinigePalteBackups();
  } catch (error) {
    logger.error('Backup fehlgeschlagen', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Löscht Backup-Dateien die älter als BACKUP_RETENTION_DAYS sind */
async function bereinigePalteBackups(): Promise<void> {
  const grenzeDatum = Date.now() - env.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  if (!fs.existsSync(env.BACKUP_DIR)) return;

  const dateien = fs.readdirSync(env.BACKUP_DIR);
  let geloescht = 0;

  for (const datei of dateien) {
    if (!datei.startsWith('backup-') || !datei.endsWith('.json')) continue;
    const dateipfad = path.join(env.BACKUP_DIR, datei);
    const stat = fs.statSync(dateipfad);
    if (stat.mtimeMs < grenzeDatum) {
      fs.unlinkSync(dateipfad);
      geloescht++;
      logger.info(`Altes Backup gelöscht: ${datei}`);
    }
  }

  if (geloescht > 0) {
    logger.info(`${geloescht} alte Backup(s) bereinigt`);
  }
}

/** Gibt eine Liste aller verfügbaren Backups zurück */
export function listeBackups(): Array<{ dateiname: string; groesse: number; erstellt: Date }> {
  if (!fs.existsSync(env.BACKUP_DIR)) return [];

  return fs
    .readdirSync(env.BACKUP_DIR)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
    .map((f) => {
      const stat = fs.statSync(path.join(env.BACKUP_DIR, f));
      return { dateiname: f, groesse: stat.size, erstellt: stat.mtime };
    })
    .sort((a, b) => b.erstellt.getTime() - a.erstellt.getTime());
}

/** Startet den Backup-Cron-Job */
export function starteBackupCron(): void {
  const schedule = env.BACKUP_CRON_SCHEDULE;

  if (!cron.validate(schedule)) {
    logger.error(`Ungültiger Backup-Cron-Schedule: ${schedule}`);
    return;
  }

  cron.schedule(schedule, () => {
    erstelleBackup().catch((error) => {
      logger.error('Backup-Cron fehlgeschlagen', { error });
    });
  });

  logger.info(`Backup-Cron gestartet: ${schedule} (Retention: ${env.BACKUP_RETENTION_DAYS} Tage)`);
}

/** Manuelles sofortiges Backup (für API-Endpunkt) */
export { erstelleBackup };

```

## apps/api/src/lib/aktenzeichen.ts
```typescript
/**
 * @file apps/api/src/lib/aktenzeichen.ts
 * @description Aktenzeichen-Generator für Gutachten.
 *
 * Format: GA-JJJJ-NNN (z.B. GA-2026-001, GA-2026-042)
 *   GA   = Gutachten (Präfix)
 *   JJJJ = 4-stelliges Jahr
 *   NNN  = Fortlaufende Nummer (mindestens 3-stellig)
 *
 * Die Nummer wird pro Jahr zurückgesetzt (GA-2026-001, GA-2027-001).
 */

import { prisma } from '@gutachten/database';

/**
 * Generiert das nächste verfügbare Aktenzeichen für das aktuelle Jahr.
 * Ist thread-safe durch die Datenbank-Unique-Constraint.
 *
 * @returns Aktenzeichen im Format "GA-JJJJ-NNN"
 */
export async function generiereAktenzeichen(): Promise<string> {
  const jahr = new Date().getFullYear();
  const praefix = `GA-${jahr}-`;

  // Letztes Aktenzeichen dieses Jahres finden
  const letztesGutachten = await prisma.gutachten.findFirst({
    where: {
      aktenzeichen: {
        startsWith: praefix,
      },
    },
    orderBy: {
      aktenzeichen: 'desc',
    },
    select: {
      aktenzeichen: true,
    },
  });

  let naechsteNummer = 1;

  if (letztesGutachten) {
    // Nummer aus dem letzten Aktenzeichen extrahieren
    const teile = letztesGutachten.aktenzeichen.split('-');
    const letzteNummer = parseInt(teile[2] ?? '0', 10);
    if (!isNaN(letzteNummer)) {
      naechsteNummer = letzteNummer + 1;
    }
  }

  // Nummer auf mindestens 3 Stellen auffüllen
  return `${praefix}${String(naechsteNummer).padStart(3, '0')}`;
}

/**
 * Validiert ob ein manuell eingegebenes Aktenzeichen dem Format entspricht.
 * Erlaubt auch freie Formate (nur Länge wird geprüft).
 *
 * @param aktenzeichen Das zu prüfende Aktenzeichen
 * @returns true wenn gültig
 */
export function validiereAktenzeichen(aktenzeichen: string): boolean {
  if (aktenzeichen.trim().length < 3) { return false; }
  if (aktenzeichen.trim().length > 50) { return false; }
  return true;
}

```

## apps/api/src/lib/pagination.ts
```typescript
/**
 * @file apps/api/src/lib/pagination.ts
 * @description Hilfsfunktionen für paginierte Datenbankabfragen.
 *
 * Standardisiert Pagination-Logik für alle Listen-Endpunkte.
 * Vermeidet Code-Duplizierung in Controllers.
 */

import type { PaginationMeta } from '@gutachten/shared';

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/**
 * Verarbeitet Pagination-Query-Parameter mit Standardwerten.
 * @param page Seite (1-basiert, Standard: 1)
 * @param pageSize Einträge pro Seite (Standard: 20, Max: 100)
 */
export function parsePagination(
  page?: string | number,
  pageSize?: string | number,
): PaginationParams {
  const p = Math.max(1, parseInt(String(page ?? 1), 10) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(String(pageSize ?? 20), 10) || 20));

  return {
    page: p,
    pageSize: ps,
    skip: (p - 1) * ps,
    take: ps,
  };
}

/**
 * Erstellt das PaginationMeta-Objekt für API-Responses.
 * @param total Gesamtanzahl der Einträge
 * @param params Pagination-Parameter
 */
export function createPaginationMeta(total: number, params: PaginationParams): PaginationMeta {
  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.ceil(total / params.pageSize),
  };
}

```

## apps/web/src/components/layout/AppProviders.tsx
```typescript
/**
 * @file apps/web/src/components/layout/AppProviders.tsx
 * @description Client-Component das alle Provider für die App bereitstellt.
 *
 * Provider-Hierarchie (innen nach außen):
 *   QueryClientProvider → React Query (API-Caching)
 *   ThemeProvider       → MUI Theme (Light/Dark Mode)
 *   CssBaseline         → Globale CSS-Normalisierung
 *
 * Als 'use client' Komponente umschließt es den Server-Component-Baum.
 */

'use client';

import React, { useMemo } from 'react';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { useThemeStore } from '@/store/theme.store';
import { darkTheme, lightTheme } from '@/styles/theme';

/** React Query Client-Konfiguration */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Daten werden nach 5 Minuten als veraltet betrachtet
      staleTime: 5 * 60 * 1000,
      // Automatisch im Hintergrund neu laden wenn Fenster fokussiert wird
      refetchOnWindowFocus: false,
      // Bei Fehler: 2 Wiederholungsversuche
      retry: 2,
    },
    mutations: {
      // Mutations nicht automatisch wiederholen
      retry: false,
    },
  },
});

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  const { mode } = useThemeStore();

  // Theme-Objekt wird nur neu erstellt wenn sich der Modus ändert
  const theme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
        {/* React Query Devtools — nur in Entwicklung sichtbar */}
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

```

## apps/web/src/components/layout/Sidebar.tsx
```typescript
/**
 * @file apps/web/src/components/layout/Sidebar.tsx
 * @description Sidebar-Navigation für das Dashboard-Layout.
 *
 * Zeigt alle Hauptbereiche als Navigation an.
 * Auf Mobile: als Drawer (Overlay)
 * Auf Desktop: als feste Seitenleiste
 */

'use client';

import React from 'react';

import AssessmentIcon from '@mui/icons-material/Assessment';
import BadgeIcon from '@mui/icons-material/Badge';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const SIDEBAR_WIDTH = 240;

/** Navigations-Einträge */
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Gutachten', href: '/gutachten', icon: <DescriptionIcon /> },
  { label: 'Kunden', href: '/kunden', icon: <PeopleIcon /> },
  { label: 'Gutachter', href: '/gutachter', icon: <BadgeIcon /> },
  { label: 'Kalender', href: '/kalender', icon: <CalendarMonthIcon /> },
  { label: 'Suche', href: '/suche', icon: <SearchIcon /> },
] as const;

const BOTTOM_NAV_ITEMS = [
  { label: 'Berichte', href: '/berichte', icon: <AssessmentIcon /> },
  { label: 'Admin', href: '/admin', icon: <SettingsIcon /> },
] as const;

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function SidebarContent(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo/Titel */}
      <Toolbar sx={{ px: 2 }}>
        <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" fontWeight={700} noWrap>
          Gutachten
        </Typography>
      </Toolbar>

      <Divider />

      {/* Haupt-Navigation */}
      <List sx={{ flex: 1, pt: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={isActive}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { backgroundColor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Untere Navigation */}
      <List sx={{ pb: 1 }}>
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={isActive}
                sx={{ mx: 1, borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps): React.JSX.Element {
  return (
    <Box
      component="nav"
      sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}
    >
      {/* Mobile: Drawer Overlay */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <SidebarContent />
      </Drawer>

      {/* Desktop: Permanenter Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
        open
      >
        <SidebarContent />
      </Drawer>
    </Box>
  );
}

```

## apps/web/src/components/layout/TopBar.tsx
```typescript
/**
 * @file apps/web/src/components/layout/TopBar.tsx
 * @description Obere Navigationsleiste mit Hamburger-Menü und Theme-Toggle.
 */

'use client';

import React from 'react';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { usePathname } from 'next/navigation';

import { useThemeStore } from '@/store/theme.store';

import { SIDEBAR_WIDTH } from './Sidebar';

/** Seitentitel aus URL ableiten */
function getTitel(pathname: string): string {
  if (pathname.startsWith('/dashboard')) { return 'Dashboard'; }
  if (pathname.startsWith('/gutachten/neu')) { return 'Neues Gutachten'; }
  if (pathname.includes('/gutachten/')) { return 'Gutachten-Details'; }
  if (pathname.startsWith('/gutachten')) { return 'Gutachten'; }
  if (pathname.startsWith('/kunden')) { return 'Kundenverwaltung'; }
  if (pathname.startsWith('/kalender')) { return 'Kalender'; }
  if (pathname.startsWith('/admin')) { return 'Administration'; }
  return 'Gutachten-Manager';
}

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps): React.JSX.Element {
  const { mode, toggleTheme } = useThemeStore();
  const pathname = usePathname();
  const titel = getTitel(pathname);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        ml: { md: `${SIDEBAR_WIDTH}px` },
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Toolbar>
        {/* Hamburger-Menü (nur Mobile) */}
        <IconButton
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' } }}
          aria-label="Navigation öffnen"
        >
          <MenuIcon />
        </IconButton>

        {/* Seitentitel */}
        <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 600 }}>
          {titel}
        </Typography>

        {/* Dark/Light Mode Toggle */}
        <IconButton
          onClick={toggleTheme}
          aria-label={mode === 'dark' ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
        >
          {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}

```

## apps/web/src/app/layout.tsx
```typescript
/**
 * @file apps/web/src/app/layout.tsx
 * @description Root-Layout für die gesamte Next.js-Anwendung.
 *
 * Stellt bereit:
 *   - MUI ThemeProvider (Light/Dark Mode)
 *   - React Query Provider (für API-Caching)
 *   - Globale CSS-Stile
 *
 * Dieses Layout wird für ALLE Seiten verwendet.
 * Seiten-spezifische Layouts sind in (dashboard)/layout.tsx.
 */

import type { Metadata } from 'next';

import { AppProviders } from '@/components/layout/AppProviders';

export const metadata: Metadata = {
  title: {
    default: 'Gutachten-Manager',
    template: '%s | Gutachten-Manager',
  },
  description: 'Professionelles Management-System für unfallanalytische und unfalltechnische Gutachten',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="de">
      <body suppressHydrationWarning>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}

```

## apps/web/src/app/page.tsx
```typescript
/**
 * @file apps/web/src/app/page.tsx
 * @description Startseite — leitet direkt zum Dashboard weiter.
 */

import { redirect } from 'next/navigation';

export default function HomePage(): never {
  redirect('/dashboard');
}

```

## apps/web/src/app/(dashboard)/layout.tsx
```typescript
'use client';

// Alle Dashboard-Seiten dynamisch rendern (keine statische Generierung)
// noetig weil Seiten API-Calls und useSearchParams verwenden
export const dynamic = 'force-dynamic';

/**
 * @file apps/web/src/app/(dashboard)/layout.tsx
 * @description Layout für alle Dashboard-Seiten.
 *
 * Enthält: TopBar (oben) + Sidebar (links) + Hauptinhalt (rechts)
 * Dieses Layout gilt für alle Seiten unter (dashboard)/.
 */

import React, { useState } from 'react';

import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';

import { Sidebar, SIDEBAR_WIDTH } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps): React.JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Obere Leiste */}
      <TopBar onMenuClick={() => setMobileOpen(true)} />

      {/* Seitenleiste */}
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Hauptinhalt */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          ml: { md: `${SIDEBAR_WIDTH}px` },
          backgroundColor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {/* Platzhalter für die fixierte TopBar */}
        <Toolbar />

        {/* Seiteninhalt mit Padding */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/suche/page.tsx
```typescript
'use client';

// Next.js 15: useSearchParams braucht Suspense-Grenze + force-dynamic auf Seitenebene
export const dynamic = 'force-dynamic';

/**
 * @file apps/web/src/app/(dashboard)/suche/page.tsx
 * @description Volltextsuche über Gutachten, Kunden und Gutachter.
 */

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import SearchIcon from '@mui/icons-material/Search';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

import { sucheApi, type SucheResult } from '@/lib/api/suche.api';

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  AUFGENOMMEN: 'default',
  BEAUFTRAGT: 'info',
  BESICHTIGUNG: 'primary',
  ENTWURF: 'warning',
  FREIGABE: 'secondary',
  FERTIG: 'success',
  ARCHIV: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiv',
};

// ─── Innere Komponente (nutzt useSearchParams — muss in <Suspense> liegen) ───

function SucheInhalt(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQ);
  const [result, setResult] = useState<SucheResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (q.trim().length < 2) {
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    sucheApi
      .suche(q.trim(), 20)
      .then(setResult)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (initialQ) { search(initialQ); }
  }, [initialQ, search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (val.trim()) params.set('q', val.trim());
      router.replace(`/suche${params.size ? `?${params}` : ''}`);
      search(val);
    }, 300);
  };

  const total = result?.total ?? 0;
  const hasResults = result && total > 0;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Suche
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          autoFocus
          placeholder="Suche nach Gutachten, Kunden, Gutachtern..."
          value={query}
          onChange={handleChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading ? <CircularProgress size={20} /> : <SearchIcon />}
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          Fehler: {error}
        </Typography>
      )}

      {query.trim().length >= 2 && !loading && !hasResults && !error && (
        <Typography color="text.secondary">Keine Ergebnisse für &ldquo;{query}&rdquo;.</Typography>
      )}

      {hasResults && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {total} Ergebnis{total !== 1 ? 'se' : ''} für &ldquo;{query}&rdquo;
        </Typography>
      )}

      {/* Gutachten */}
      {result && result.gutachten.length > 0 && (
        <Paper sx={{ mb: 2 }}>
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Gutachten ({result.gutachten.length})
            </Typography>
          </Box>
          <Divider />
          <List disablePadding>
            {result.gutachten.map((g, i) => (
              <React.Fragment key={g.id}>
                {i > 0 && <Divider component="li" />}
                <ListItem disablePadding>
                  <ListItemButton component={Link} href={`/gutachten/${g.id}`}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14 }}>
                        G
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography fontWeight={600}>{g.titel}</Typography>
                          <Chip
                            label={STATUS_LABELS[g.status] ?? g.status}
                            color={STATUS_COLORS[g.status] ?? 'default'}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={g.aktenzeichen}
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Kunden */}
      {result && result.kunden.length > 0 && (
        <Paper sx={{ mb: 2 }}>
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Kunden ({result.kunden.length})
            </Typography>
          </Box>
          <Divider />
          <List disablePadding>
            {result.kunden.map((k, i) => (
              <React.Fragment key={k.id}>
                {i > 0 && <Divider component="li" />}
                <ListItem disablePadding>
                  <ListItemButton component={Link} href={`/kunden/${k.id}`}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36, fontSize: 14 }}>
                        K
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${k.vorname ?? ''} ${k.nachname}`.trim()}
                      secondary={k.email ?? undefined}
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Gutachter */}
      {result && result.gutachter.length > 0 && (
        <Paper sx={{ mb: 2 }}>
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Gutachter ({result.gutachter.length})
            </Typography>
          </Box>
          <Divider />
          <List disablePadding>
            {result.gutachter.map((g, i) => (
              <React.Fragment key={g.id}>
                {i > 0 && <Divider component="li" />}
                <ListItem disablePadding>
                  <ListItemButton component={Link} href={`/gutachter/${g.id}`}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.main', width: 36, height: 36, fontSize: 14 }}>
                        E
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${g.vorname} ${g.nachname}`}
                      secondary={g.email ?? undefined}
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}

// ─── Äußere Seite: Suspense-Wrapper für useSearchParams ──────────────────────

export default function SuchePage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress />
        </Box>
      }
    >
      <SucheInhalt />
    </Suspense>
  );
}

```

## apps/web/src/app/(dashboard)/admin/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/admin/page.tsx
 * @description Admin-Panel.
 */

'use client';

import React, { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { adminApi, type FeatureFlag } from '@/lib/api/admin.api';

export default function AdminPage(): React.JSX.Element {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .listFlags()
      .then(setFlags)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (name: string, aktiv: boolean) => {
    try {
      const updated = await adminApi.toggleFlag(name, aktiv);
      setFlags((prev) => prev.map((f) => (f.name === name ? updated : f)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren.');
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Admin-Panel
      </Typography>

      <Card>
        <CardHeader
          title="Feature-Flags"
          subheader="Funktionen aktivieren oder deaktivieren"
        />
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 3 }}>
              <Typography color="error">{error}</Typography>
            </Box>
          ) : flags.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary">Keine Feature-Flags konfiguriert.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Beschreibung</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Aktiv</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flags.map((flag) => (
                    <TableRow key={flag.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                          {flag.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{flag.beschreibung ?? '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={flag.aktiv ? 'Aktiv' : 'Inaktiv'}
                          color={flag.aktiv ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Switch
                          checked={flag.aktiv}
                          onChange={(e) => handleToggle(flag.name, e.target.checked)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/gutachter/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/gutachter/page.tsx
 * @description Gutachter-Listenansicht.
 */

'use client';

import React, { useEffect, useState } from 'react';

import AddIcon from '@mui/icons-material/Add';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

import { gutachterApi, type Gutachter } from '@/lib/api/gutachter.api';

export default function GutachterPage(): React.JSX.Element {
  const [gutachter, setGutachter] = useState<Gutachter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gutachterApi
      .list()
      .then((res) => setGutachter(res.gutachter))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Gutachter
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} component={Link} href="/gutachter/new">
          Neuer Gutachter
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : gutachter.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <BadgeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" gutterBottom>
              Noch keine Gutachter angelegt.
            </Typography>
            <Button variant="outlined" component={Link} href="/gutachter/new">
              Ersten Gutachter anlegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {gutachter.map((g) => (
            <Grid item xs={12} sm={6} md={4} key={g.id}>
              <Card sx={{ height: '100%' }}>
                <CardActionArea component={Link} href={`/gutachter/${g.id}`} sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {g.vorname} {g.nachname}
                    </Typography>
                    {g.fachgebiet && (
                      <Chip
                        label={g.fachgebiet}
                        size="small"
                        variant="outlined"
                        sx={{ mb: 1.5, maxWidth: '100%' }}
                      />
                    )}
                    {g.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {g.email}
                        </Typography>
                      </Box>
                    )}
                    {g.telefon && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {g.telefon}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/gutachter/new/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/gutachter/new/page.tsx
 * @description Neuen Gutachter anlegen.
 */

'use client';

import React, { useState } from 'react';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { gutachterApi } from '@/lib/api/gutachter.api';

export default function NewGutachterPage(): React.JSX.Element {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    fachgebiet: '',
  });

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vorname.trim() || !form.nachname.trim()) {
      setError('Vor- und Nachname sind Pflichtfelder.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const g = await gutachterApi.create({
        vorname: form.vorname,
        nachname: form.nachname,
        email: form.email || undefined,
        telefon: form.telefon || undefined,
        fachgebiet: form.fachgebiet || undefined,
      });
      router.push(`/gutachter/${g.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen.');
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} component={Link} href="/gutachter" color="inherit">
          Zurück
        </Button>
        <Typography variant="h4" fontWeight={700}>
          Neuer Gutachter
        </Typography>
      </Box>

      <Card sx={{ maxWidth: 700 }}>
        <CardHeader title="Gutachterdaten" />
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Vorname *"
                  value={form.vorname}
                  onChange={handleChange('vorname')}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nachname *"
                  value={form.nachname}
                  onChange={handleChange('nachname')}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="E-Mail"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefon"
                  value={form.telefon}
                  onChange={handleChange('telefon')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Fachgebiet"
                  value={form.fachgebiet}
                  onChange={handleChange('fachgebiet')}
                  placeholder="z.B. Unfallanalyse, KFZ-Bewertung"
                  fullWidth
                />
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="outlined" component={Link} href="/gutachter" disabled={saving}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : undefined}
              >
                Gutachter anlegen
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/gutachter/[id]/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/gutachter/[id]/page.tsx
 * @description Gutachter-Detailansicht.
 */

'use client';

import React, { useEffect, useState } from 'react';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import WorkIcon from '@mui/icons-material/Work';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { gutachterApi, type Gutachter } from '@/lib/api/gutachter.api';
import { gutachtenApi, type Gutachten } from '@/lib/api/gutachten.api';

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  AUFGENOMMEN: 'default',
  BEAUFTRAGT: 'primary',
  BESICHTIGUNG: 'primary',
  ENTWURF: 'warning',
  FREIGABE: 'warning',
  FERTIG: 'success',
  ARCHIV: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiviert',
};

export default function GutachterDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [gutachter, setGutachter] = useState<Gutachter | null>(null);
  const [gutachten, setGutachten] = useState<Gutachten[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      gutachterApi.findById(id),
      gutachtenApi.list({ gutachterId: id, pageSize: 50 }),
    ])
      .then(([g, gList]) => {
        setGutachter(g);
        setGutachten(gList.gutachten);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await gutachterApi.delete(id);
      router.push('/gutachter');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen.');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !gutachter) {
    return (
      <Box>
        <Typography color="error">{error ?? 'Gutachter nicht gefunden.'}</Typography>
        <Button startIcon={<ArrowBackIcon />} component={Link} href="/gutachter" sx={{ mt: 2 }}>
          Zurück
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ArrowBackIcon />} component={Link} href="/gutachter" color="inherit">
            Zurück
          </Button>
          <Typography variant="h4" fontWeight={700}>
            {gutachter.vorname} {gutachter.nachname}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            component={Link}
            href={`/gutachter/${id}/edit`}
          >
            Bearbeiten
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteOpen(true)}
          >
            Löschen
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Stammdaten */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Kontaktdaten" />
            <CardContent>
              {gutachter.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <EmailIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    <a href={`mailto:${gutachter.email}`} style={{ color: 'inherit' }}>
                      {gutachter.email}
                    </a>
                  </Typography>
                </Box>
              )}
              {gutachter.telefon && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography variant="body2">{gutachter.telefon}</Typography>
                </Box>
              )}
              {gutachter.fachgebiet && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <WorkIcon fontSize="small" color="action" sx={{ mt: 0.3 }} />
                  <Typography variant="body2">{gutachter.fachgebiet}</Typography>
                </Box>
              )}
              {!gutachter.email && !gutachter.telefon && !gutachter.fachgebiet && (
                <Typography variant="body2" color="text.secondary">Keine Kontaktdaten hinterlegt.</Typography>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Erstellt</Typography>
              <Typography variant="body2">
                {new Date(gutachter.createdAt).toLocaleDateString('de-DE', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Gutachten-Liste */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title={`Gutachten (${gutachten.length})`}
              action={
                <Button
                  size="small"
                  variant="outlined"
                  component={Link}
                  href={`/gutachten/new?gutachterId=${id}`}
                >
                  Neues Gutachten
                </Button>
              }
            />
            <Divider />
            {gutachten.length === 0 ? (
              <CardContent>
                <Typography color="text.secondary" variant="body2">
                  Noch keine Gutachten für diesen Gutachter.
                </Typography>
              </CardContent>
            ) : (
              <List disablePadding>
                {gutachten.map((g, i) => (
                  <React.Fragment key={g.id}>
                    {i > 0 && <Divider component="li" />}
                    <ListItem
                      component={Link}
                      href={`/gutachten/${g.id}`}
                      sx={{ '&:hover': { bgcolor: 'action.hover' }, textDecoration: 'none', color: 'inherit' }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontWeight={600}>{g.titel}</Typography>
                            <Chip
                              label={STATUS_LABELS[g.status] ?? g.status}
                              color={STATUS_COLORS[g.status] ?? 'default'}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={g.aktenzeichen}
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Löschen-Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Gutachter löschen?</DialogTitle>
        <DialogContent>
          <Typography>
            Soll <strong>{gutachter.vorname} {gutachter.nachname}</strong> wirklich gelöscht werden?
            {gutachten.length > 0 && (
              <> Es sind noch <strong>{gutachten.length} Gutachten</strong> diesem Gutachter zugeordnet.</>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Abbrechen</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/gutachter/[id]/edit/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/gutachter/[id]/edit/page.tsx
 * @description Gutachter bearbeiten.
 */

'use client';

import React, { useEffect, useState } from 'react';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { gutachterApi } from '@/lib/api/gutachter.api';

export default function GutachterEditPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    fachgebiet: '',
  });

  useEffect(() => {
    gutachterApi
      .findById(id)
      .then((g) => {
        setForm({
          vorname: g.vorname,
          nachname: g.nachname,
          email: g.email ?? '',
          telefon: g.telefon ?? '',
          fachgebiet: g.fachgebiet ?? '',
        });
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vorname.trim() || !form.nachname.trim()) {
      setError('Vor- und Nachname sind Pflichtfelder.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await gutachterApi.update(id, {
        vorname: form.vorname,
        nachname: form.nachname,
        email: form.email || undefined,
        telefon: form.telefon || undefined,
        fachgebiet: form.fachgebiet || undefined,
      });
      router.push(`/gutachter/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} component={Link} href={`/gutachter/${id}`} color="inherit">
          Zurück
        </Button>
        <Typography variant="h4" fontWeight={700}>
          Gutachter bearbeiten
        </Typography>
      </Box>

      <Card sx={{ maxWidth: 700 }}>
        <CardHeader title="Gutachterdaten" />
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Vorname *"
                  value={form.vorname}
                  onChange={handleChange('vorname')}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nachname *"
                  value={form.nachname}
                  onChange={handleChange('nachname')}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="E-Mail"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefon"
                  value={form.telefon}
                  onChange={handleChange('telefon')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Fachgebiet"
                  value={form.fachgebiet}
                  onChange={handleChange('fachgebiet')}
                  fullWidth
                />
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="outlined" component={Link} href={`/gutachter/${id}`} disabled={saving}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : undefined}
              >
                Speichern
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/kalender/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/kalender/page.tsx
 * @description Kalender-Ansicht mit Terminen.
 */

'use client';

import React, { useEffect, useState } from 'react';

import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { termineApi, type Termin } from '@/lib/api/termine.api';

export default function KalenderPage(): React.JSX.Element {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTermin, setNewTermin] = useState({
    titel: '',
    start: '',
    ende: '',
    ort: '',
    beschreibung: '',
  });

  const loadTermine = () => {
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    setLoading(true);
    termineApi
      .list({ von: now.toISOString(), bis: in90Days.toISOString() })
      .then(setTermine)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadTermine, []);

  const handleSave = async () => {
    if (!newTermin.titel || !newTermin.start || !newTermin.ende) { return; }
    setSaving(true);
    try {
      await termineApi.create({
        titel: newTermin.titel,
        start: new Date(newTermin.start).toISOString(),
        ende: new Date(newTermin.ende).toISOString(),
        ort: newTermin.ort || undefined,
        beschreibung: newTermin.beschreibung || undefined,
      });
      setDialogOpen(false);
      setNewTermin({ titel: '', start: '', ende: '', ort: '', beschreibung: '' });
      loadTermine();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  // Termine nach Datum gruppieren
  const termineByDate = termine.reduce<Record<string, Termin[]>>((acc, t) => {
    const date = new Date(t.start).toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) { acc[date] = []; }
    acc[date].push(t);
    return acc;
  }, {});

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Kalender
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Neuer Termin
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : termine.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">
              Keine Termine in den nächsten 90 Tagen.
            </Typography>
            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setDialogOpen(true)}>
              Ersten Termin erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(termineByDate).map(([date, tList]) => (
          <Box key={date} sx={{ mb: 3 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              {date}
            </Typography>
            <Card>
              <List dense>
                {tList.map((t, idx) => (
                  <ListItem
                    key={t.id}
                    sx={{
                      borderBottom: idx < tList.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Box
                      sx={{
                        width: 4,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: t.farbe ?? 'primary.main',
                        mr: 2,
                        flexShrink: 0,
                      }}
                    />
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight={600}>
                            {t.titel}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(t.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            {t.ende && (
                              <>
                                {' – '}
                                {new Date(t.ende).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                              </>
                            )}
                          </Typography>
                          {t.gutachten && (
                            <Chip
                              label={t.gutachten.aktenzeichen}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          {t.ort && <span>Ort: {t.ort}</span>}
                          {t.beschreibung && <span> — {t.beschreibung}</span>}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Card>
          </Box>
        ))
      )}

      {/* Neuer Termin Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Neuer Termin</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Titel *"
              value={newTermin.titel}
              onChange={(e) => setNewTermin((p) => ({ ...p, titel: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Start *"
              type="datetime-local"
              value={newTermin.start}
              onChange={(e) => setNewTermin((p) => ({ ...p, start: e.target.value }))}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Ende *"
              type="datetime-local"
              value={newTermin.ende}
              onChange={(e) => setNewTermin((p) => ({ ...p, ende: e.target.value }))}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Ort"
              value={newTermin.ort}
              onChange={(e) => setNewTermin((p) => ({ ...p, ort: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Beschreibung"
              value={newTermin.beschreibung}
              onChange={(e) => setNewTermin((p) => ({ ...p, beschreibung: e.target.value }))}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !newTermin.titel || !newTermin.start || !newTermin.ende}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/gutachten/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/gutachten/page.tsx
 * @description Gutachten-Listenansicht.
 */

'use client';

import React, { useState } from 'react';

import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { gutachtenApi, type GutachtenStatus } from '@/lib/api/gutachten.api';

const STATUS_LABELS: Record<GutachtenStatus, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiv',
};

const STATUS_COLORS: Record<GutachtenStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  AUFGENOMMEN: 'default',
  BEAUFTRAGT: 'info',
  BESICHTIGUNG: 'primary',
  ENTWURF: 'warning',
  FREIGABE: 'secondary',
  FERTIG: 'success',
  ARCHIV: 'default',
};

export default function GutachtenListePage(): React.JSX.Element {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [suche, setSuche] = useState('');
  const [data, setData] = React.useState<Awaited<ReturnType<typeof gutachtenApi.list>> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    gutachtenApi
      .list({ page: page + 1, pageSize: rowsPerPage, suche: suche || undefined })
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, suche]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Gutachten
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={Link}
          href="/gutachten/new"
        >
          Neues Gutachten
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Suchen nach Aktenzeichen, Titel..."
          value={suche}
          onChange={(e) => { setSuche(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Aktenzeichen</TableCell>
                  <TableCell>Titel</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Auftraggeber</TableCell>
                  <TableCell>Gutachter</TableCell>
                  <TableCell>Frist</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.gutachten.map((g) => (
                  <TableRow
                    key={g.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/gutachten/${g.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {g.aktenzeichen}
                      </Typography>
                    </TableCell>
                    <TableCell>{g.titel}</TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[g.status]}
                        color={STATUS_COLORS[g.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {g.kunde
                        ? `${g.kunde.vorname ?? ''} ${g.kunde.nachname}`.trim()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {g.gutachter
                        ? `${g.gutachter.vorname} ${g.gutachter.nachname}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {g.frist
                        ? new Date(g.frist).toLocaleDateString('de-DE')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.gutachten.length) && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Keine Gutachten gefunden.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={data?.meta.total ?? 0}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage="Zeilen pro Seite:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} von ${count}`}
            />
          </>
        )}
      </TableContainer>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/gutachten/new/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/gutachten/new/page.tsx
 * @description Seite: Neues Gutachten erstellen.
 */

'use client';

import React, { useState } from 'react';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { gutachtenApi, type GutachtenStatus } from '@/lib/api/gutachten.api';

const STATUS_OPTIONS: Array<{ value: GutachtenStatus; label: string }> = [
  { value: 'AUFGENOMMEN', label: 'Aufgenommen' },
  { value: 'BEAUFTRAGT', label: 'Beauftragt' },
  { value: 'BESICHTIGUNG', label: 'Besichtigung' },
  { value: 'ENTWURF', label: 'Entwurf' },
];

export default function NewGutachtenPage(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    titel: '',
    aktenzeichen: '',
    status: 'AUFGENOMMEN' as GutachtenStatus,
    beschreibung: '',
    frist: '',
    auftragsdatum: '',
  });

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titel.trim()) {
      setError('Bitte geben Sie einen Titel ein.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const gutachten = await gutachtenApi.create({
        titel: form.titel,
        aktenzeichen: form.aktenzeichen || undefined,
        status: form.status,
        beschreibung: form.beschreibung || undefined,
        frist: form.frist ? new Date(form.frist).toISOString() : null,
        auftragsdatum: form.auftragsdatum ? new Date(form.auftragsdatum).toISOString() : null,
      });
      router.push(`/gutachten/${gutachten.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Gutachtens.');
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          component={Link}
          href="/gutachten"
          color="inherit"
        >
          Zurück
        </Button>
        <Typography variant="h4" fontWeight={700}>
          Neues Gutachten
        </Typography>
      </Box>

      <Card sx={{ maxWidth: 800 }}>
        <CardHeader title="Gutachten-Details" />
        <CardContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}

            <TextField
              label="Titel *"
              value={form.titel}
              onChange={handleChange('titel')}
              required
              fullWidth
              helperText="Kurze Beschreibung des Gutachtens"
            />

            <TextField
              label="Aktenzeichen"
              value={form.aktenzeichen}
              onChange={handleChange('aktenzeichen')}
              fullWidth
              helperText="Leer lassen für automatische Vergabe (z.B. GA-2026-001)"
            />

            <TextField
              label="Status"
              value={form.status}
              onChange={handleChange('status')}
              select
              fullWidth
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Auftragsdatum"
              type="date"
              value={form.auftragsdatum}
              onChange={handleChange('auftragsdatum')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Frist"
              type="date"
              value={form.frist}
              onChange={handleChange('frist')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Beschreibung"
              value={form.beschreibung}
              onChange={handleChange('beschreibung')}
              multiline
              rows={4}
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                component={Link}
                href="/gutachten"
                disabled={loading}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : undefined}
              >
                Gutachten erstellen
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/gutachten/[id]/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/gutachten/[id]/page.tsx
 * @description Gutachten-Detailansicht mit vollständigen Unterressourcen-Tabs.
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import DeleteIcon from '@mui/icons-material/Delete';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import NoteIcon from '@mui/icons-material/Note';
import PeopleIcon from '@mui/icons-material/People';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import WarningIcon from '@mui/icons-material/Warning';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { gutachtenApi, type GutachtenDetail, type GutachtenStatus } from '@/lib/api/gutachten.api';
import {
  subresourcesApi,
  type Aufgabe,
  type CreateAufgabeInput,
  type CreateFahrzeugInput,
  type CreateNotizInput,
  type CreatePersonInput,
  type CreateSchadenspostenInput,
  type Datei,
  type Fahrzeug,
  type Notiz,
  type Person,
  type PersonTyp,
  type Schadensposten,
  type Unfalldaten,
  type AuditEintrag,
} from '@/lib/api/subresources.api';

const STATUS_LABELS: Record<GutachtenStatus, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiv',
};

const STATUS_COLORS: Record<
  GutachtenStatus,
  'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
> = {
  AUFGENOMMEN: 'default',
  BEAUFTRAGT: 'info',
  BESICHTIGUNG: 'primary',
  ENTWURF: 'warning',
  FREIGABE: 'secondary',
  FERTIG: 'success',
  ARCHIV: 'default',
};

const STATUS_UEBERGAENGE: Record<GutachtenStatus, GutachtenStatus[]> = {
  AUFGENOMMEN: ['BEAUFTRAGT'],
  BEAUFTRAGT: ['AUFGENOMMEN', 'BESICHTIGUNG'],
  BESICHTIGUNG: ['ENTWURF'],
  ENTWURF: ['BESICHTIGUNG', 'FREIGABE'],
  FREIGABE: ['ENTWURF', 'FERTIG'],
  FERTIG: ['ARCHIV'],
  ARCHIV: [],
};

// PersonTyp-Enum gemäß Prisma-Schema (PersonTyp)
const PERSON_TYP_LABELS: Record<string, string> = {
  FAHRER: 'Fahrer',
  BEIFAHRER: 'Beifahrer',
  FUSSGAENGER: 'Fußgänger',
  ZEUGE: 'Zeuge',
  VERLETZTE: 'Verletzte',
};

// ─── Tab-Panel ────────────────────────────────────────────────────────────────

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
      {value === index && children}
    </Box>
  );
}

// ─── Fahrzeuge-Tab ────────────────────────────────────────────────────────────

function FahrzeugeTab({ gutachtenId }: { gutachtenId: string }) {
  const [items, setItems] = useState<Fahrzeug[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateFahrzeugInput>({ kennzeichen: '', marke: '', modell: '' });

  const load = useCallback(() => {
    subresourcesApi.fahrzeuge.list(gutachtenId).then(setItems).finally(() => setLoading(false));
  }, [gutachtenId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.kennzeichen || !form.marke || !form.modell) return;
    await subresourcesApi.fahrzeuge.create(gutachtenId, form);
    setOpen(false);
    setForm({ kennzeichen: '', marke: '', modell: '' });
    load();
  };

  const handleDelete = async (id: string) => {
    await subresourcesApi.fahrzeuge.delete(gutachtenId, id);
    load();
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)}>
          Fahrzeug hinzufügen
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary">Noch keine Fahrzeuge erfasst.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Kennzeichen</TableCell>
              <TableCell>Marke / Modell</TableCell>
              <TableCell>Baujahr</TableCell>
              <TableCell>Farbe</TableCell>
              <TableCell>FIN</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.kennzeichen}</TableCell>
                <TableCell>{[f.marke, f.modell].filter(Boolean).join(' ') || '—'}</TableCell>
                <TableCell>{f.baujahr ?? '—'}</TableCell>
                <TableCell>{f.farbe ?? '—'}</TableCell>
                <TableCell>{f.fahrgestell ?? '—'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleDelete(f.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Fahrzeug hinzufügen</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Kennzeichen" value={form.kennzeichen ?? ''} onChange={(e) => setForm((p) => ({ ...p, kennzeichen: e.target.value }))} />
          <TextField required label="Marke" value={form.marke} onChange={(e) => setForm((p) => ({ ...p, marke: e.target.value }))} />
          <TextField required label="Modell" value={form.modell} onChange={(e) => setForm((p) => ({ ...p, modell: e.target.value }))} />
          <TextField label="Baujahr" type="number" value={form.baujahr ?? ''} onChange={(e) => setForm((p) => ({ ...p, baujahr: Number(e.target.value) || undefined }))} />
          <TextField label="Farbe" value={form.farbe ?? ''} onChange={(e) => setForm((p) => ({ ...p, farbe: e.target.value }))} />
          <TextField label="FIN (Fahrgestellnummer)" value={form.fahrgestell ?? ''} onChange={(e) => setForm((p) => ({ ...p, fahrgestell: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Personen-Tab ─────────────────────────────────────────────────────────────

function PersonenTab({ gutachtenId }: { gutachtenId: string }) {
  const [items, setItems] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreatePersonInput>({ typ: 'FAHRER', vorname: '', nachname: '' });

  const load = useCallback(() => {
    subresourcesApi.personen.list(gutachtenId).then(setItems).finally(() => setLoading(false));
  }, [gutachtenId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.nachname) return;
    await subresourcesApi.personen.create(gutachtenId, form);
    setOpen(false);
    setForm({ typ: 'FAHRER', vorname: '', nachname: '' });
    load();
  };

  const handleDelete = async (id: string) => {
    await subresourcesApi.personen.delete(gutachtenId, id);
    load();
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)}>
          Person hinzufügen
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary">Noch keine Personen erfasst.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Typ</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>E-Mail</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Chip label={PERSON_TYP_LABELS[p.typ] ?? p.typ} size="small" />
                </TableCell>
                <TableCell>{[p.vorname, p.nachname].filter(Boolean).join(' ')}</TableCell>
                <TableCell>{p.telefon ?? '—'}</TableCell>
                <TableCell>{p.email ?? '—'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleDelete(p.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Person hinzufügen</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Select value={form.typ} onChange={(e) => setForm((p) => ({ ...p, typ: e.target.value as PersonTyp }))}>
            {Object.entries(PERSON_TYP_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </Select>
          <TextField label="Vorname" value={form.vorname ?? ''} onChange={(e) => setForm((p) => ({ ...p, vorname: e.target.value }))} />
          <TextField required label="Nachname" value={form.nachname} onChange={(e) => setForm((p) => ({ ...p, nachname: e.target.value }))} />
          <TextField label="Telefon" value={form.telefon ?? ''} onChange={(e) => setForm((p) => ({ ...p, telefon: e.target.value }))} />
          <TextField label="E-Mail" value={form.email ?? ''} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <TextField label="Adresse" value={form.adresse ?? ''} onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.nachname}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Schaden-Tab ──────────────────────────────────────────────────────────────

const SCHADENS_KATEGORIEN = [
  'Reparatur', 'Wertminderung', 'Nutzungsausfall', 'Gutachterkosten',
  'Mietwagenkosten', 'Abschleppkosten', 'Sonstiges',
];

function SchadenTab({ gutachtenId }: { gutachtenId: string }) {
  const [posten, setPosten] = useState<Schadensposten[]>([]);
  const [gesamtEuro, setGesamtEuro] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  // betragCents: Eingabe in Euro, intern in Cents umrechnen
  const [euroEingabe, setEuroEingabe] = useState('');
  const [form, setForm] = useState<Omit<CreateSchadenspostenInput, 'betragCents'>>({
    position: 1,
    bezeichnung: '',
    kategorie: 'Reparatur',
  });

  const load = useCallback(() => {
    subresourcesApi.schaden.list(gutachtenId)
      .then((res) => {
        setPosten(res.posten);
        setGesamtEuro(res.summen.gesamtEuro); // korrekt: summen.gesamtEuro
      })
      .finally(() => setLoading(false));
  }, [gutachtenId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.bezeichnung || !euroEingabe) return;
    const betragCents = Math.round(parseFloat(euroEingabe.replace(',', '.')) * 100);
    if (isNaN(betragCents) || betragCents <= 0) return;
    await subresourcesApi.schaden.create(gutachtenId, { ...form, betragCents });
    setOpen(false);
    setForm({ position: posten.length + 2, bezeichnung: '', kategorie: 'Reparatur' });
    setEuroEingabe('');
    load();
  };

  const handleDelete = async (id: string) => {
    await subresourcesApi.schaden.delete(gutachtenId, id);
    load();
  };

  const fmt = (euro: number) => euro.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

  if (loading) return <CircularProgress size={24} />;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Gesamtschaden: <strong>{fmt(gesamtEuro)}</strong></Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => {
          setForm({ position: posten.length + 1, bezeichnung: '', kategorie: 'Reparatur' });
          setOpen(true);
        }}>
          Posten hinzufügen
        </Button>
      </Box>

      {posten.length === 0 ? (
        <Typography color="text.secondary">Noch keine Schadensposten erfasst.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Bezeichnung</TableCell>
              <TableCell>Kategorie</TableCell>
              <TableCell align="right">Betrag</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {posten.map((sp) => (
              <TableRow key={sp.id}>
                <TableCell>{sp.position}</TableCell>
                <TableCell>{sp.bezeichnung}</TableCell>       {/* korrekt: bezeichnung */}
                <TableCell>{sp.kategorie}</TableCell>        {/* korrekt: kategorie */}
                <TableCell align="right">{fmt(sp.betragCents / 100)}</TableCell>  {/* Cents → Euro */}
                <TableCell>
                  <IconButton size="small" onClick={() => handleDelete(sp.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} align="right"><strong>Gesamt</strong></TableCell>
              <TableCell align="right"><strong>{fmt(gesamtEuro)}</strong></TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schadensposten hinzufügen</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField required label="Bezeichnung" value={form.bezeichnung}
            onChange={(e) => setForm((p) => ({ ...p, bezeichnung: e.target.value }))} />
          <Select value={form.kategorie}
            onChange={(e) => setForm((p) => ({ ...p, kategorie: e.target.value }))}>
            {SCHADENS_KATEGORIEN.map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
          </Select>
          <TextField required label="Betrag (€)" value={euroEingabe} placeholder="z.B. 1500.00"
            onChange={(e) => setEuroEingabe(e.target.value)} />
          <TextField label="Position" type="number" value={form.position}
            onChange={(e) => setForm((p) => ({ ...p, position: Number(e.target.value) }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave}
            disabled={!form.bezeichnung || !euroEingabe}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Notizen-Tab ──────────────────────────────────────────────────────────────

function NotizenTab({ gutachtenId }: { gutachtenId: string }) {
  const [items, setItems] = useState<Notiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [inhalt, setInhalt] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    subresourcesApi.notizen.list(gutachtenId).then(setItems).finally(() => setLoading(false));
  }, [gutachtenId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!inhalt.trim()) return;
    setSaving(true);
    await subresourcesApi.notizen.create(gutachtenId, { inhalt });
    setInhalt('');
    setSaving(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await subresourcesApi.notizen.delete(gutachtenId, id);
    load();
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Neue Notiz"
          value={inhalt}
          onChange={(e) => setInhalt(e.target.value)}
          placeholder="Notiz eingeben..."
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Button variant="contained" onClick={handleSave} disabled={saving || !inhalt.trim()}>
            Notiz speichern
          </Button>
        </Box>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary">Noch keine Notizen vorhanden.</Typography>
      ) : (
        <List disablePadding>
          {items.map((n, i) => (
            <React.Fragment key={n.id}>
              {i > 0 && <Divider />}
              <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                <ListItemText
                  primary={<Typography sx={{ whiteSpace: 'pre-wrap' }}>{n.inhalt}</Typography>}
                  secondary={`${n.autor ?? 'System'} · ${new Date(n.createdAt).toLocaleString('de-DE')}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" size="small" onClick={() => handleDelete(n.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}
    </>
  );
}

// ─── Aufgaben-Tab ─────────────────────────────────────────────────────────────

function AufgabenTab({ gutachtenId }: { gutachtenId: string }) {
  const [items, setItems] = useState<Aufgabe[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateAufgabeInput>({ titel: '' });

  const load = useCallback(() => {
    subresourcesApi.aufgaben.list(gutachtenId).then(setItems).finally(() => setLoading(false));
  }, [gutachtenId]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id: string, erledigt: boolean) => {
    await subresourcesApi.aufgaben.toggleErledigt(gutachtenId, id, !erledigt);
    load();
  };

  const handleSave = async () => {
    if (!form.titel) return;
    await subresourcesApi.aufgaben.create(gutachtenId, form);
    setOpen(false);
    setForm({ titel: '' });
    load();
  };

  const handleDelete = async (id: string) => {
    await subresourcesApi.aufgaben.delete(gutachtenId, id);
    load();
  };

  const offen = items.filter((a) => !a.erledigt).length;

  if (loading) return <CircularProgress size={24} />;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography color="text.secondary">{offen} offene Aufgabe{offen !== 1 ? 'n' : ''}</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)}>
          Aufgabe hinzufügen
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary">Noch keine Aufgaben vorhanden.</Typography>
      ) : (
        <List disablePadding>
          {items.map((a, i) => (
            <React.Fragment key={a.id}>
              {i > 0 && <Divider />}
              <ListItem sx={{ px: 0 }}>
                <IconButton size="small" onClick={() => handleToggle(a.id, a.erledigt)} sx={{ mr: 1 }}>
                  {a.erledigt ? <CheckBoxIcon color="success" /> : <CheckBoxOutlineBlankIcon />}
                </IconButton>
                <ListItemText
                  primary={
                    <Typography sx={{ textDecoration: a.erledigt ? 'line-through' : 'none', color: a.erledigt ? 'text.secondary' : 'text.primary' }}>
                      {a.titel}
                    </Typography>
                  }
                  secondary={[
                    a.zugewiesen && `Zugewiesen: ${a.zugewiesen}`,
                    a.faelligAm && `Fällig: ${new Date(a.faelligAm).toLocaleDateString('de-DE')}`,
                  ].filter(Boolean).join(' · ')}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" size="small" onClick={() => handleDelete(a.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Aufgabe hinzufügen</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField required label="Titel" value={form.titel} onChange={(e) => setForm((p) => ({ ...p, titel: e.target.value }))} />
          <TextField label="Beschreibung" multiline rows={2} value={form.beschreibung ?? ''} onChange={(e) => setForm((p) => ({ ...p, beschreibung: e.target.value }))} />
          <TextField label="Zugewiesen an" value={form.zugewiesen ?? ''} onChange={(e) => setForm((p) => ({ ...p, zugewiesen: e.target.value }))} />
          <TextField label="Fällig am" type="date" InputLabelProps={{ shrink: true }} value={form.faelligAm ?? ''} onChange={(e) => setForm((p) => ({ ...p, faelligAm: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.titel}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Dateien-Tab ──────────────────────────────────────────────────────────────

function DateienTab({ gutachtenId }: { gutachtenId: string }) {
  const [items, setItems] = useState<Datei[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    subresourcesApi.dateien.list(gutachtenId).then(setItems).finally(() => setLoading(false));
  }, [gutachtenId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('datei', file);
    await subresourcesApi.dateien.upload(gutachtenId, fd);
    setUploading(false);
    load();
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    await subresourcesApi.dateien.delete(gutachtenId, id);
    load();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button component="label" startIcon={<AttachFileIcon />} variant="contained" disabled={uploading}>
          {uploading ? 'Wird hochgeladen...' : 'Datei hochladen'}
          <input type="file" hidden onChange={handleUpload} />
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary">Noch keine Dateien hochgeladen.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Dateiname</TableCell>
              <TableCell>Typ</TableCell>
              <TableCell>Größe</TableCell>
              <TableCell>Hochgeladen</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <a
                    href={subresourcesApi.dateien.downloadUrl(gutachtenId, d.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {d.originalname}
                  </a>
                </TableCell>
                <TableCell>{d.mimetype}</TableCell>
                <TableCell>{formatSize(d.groesse)}</TableCell>
                <TableCell>{new Date(d.createdAt).toLocaleDateString('de-DE')}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleDelete(d.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

// ─── Unfalldaten-Tab ──────────────────────────────────────────────────────────

function UnfalldatenTab({ gutachtenId }: { gutachtenId: string }) {
  const [data, setData] = useState<Unfalldaten | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    strasse: '',
    plz: '',
    stadt: '',
    unfallZeit: '',
    unfallHergang: '',
    strassenzustand: '',     // korrekt: strassenzustand (nicht strassenverhaeltnisse)
    wetterlage: '',          // korrekt: wetterlage (nicht witterung)
    lichtverhaeltnis: '',    // korrekt: lichtverhaeltnis (nicht lichtverhaeltnisse)
    polizeiAktenzeichen: '',
  });

  useEffect(() => {
    subresourcesApi.unfall.get(gutachtenId)
      .then((res) => {
        if (res) {
          setData(res);
          setForm({
            strasse: res.strasse ?? '',
            plz: res.plz ?? '',
            stadt: res.stadt ?? '',
            unfallZeit: res.unfallZeit ? res.unfallZeit.substring(0, 16) : '',
            unfallHergang: res.unfallHergang ?? '',
            strassenzustand: res.strassenzustand ?? '',
            wetterlage: res.wetterlage ?? '',
            lichtverhaeltnis: res.lichtverhaeltnis ?? '',
            polizeiAktenzeichen: res.polizeiAktenzeichen ?? '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [gutachtenId]);

  const handleSave = async () => {
    setSaving(true);
    const res = await subresourcesApi.unfall.upsert(gutachtenId, {
      strasse: form.strasse || undefined,
      plz: form.plz || undefined,
      stadt: form.stadt || undefined,
      unfallZeit: form.unfallZeit ? new Date(form.unfallZeit).toISOString() : undefined,
      unfallHergang: form.unfallHergang || undefined,
      strassenzustand: form.strassenzustand || undefined,
      wetterlage: form.wetterlage || undefined,
      lichtverhaeltnis: form.lichtverhaeltnis || undefined,
      polizeiAktenzeichen: form.polizeiAktenzeichen || undefined,
    });
    setData(res);
    setSaving(false);
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField fullWidth label="Straße" value={form.strasse} onChange={(e) => setForm((p) => ({ ...p, strasse: e.target.value }))} />
      </Grid>
      <Grid item xs={12} md={2}>
        <TextField fullWidth label="PLZ" value={form.plz} onChange={(e) => setForm((p) => ({ ...p, plz: e.target.value }))} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Stadt" value={form.stadt} onChange={(e) => setForm((p) => ({ ...p, stadt: e.target.value }))} />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth label="Unfallzeit" type="datetime-local" InputLabelProps={{ shrink: true }} value={form.unfallZeit} onChange={(e) => setForm((p) => ({ ...p, unfallZeit: e.target.value }))} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Straßenzustand" value={form.strassenzustand} onChange={(e) => setForm((p) => ({ ...p, strassenzustand: e.target.value }))} placeholder="TROCKEN, NASS, VEREIST…" />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Wetterlage" value={form.wetterlage} onChange={(e) => setForm((p) => ({ ...p, wetterlage: e.target.value }))} placeholder="KLAR, REGEN, SCHNEE…" />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Lichtverhältnis" value={form.lichtverhaeltnis} onChange={(e) => setForm((p) => ({ ...p, lichtverhaeltnis: e.target.value }))} placeholder="z.B. Tag, Nacht, Dämmerung" />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth label="Polizei-Aktenzeichen" value={form.polizeiAktenzeichen} onChange={(e) => setForm((p) => ({ ...p, polizeiAktenzeichen: e.target.value }))} />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth multiline rows={4} label="Unfallhergang" value={form.unfallHergang} onChange={(e) => setForm((p) => ({ ...p, unfallHergang: e.target.value }))} />
      </Grid>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Wird gespeichert...' : 'Unfalldaten speichern'}
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}

// ─── Audit-Tab ────────────────────────────────────────────────────────────────

function AuditTab({ gutachtenId }: { gutachtenId: string }) {
  const [items, setItems] = useState<AuditEintrag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subresourcesApi.audit.list(gutachtenId).then(setItems).finally(() => setLoading(false));
  }, [gutachtenId]);

  if (loading) return <CircularProgress size={24} />;

  return items.length === 0 ? (
    <Typography color="text.secondary">Keine Audit-Einträge vorhanden.</Typography>
  ) : (
    <List disablePadding>
      {items.map((e, i) => (
        <React.Fragment key={e.id}>
          {i > 0 && <Divider />}
          <ListItem sx={{ px: 0 }}>
            <ListItemText
              primary={e.aktion}
              secondary={[
                e.autor && `von ${e.autor}`,
                new Date(e.createdAt).toLocaleString('de-DE'),
              ].filter(Boolean).join(' · ')}
            />
            {e.details && (
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, ml: 2 }}>
                {e.details}
              </Typography>
            )}
          </ListItem>
        </React.Fragment>
      ))}
    </List>
  );
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────

export default function GutachtenDetailPage(): React.JSX.Element {
  const params = useParams();
  const id = params.id as string;

  const [gutachten, setGutachten] = useState<GutachtenDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    gutachtenApi
      .findById(id)
      .then(setGutachten)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus: GutachtenStatus) => {
    if (!gutachten) return;
    setStatusChanging(true);
    try {
      const updated = await gutachtenApi.updateStatus(id, newStatus);
      setGutachten((prev) => prev ? { ...prev, status: updated.status } : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status konnte nicht geändert werden.');
    } finally {
      setStatusChanging(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !gutachten) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography color="error">{error ?? 'Gutachten nicht gefunden.'}</Typography>
        <Button component={Link} href="/gutachten" startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
          Zurück zur Liste
        </Button>
      </Box>
    );
  }

  const erlaubteStatus = STATUS_UEBERGAENGE[gutachten.status];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} component={Link} href="/gutachten" color="inherit" sx={{ mb: 1 }}>
            Alle Gutachten
          </Button>
          <Typography variant="h4" fontWeight={700}>{gutachten.aktenzeichen}</Typography>
          <Typography variant="h6" color="text.secondary">{gutachten.titel}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip label={STATUS_LABELS[gutachten.status]} color={STATUS_COLORS[gutachten.status]} />
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            component="a"
            href={`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'}/gutachten/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            PDF
          </Button>
          <Button variant="outlined" startIcon={<EditIcon />} component={Link} href={`/gutachten/${id}/edit`}>
            Bearbeiten
          </Button>
        </Box>
      </Box>

      {/* Stammdaten + Workflow */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Stammdaten" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Aktenzeichen</Typography>
                  <Typography variant="body1" fontWeight={600}>{gutachten.aktenzeichen}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Typography variant="body1">{STATUS_LABELS[gutachten.status]}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Auftraggeber</Typography>
                  <Typography variant="body1">
                    {gutachten.kunde
                      ? `${gutachten.kunde.vorname ?? ''} ${gutachten.kunde.nachname}`.trim()
                      : '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Gutachter</Typography>
                  <Typography variant="body1">
                    {gutachten.gutachter
                      ? `${gutachten.gutachter.vorname} ${gutachten.gutachter.nachname}`
                      : '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Auftragsdatum</Typography>
                  <Typography variant="body1">
                    {gutachten.auftragsdatum ? new Date(gutachten.auftragsdatum).toLocaleDateString('de-DE') : '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Frist</Typography>
                  <Typography
                    variant="body1"
                    color={gutachten.frist && new Date(gutachten.frist) < new Date() ? 'error' : 'text.primary'}
                  >
                    {gutachten.frist ? new Date(gutachten.frist).toLocaleDateString('de-DE') : '—'}
                  </Typography>
                </Grid>
                {gutachten.beschreibung && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary">Beschreibung</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                      {gutachten.beschreibung}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Workflow" />
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>Aktueller Status:</Typography>
              <Chip label={STATUS_LABELS[gutachten.status]} color={STATUS_COLORS[gutachten.status]} sx={{ mb: 2 }} />
              {erlaubteStatus.length > 0 && (
                <>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Status ändern zu:</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {erlaubteStatus.map((status) => (
                      <Button key={status} variant="outlined" size="small" disabled={statusChanging} onClick={() => handleStatusChange(status)}>
                        {STATUS_LABELS[status]}
                      </Button>
                    ))}
                  </Box>
                </>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Erstellt: {new Date(gutachten.createdAt).toLocaleDateString('de-DE')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Geändert: {new Date(gutachten.updatedAt).toLocaleDateString('de-DE')}
              </Typography>
            </CardContent>
          </Card>

          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Offene Aufgaben: {gutachten._count.aufgaben}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Dateien: {gutachten._count.dateien}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Unterressourcen-Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab icon={<WarningIcon />} iconPosition="start" label="Unfalldaten" />
            <Tab icon={<DirectionsCarIcon />} iconPosition="start" label="Fahrzeuge" />
            <Tab icon={<PeopleIcon />} iconPosition="start" label="Personen" />
            <Tab icon={<TaskAltIcon />} iconPosition="start" label="Schaden" />
            <Tab icon={<NoteIcon />} iconPosition="start" label="Notizen" />
            <Tab icon={<CheckBoxOutlineBlankIcon />} iconPosition="start" label="Aufgaben" />
            <Tab icon={<AttachFileIcon />} iconPosition="start" label="Dateien" />
            <Tab icon={<HistoryIcon />} iconPosition="start" label="Protokoll" />
          </Tabs>
        </Box>

        <CardContent>
          <TabPanel value={tab} index={0}><UnfalldatenTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={1}><FahrzeugeTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={2}><PersonenTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={3}><SchadenTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={4}><NotizenTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={5}><AufgabenTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={6}><DateienTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={7}><AuditTab gutachtenId={id} /></TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/gutachten/[id]/edit/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/gutachten/[id]/edit/page.tsx
 * @description Gutachten bearbeiten.
 */

'use client';

import React, { useEffect, useState } from 'react';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { gutachtenApi, type GutachtenStatus } from '@/lib/api/gutachten.api';

const STATUS_OPTIONS: Array<{ value: GutachtenStatus; label: string }> = [
  { value: 'AUFGENOMMEN', label: 'Aufgenommen' },
  { value: 'BEAUFTRAGT', label: 'Beauftragt' },
  { value: 'BESICHTIGUNG', label: 'Besichtigung' },
  { value: 'ENTWURF', label: 'Entwurf' },
  { value: 'FREIGABE', label: 'Freigabe' },
  { value: 'FERTIG', label: 'Fertig' },
  { value: 'ARCHIV', label: 'Archiv' },
];

export default function EditGutachtenPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    titel: '',
    aktenzeichen: '',
    status: 'AUFGENOMMEN' as GutachtenStatus,
    beschreibung: '',
    frist: '',
    auftragsdatum: '',
  });

  useEffect(() => {
    gutachtenApi
      .findById(id)
      .then((g) => {
        setForm({
          titel: g.titel,
          aktenzeichen: g.aktenzeichen,
          status: g.status,
          beschreibung: g.beschreibung ?? '',
          frist: g.frist ? new Date(g.frist).toISOString().split('T')[0] : '',
          auftragsdatum: g.auftragsdatum
            ? new Date(g.auftragsdatum).toISOString().split('T')[0]
            : '',
        });
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await gutachtenApi.update(id, {
        titel: form.titel,
        aktenzeichen: form.aktenzeichen,
        status: form.status,
        beschreibung: form.beschreibung || undefined,
        frist: form.frist ? new Date(form.frist).toISOString() : null,
        auftragsdatum: form.auftragsdatum ? new Date(form.auftragsdatum).toISOString() : null,
      });
      router.push(`/gutachten/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} component={Link} href={`/gutachten/${id}`} color="inherit">
          Zurück
        </Button>
        <Typography variant="h4" fontWeight={700}>
          Gutachten bearbeiten
        </Typography>
      </Box>

      <Card sx={{ maxWidth: 800 }}>
        <CardHeader title={form.aktenzeichen} />
        <CardContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}

            <TextField
              label="Titel *"
              value={form.titel}
              onChange={handleChange('titel')}
              required
              fullWidth
            />

            <TextField
              label="Aktenzeichen"
              value={form.aktenzeichen}
              onChange={handleChange('aktenzeichen')}
              fullWidth
            />

            <TextField
              label="Status"
              value={form.status}
              onChange={handleChange('status')}
              select
              fullWidth
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Auftragsdatum"
              type="date"
              value={form.auftragsdatum}
              onChange={handleChange('auftragsdatum')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Frist"
              type="date"
              value={form.frist}
              onChange={handleChange('frist')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Beschreibung"
              value={form.beschreibung}
              onChange={handleChange('beschreibung')}
              multiline
              rows={4}
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button variant="outlined" component={Link} href={`/gutachten/${id}`} disabled={saving}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : undefined}
              >
                Speichern
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/berichte/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/berichte/page.tsx
 * @description Berichte und Statistiken.
 */

'use client';

import React, { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { dashboardApi, type DashboardStats, type MonatsuebersichtItem } from '@/lib/api/dashboard.api';
import type { GutachtenListItem } from '@/lib/api/gutachten.api';

const STATUS_LABELS: Record<string, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiviert',
};

const STATUS_COLORS_HEX: Record<string, string> = {
  AUFGENOMMEN: '#90caf9',
  BEAUFTRAGT: '#1976d2',
  BESICHTIGUNG: '#42a5f5',
  ENTWURF: '#ffa726',
  FREIGABE: '#ff7043',
  FERTIG: '#66bb6a',
  ARCHIV: '#bdbdbd',
};

const STATUS_CHIP_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  AUFGENOMMEN: 'default',
  BEAUFTRAGT: 'primary',
  BESICHTIGUNG: 'primary',
  ENTWURF: 'warning',
  FREIGABE: 'warning',
  FERTIG: 'success',
  ARCHIV: 'default',
};

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Paper sx={{ p: 2.5, textAlign: 'center' }}>
      <Typography variant="h3" fontWeight={700} color={color ?? 'text.primary'}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {label}
      </Typography>
    </Paper>
  );
}

export default function BerichtePage(): React.JSX.Element {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monats, setMonats] = useState<MonatsuebersichtItem[]>([]);
  const [fristen, setFristen] = useState<GutachtenListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getMonatsuebersicht(),
      dashboardApi.getFristen(),
    ])
      .then(([s, m, f]) => {
        setStats(s);
        setMonats(m);
        setFristen(f);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !stats) {
    return <Typography color="error">{error ?? 'Fehler beim Laden der Berichte.'}</Typography>;
  }

  const pieData = Object.entries(stats.statusVerteilung)
    .filter(([, v]) => v > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status] ?? status,
      value: count,
      color: STATUS_COLORS_HEX[status] ?? '#9e9e9e',
    }));

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Berichte
      </Typography>

      {/* KPI-Karten */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Gesamt" value={stats.gesamt} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Aktiv" value={stats.aktiv} color="primary.main" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Fertig" value={stats.fertig} color="success.main" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Überfällig" value={stats.ueberfaellige} color={stats.ueberfaellige > 0 ? 'error.main' : undefined} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Fällig in 30 Tagen" value={stats.faelligIn30Tagen} color={stats.faelligIn30Tagen > 0 ? 'warning.main' : undefined} />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Statusverteilung Pie */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Statusverteilung" />
            <Divider />
            <CardContent>
              {pieData.length === 0 ? (
                <Typography color="text.secondary" variant="body2">Keine Daten.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`${val} Gutachten`]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Monatsübersicht Bar */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Monatsübersicht (letzte 12 Monate)" />
            <Divider />
            <CardContent>
              {monats.length === 0 ? (
                <Typography color="text.secondary" variant="body2">Keine Daten.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monats} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monat" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="erstellt" name="Erstellt" fill="#1976d2" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="fertig" name="Fertig" fill="#66bb6a" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fristen-Tabelle */}
      <Card>
        <CardHeader
          title="Anstehende Fristen"
          subheader="Gutachten mit Fristen in den nächsten 30 Tagen oder bereits überfällig"
        />
        <Divider />
        {fristen.length === 0 ? (
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              Keine ausstehenden Fristen.
            </Typography>
          </CardContent>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Aktenzeichen</TableCell>
                  <TableCell>Titel</TableCell>
                  <TableCell>Kunde</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Frist</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fristen.map((g) => {
                  const isOverdue = g.frist ? new Date(g.frist) < new Date() : false;
                  return (
                    <TableRow key={g.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {g.aktenzeichen}
                        </Typography>
                      </TableCell>
                      <TableCell>{g.titel}</TableCell>
                      <TableCell>
                        {g.kunde
                          ? `${g.kunde.vorname ?? ''} ${g.kunde.nachname}`.trim()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABELS[g.status] ?? g.status}
                          color={STATUS_CHIP_COLORS[g.status] ?? 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {g.frist ? (
                          <Typography
                            variant="body2"
                            color={isOverdue ? 'error.main' : 'warning.main'}
                            fontWeight={isOverdue ? 700 : 400}
                          >
                            {new Date(g.frist).toLocaleDateString('de-DE', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            })}
                            {isOverdue && ' (Überfällig)'}
                          </Typography>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/dashboard/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/dashboard/page.tsx
 * @description Dashboard mit Statistiken und Übersichten.
 */

'use client';

import React, { useEffect, useState } from 'react';

import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassIcon from '@mui/icons-material/HourglassEmpty';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

import { dashboardApi, type DashboardStats, type MonatsuebersichtItem } from '@/lib/api/dashboard.api';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps): React.JSX.Element {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h3" fontWeight={700} color={color}>
              {value}
            </Typography>
            <Typography variant="body1" fontWeight={600} gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.8, '& svg': { fontSize: 48 } }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

const STATUS_LABELS: Record<string, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiv',
};

const STATUS_CHART_COLORS = ['#1565C0', '#1976d2', '#42a5f5', '#90caf9', '#FF6F00', '#4caf50', '#9e9e9e'];

export default function DashboardPage(): React.JSX.Element {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monatsDaten, setMonatsDaten] = useState<MonatsuebersichtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getMonatsuebersicht(),
    ])
      .then(([s, m]) => {
        setStats(s);
        setMonatsDaten(m);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  const statusChartData = stats
    ? Object.entries(stats.statusVerteilung).map(([status, count]) => ({
        name: STATUS_LABELS[status] ?? status,
        value: count,
      }))
    : [];

  const monatLabels = monatsDaten.map((m) => {
    const [year, month] = m.monat.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('de-DE', {
      month: 'short',
      year: '2-digit',
    });
  });

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Dashboard
      </Typography>

      {/* KPI-Karten */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Gesamt"
            value={stats?.gesamt ?? 0}
            icon={<AssignmentIcon />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Aktiv"
            value={stats?.aktiv ?? 0}
            icon={<HourglassIcon />}
            color="info.main"
            subtitle="In Bearbeitung"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Fertig"
            value={stats?.fertig ?? 0}
            icon={<CheckCircleIcon />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Überfällig"
            value={stats?.ueberfaellige ?? 0}
            icon={<ErrorIcon />}
            color="error.main"
            subtitle="Frist überschritten"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Monats-Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Monatliche Entwicklung" subheader="Letzte 12 Monate" />
            <CardContent>
              {monatsDaten.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monatsDaten.map((m, i) => ({ ...m, label: monatLabels[i] }))}>
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        value,
                        name === 'erstellt' ? 'Erstellt' : 'Fertig',
                      ]}
                    />
                    <Legend formatter={(v) => v === 'erstellt' ? 'Erstellt' : 'Fertig'} />
                    <Bar dataKey="erstellt" fill="#1565C0" name="erstellt" />
                    <Bar dataKey="fertig" fill="#4caf50" name="fertig" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">Noch keine Daten vorhanden.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Status-Verteilung */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Status-Verteilung" />
            <CardContent>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {statusChartData.map((_, i) => (
                        <Cell key={i} fill={STATUS_CHART_COLORS[i % STATUS_CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">Noch keine Daten vorhanden.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Aktuelle Gutachten */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Zuletzt bearbeitet"
              subheader="Letzte 10 aktive Gutachten"
            />
            <CardContent sx={{ p: 0 }}>
              {stats?.aktuelleGutachten.length ? (
                <List dense>
                  {stats.aktuelleGutachten.map((g, idx) => (
                    <ListItem
                      key={g.id}
                      component={Link}
                      href={`/gutachten/${g.id}`}
                      sx={{
                        borderBottom: idx < (stats.aktuelleGutachten.length - 1) ? '1px solid' : 'none',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={600} color="primary">
                              {g.aktenzeichen}
                            </Typography>
                            <Typography variant="body2">{g.titel}</Typography>
                            <Chip label={STATUS_LABELS[g.status] ?? g.status} size="small" sx={{ ml: 'auto' }} />
                          </Box>
                        }
                        secondary={
                          <>
                            {g.kunde && `${g.kunde.vorname ?? ''} ${g.kunde.nachname}`.trim()}
                            {g.frist && (
                              <span style={{ marginLeft: 8 }}>
                                Frist: {new Date(g.frist).toLocaleDateString('de-DE')}
                              </span>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">Noch keine Gutachten vorhanden.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/kunden/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/kunden/page.tsx
 * @description Kunden-Listenansicht.
 */

'use client';

import React, { useEffect, useState } from 'react';

import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { kundenApi, type KundenListResponse } from '@/lib/api/kunden.api';

export default function KundenListePage(): React.JSX.Element {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [suche, setSuche] = useState('');
  const [data, setData] = useState<KundenListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    kundenApi
      .list({ page: page + 1, pageSize: rowsPerPage, suche: suche || undefined })
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, suche]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Kunden
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={Link}
          href="/kunden/new"
        >
          Neuer Kunde
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Suchen nach Name, Firma, E-Mail..."
          value={suche}
          onChange={(e) => { setSuche(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 4 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Firma</TableCell>
                  <TableCell>E-Mail</TableCell>
                  <TableCell>Telefon</TableCell>
                  <TableCell>Gutachten</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.kunden.map((k) => (
                  <TableRow
                    key={k.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/kunden/${k.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {k.vorname ? `${k.vorname} ${k.nachname}` : k.nachname}
                      </Typography>
                    </TableCell>
                    <TableCell>{k.firma ?? '—'}</TableCell>
                    <TableCell>{k.email ?? '—'}</TableCell>
                    <TableCell>{k.telefon ?? k.mobil ?? '—'}</TableCell>
                    <TableCell>{k._count?.gutachten ?? 0}</TableCell>
                  </TableRow>
                ))}
                {(!data?.kunden.length) && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">Keine Kunden gefunden.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={data?.meta.total ?? 0}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage="Zeilen pro Seite:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} von ${count}`}
            />
          </>
        )}
      </TableContainer>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/kunden/new/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/kunden/new/page.tsx
 * @description Neuen Kunden anlegen.
 */

'use client';

import React, { useState } from 'react';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { kundenApi, type CreateKundeInput } from '@/lib/api/kunden.api';

export default function NewKundePage(): React.JSX.Element {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateKundeInput>({
    nachname: '',
    vorname: '',
    firma: '',
    email: '',
    telefon: '',
    mobil: '',
    strasse: '',
    plz: '',
    stadt: '',
    land: 'Deutschland',
    notizen: '',
  });

  const handleChange = (field: keyof CreateKundeInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value || null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nachname?.trim()) {
      setError('Bitte geben Sie einen Nachnamen ein.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const kunde = await kundenApi.create(form);
      router.push(`/kunden/${kunde.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Kunden.');
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} component={Link} href="/kunden" color="inherit">
          Zurück
        </Button>
        <Typography variant="h4" fontWeight={700}>
          Neuer Kunde
        </Typography>
      </Box>

      <Card sx={{ maxWidth: 900 }}>
        <CardHeader title="Kundendaten" />
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Vorname"
                  value={form.vorname ?? ''}
                  onChange={handleChange('vorname')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nachname *"
                  value={form.nachname}
                  onChange={handleChange('nachname')}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Firma"
                  value={form.firma ?? ''}
                  onChange={handleChange('firma')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="E-Mail"
                  type="email"
                  value={form.email ?? ''}
                  onChange={handleChange('email')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefon"
                  value={form.telefon ?? ''}
                  onChange={handleChange('telefon')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Mobil"
                  value={form.mobil ?? ''}
                  onChange={handleChange('mobil')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Straße"
                  value={form.strasse ?? ''}
                  onChange={handleChange('strasse')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="PLZ"
                  value={form.plz ?? ''}
                  onChange={handleChange('plz')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={8}>
                <TextField
                  label="Stadt"
                  value={form.stadt ?? ''}
                  onChange={handleChange('stadt')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notizen"
                  value={form.notizen ?? ''}
                  onChange={handleChange('notizen')}
                  multiline
                  rows={3}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="outlined" component={Link} href="/kunden" disabled={saving}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : undefined}
              >
                Kunden erstellen
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/kunden/[id]/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/kunden/[id]/page.tsx
 * @description Kunden-Detailansicht mit Gutachten und Kontakthistorie.
 */

'use client';

import React, { useEffect, useState } from 'react';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { kundenApi, type Kunde } from '@/lib/api/kunden.api';

interface KundeDetail extends Kunde {
  kontakthistorie?: Array<{
    id: string;
    art: string;
    inhalt: string;
    bearbeiter: string | null;
    kontaktDat: string;
  }>;
  gutachten?: Array<{
    id: string;
    aktenzeichen: string;
    titel: string;
    status: string;
    createdAt: string;
  }>;
}

export default function KundeDetailPage(): React.JSX.Element {
  const params = useParams();
  const id = params.id as string;

  const [kunde, setKunde] = useState<KundeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    kundenApi
      .findById(id)
      .then((k) => setKunde(k as KundeDetail))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !kunde) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography color="error">{error ?? 'Kunde nicht gefunden.'}</Typography>
        <Button component={Link} href="/kunden" startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
          Zurück zur Liste
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Button
            startIcon={<ArrowBackIcon />}
            component={Link}
            href="/kunden"
            color="inherit"
            sx={{ mb: 1 }}
          >
            Alle Kunden
          </Button>
          <Typography variant="h4" fontWeight={700}>
            {kunde.vorname ? `${kunde.vorname} ${kunde.nachname}` : kunde.nachname}
          </Typography>
          {kunde.firma && (
            <Typography variant="subtitle1" color="text.secondary">
              {kunde.firma}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          component={Link}
          href={`/kunden/${id}/edit`}
        >
          Bearbeiten
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Kontaktdaten */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Kontaktdaten" />
            <CardContent>
              {kunde.email && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">E-Mail</Typography>
                  <Typography>{kunde.email}</Typography>
                </Box>
              )}
              {kunde.telefon && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">Telefon</Typography>
                  <Typography>{kunde.telefon}</Typography>
                </Box>
              )}
              {kunde.mobil && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">Mobil</Typography>
                  <Typography>{kunde.mobil}</Typography>
                </Box>
              )}
              {(kunde.strasse || kunde.stadt) && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">Adresse</Typography>
                  <Typography>{kunde.strasse}</Typography>
                  <Typography>{[kunde.plz, kunde.stadt].filter(Boolean).join(' ')}</Typography>
                </Box>
              )}
              {kunde.notizen && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">Notizen</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {kunde.notizen}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Gutachten */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 2 }}>
            <CardHeader
              title="Gutachten"
              subheader={`${kunde.gutachten?.length ?? 0} Gutachten`}
            />
            <CardContent sx={{ p: 0 }}>
              {kunde.gutachten && kunde.gutachten.length > 0 ? (
                <List dense>
                  {kunde.gutachten.map((g) => (
                    <ListItem
                      key={g.id}
                      component={Link}
                      href={`/gutachten/${g.id}`}
                      sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={600} color="primary">
                              {g.aktenzeichen}
                            </Typography>
                            <Chip label={g.status} size="small" />
                          </Box>
                        }
                        secondary={g.titel}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 2 }}>
                  <Typography color="text.secondary" variant="body2">
                    Keine Gutachten vorhanden.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Kontakthistorie */}
          <Card>
            <CardHeader
              title="Kontakthistorie"
              subheader={`${kunde.kontakthistorie?.length ?? 0} Einträge`}
            />
            <CardContent sx={{ p: 0 }}>
              {kunde.kontakthistorie && kunde.kontakthistorie.length > 0 ? (
                <List dense>
                  {kunde.kontakthistorie.map((k) => (
                    <ListItem key={k.id} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip label={k.art} size="small" variant="outlined" />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(k.kontaktDat).toLocaleDateString('de-DE')}
                            </Typography>
                          </Box>
                        }
                        secondary={k.inhalt}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 2 }}>
                  <Typography color="text.secondary" variant="body2">
                    Keine Kontakteinträge vorhanden.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

```

## apps/web/src/app/(dashboard)/kunden/[id]/edit/page.tsx
```typescript
/**
 * @file apps/web/src/app/(dashboard)/kunden/[id]/edit/page.tsx
 * @description Kunden bearbeiten.
 */

'use client';

import React, { useEffect, useState } from 'react';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { kundenApi, type CreateKundeInput } from '@/lib/api/kunden.api';

export default function KundeEditPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateKundeInput>({
    nachname: '',
    vorname: '',
    firma: '',
    email: '',
    telefon: '',
    mobil: '',
    strasse: '',
    plz: '',
    stadt: '',
    land: 'Deutschland',
    notizen: '',
  });

  useEffect(() => {
    kundenApi
      .findById(id)
      .then((k) => {
        setForm({
          nachname: k.nachname,
          vorname: k.vorname ?? '',
          firma: k.firma ?? '',
          email: k.email ?? '',
          telefon: k.telefon ?? '',
          mobil: k.mobil ?? '',
          strasse: k.strasse ?? '',
          plz: k.plz ?? '',
          stadt: k.stadt ?? '',
          land: k.land ?? 'Deutschland',
          notizen: k.notizen ?? '',
        });
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (field: keyof CreateKundeInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value || null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nachname?.trim()) {
      setError('Bitte geben Sie einen Nachnamen ein.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await kundenApi.update(id, form);
      router.push(`/kunden/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} component={Link} href={`/kunden/${id}`} color="inherit">
          Zurück
        </Button>
        <Typography variant="h4" fontWeight={700}>
          Kunde bearbeiten
        </Typography>
      </Box>

      <Card sx={{ maxWidth: 900 }}>
        <CardHeader title="Kundendaten" />
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Vorname"
                  value={form.vorname ?? ''}
                  onChange={handleChange('vorname')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nachname *"
                  value={form.nachname}
                  onChange={handleChange('nachname')}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Firma"
                  value={form.firma ?? ''}
                  onChange={handleChange('firma')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="E-Mail"
                  type="email"
                  value={form.email ?? ''}
                  onChange={handleChange('email')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefon"
                  value={form.telefon ?? ''}
                  onChange={handleChange('telefon')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Mobil"
                  value={form.mobil ?? ''}
                  onChange={handleChange('mobil')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Straße"
                  value={form.strasse ?? ''}
                  onChange={handleChange('strasse')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="PLZ"
                  value={form.plz ?? ''}
                  onChange={handleChange('plz')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={8}>
                <TextField
                  label="Stadt"
                  value={form.stadt ?? ''}
                  onChange={handleChange('stadt')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Land"
                  value={form.land ?? ''}
                  onChange={handleChange('land')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notizen"
                  value={form.notizen ?? ''}
                  onChange={handleChange('notizen')}
                  multiline
                  rows={3}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="outlined" component={Link} href={`/kunden/${id}`} disabled={saving}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : undefined}
              >
                Speichern
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

```

## apps/web/src/styles/theme.ts
```typescript
/**
 * @file apps/web/src/styles/theme.ts
 * @description Material UI Theme-Konfiguration für den Gutachten-Manager.
 *
 * Definiert Farben, Typographie und Komponentenstile für Light und Dark Mode.
 * Das Theme wird in layout.tsx via ThemeProvider bereitgestellt.
 *
 * Primärfarbe: Professionelles Blau (gerichtlich, seriös)
 * Sekundärfarbe: Gedämpftes Blaugrau
 */

import { createTheme } from '@mui/material/styles';

// Gemeinsame Theme-Optionen für Light und Dark Mode
const commonTheme = {
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontSize: '2rem', fontWeight: 600 },
    h2: { fontSize: '1.75rem', fontWeight: 600 },
    h3: { fontSize: '1.5rem', fontWeight: 600 },
    h4: { fontSize: '1.25rem', fontWeight: 600 },
    h5: { fontSize: '1.1rem', fontWeight: 600 },
    h6: { fontSize: '1rem', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const, // Keine Großbuchstaben bei Buttons
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Kein Gradient-Overlay im Dark Mode
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
        },
      },
    },
  },
};

/** Light Mode Theme */
export const lightTheme = createTheme({
  ...commonTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#1565C0',     // Dunkles Blau — seriös, professionell
      light: '#1976D2',
      dark: '#0D47A1',
    },
    secondary: {
      main: '#455A64',     // Blaugrau
      light: '#607D8B',
      dark: '#37474F',
    },
    background: {
      default: '#F5F7FA',  // Sehr helles Grau (kein reines Weiß)
      paper: '#FFFFFF',
    },
    error: { main: '#D32F2F' },
    warning: { main: '#F57C00' },
    success: { main: '#388E3C' },
    info: { main: '#0288D1' },
  },
});

/** Dark Mode Theme */
export const darkTheme = createTheme({
  ...commonTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#42A5F5',     // Helleres Blau im Dark Mode (bessere Lesbarkeit)
      light: '#64B5F6',
      dark: '#1E88E5',
    },
    secondary: {
      main: '#78909C',
      light: '#90A4AE',
      dark: '#607D8B',
    },
    background: {
      default: '#121212',   // Echtes Material Dark Background
      paper: '#1E1E1E',
    },
    error: { main: '#EF5350' },
    warning: { main: '#FFA726' },
    success: { main: '#66BB6A' },
    info: { main: '#29B6F6' },
  },
});

```

## apps/web/src/store/theme.store.ts
```typescript
/**
 * @file apps/web/src/store/theme.store.ts
 * @description Zustand-Store für Theme (Light/Dark Mode).
 *
 * Speichert die Theme-Präferenz im localStorage damit sie nach
 * einem Neuladen erhalten bleibt.
 *
 * Verwendung:
 *   const { mode, toggleTheme } = useThemeStore()
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark';

interface ThemeStore {
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: 'light',

      toggleTheme: () =>
        set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),

      setMode: (mode: ThemeMode) => set({ mode }),
    }),
    {
      name: 'gutachten-theme', // localStorage-Key
    },
  ),
);

```

## apps/web/src/lib/api/admin.api.ts
```typescript
/**
 * @file apps/web/src/lib/api/admin.api.ts
 * @description API-Funktionen für das Admin-Modul (Feature-Flags).
 */

import { apiClient } from './client';

export interface FeatureFlag {
  id: string;
  name: string;
  beschreibung: string | null;
  aktiv: boolean;
  // kein createdAt — FeatureFlag hat nur updatedAt im Schema
  updatedAt: string;
}

export const adminApi = {
  listFlags: (): Promise<FeatureFlag[]> =>
    apiClient.get<FeatureFlag[]>('/admin/feature-flags'),

  // Route ist /admin/feature-flags/:name (name, nicht id!)
  toggleFlag: (name: string, aktiv: boolean): Promise<FeatureFlag> =>
    apiClient.patch<FeatureFlag>(`/admin/feature-flags/${encodeURIComponent(name)}`, { aktiv }),

  createFlag: (data: { name: string; beschreibung?: string; aktiv?: boolean }): Promise<FeatureFlag> =>
    apiClient.post<FeatureFlag>('/admin/feature-flags', data),
};

```

## apps/web/src/lib/api/client.ts
```typescript
/**
 * @file apps/web/src/lib/api/client.ts
 * @description Typisierter API-Client für alle Backend-Anfragen.
 *
 * Kapselt alle fetch()-Aufrufe und stellt sicher dass:
 *   - Die Basis-URL aus Umgebungsvariablen kommt
 *   - Fehler einheitlich behandelt werden
 *   - TypeScript-Typen korrekt sind
 *   - Lange Requests ordentlich abgebrochen werden (AbortSignal)
 *
 * Verwendung:
 *   import { apiClient } from '@/lib/api/client'
 *   const gutachten = await apiClient.get<Gutachten[]>('/gutachten')
 */

import type { ApiResponse } from '@gutachten/shared';

const API_BASE_URL =
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

/** Konfigurationsoptionen für API-Anfragen */
interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** Fehler der vom API-Client geworfen wird */
export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Führt eine typisierte API-Anfrage durch.
 * @throws ApiClientError bei HTTP-Fehler
 */
async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options.signal,
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success) {
    throw new ApiClientError(
      response.status,
      data.error.code,
      data.error.message,
    );
  }

  return data.data;
}

/** Upload-Anfrage (multipart/form-data) */
async function upload<T>(
  endpoint: string,
  formData: FormData,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    // Kein Content-Type Header — Browser setzt ihn automatisch mit Boundary
    body: formData,
    signal: options.signal,
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success) {
    throw new ApiClientError(
      response.status,
      data.error.code,
      data.error.message,
    );
  }

  return data.data;
}

/** Typisierter API-Client */
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>('GET', endpoint, undefined, options),

  post: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>('POST', endpoint, body, options),

  put: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>('PUT', endpoint, body, options),

  patch: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>('PATCH', endpoint, body, options),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>('DELETE', endpoint, undefined, options),

  upload: <T>(endpoint: string, formData: FormData, options?: RequestOptions) =>
    upload<T>(endpoint, formData, options),
};

```

## apps/web/src/lib/api/dashboard.api.ts
```typescript
/**
 * @file apps/web/src/lib/api/dashboard.api.ts
 * @description API-Funktionen für das Dashboard.
 */

import { apiClient } from './client';
import type { GutachtenListItem } from './gutachten.api';

export interface DashboardStats {
  gesamt: number;
  aktiv: number;
  fertig: number;
  ueberfaellige: number;
  faelligIn30Tagen: number;
  statusVerteilung: Record<string, number>;
  aktuelleGutachten: GutachtenListItem[];
}

export interface MonatsuebersichtItem {
  monat: string;
  erstellt: number;
  fertig: number;
}

export const dashboardApi = {
  getStats: (): Promise<DashboardStats> =>
    apiClient.get<DashboardStats>('/dashboard/stats'),

  getMonatsuebersicht: (): Promise<MonatsuebersichtItem[]> =>
    apiClient.get<MonatsuebersichtItem[]>('/dashboard/monatsuebersicht'),

  getFristen: (): Promise<GutachtenListItem[]> =>
    apiClient.get<GutachtenListItem[]>('/dashboard/fristen'),
};

```

## apps/web/src/lib/api/gutachten.api.ts
```typescript
/**
 * @file apps/web/src/lib/api/gutachten.api.ts
 * @description API-Funktionen für das Gutachten-Modul.
 */

import { apiClient } from './client';

export interface GutachtenListItem {
  id: string;
  aktenzeichen: string;
  titel: string;
  status: GutachtenStatus;
  frist: string | null;
  auftragsdatum: string | null;
  abschlussdatum: string | null;
  createdAt: string;
  updatedAt: string;
  kunde: { id: string; vorname: string | null; nachname: string } | null;
  gutachter: { id: string; vorname: string; nachname: string } | null;
  _count: { aufgaben: number; dateien: number };
}

export interface GutachtenDetail extends GutachtenListItem {
  beschreibung: string | null;
  verwandteGutachten: Array<{ id: string; aktenzeichen: string; titel: string; status: GutachtenStatus }>;
  verwandteMitGutachten: Array<{ id: string; aktenzeichen: string; titel: string; status: GutachtenStatus }>;
}

export type GutachtenStatus =
  | 'AUFGENOMMEN'
  | 'BEAUFTRAGT'
  | 'BESICHTIGUNG'
  | 'ENTWURF'
  | 'FREIGABE'
  | 'FERTIG'
  | 'ARCHIV';

export interface GutachtenListResponse {
  gutachten: GutachtenListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface GutachtenListQuery {
  page?: number;
  pageSize?: number;
  status?: GutachtenStatus;
  suche?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  ueberfaellig?: boolean;
  gutachterId?: string;
  kundeId?: string;
}

export type Gutachten = GutachtenListItem;

export interface CreateGutachtenInput {
  titel: string;
  beschreibung?: string;
  aktenzeichen?: string;
  status?: GutachtenStatus;
  frist?: string | null;
  auftragsdatum?: string | null;
  kundeId?: string | null;
  gutachterId?: string | null;
}

export const gutachtenApi = {
  list: (query?: GutachtenListQuery): Promise<GutachtenListResponse> => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          params.set(key, String(val));
        }
      });
    }
    const qs = params.toString();
    return apiClient.get<GutachtenListResponse>(`/gutachten${qs ? `?${qs}` : ''}`);
  },

  findById: (id: string): Promise<GutachtenDetail> =>
    apiClient.get<GutachtenDetail>(`/gutachten/${id}`),

  create: (data: CreateGutachtenInput): Promise<GutachtenDetail> =>
    apiClient.post<GutachtenDetail>('/gutachten', data),

  update: (id: string, data: Partial<CreateGutachtenInput>): Promise<GutachtenDetail> =>
    apiClient.patch<GutachtenDetail>(`/gutachten/${id}`, data),

  updateStatus: (id: string, status: GutachtenStatus, kommentar?: string): Promise<GutachtenListItem> =>
    apiClient.patch<GutachtenListItem>(`/gutachten/${id}/status`, { status, kommentar }),

  delete: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/gutachten/${id}`),
};

```

## apps/web/src/lib/api/gutachter.api.ts
```typescript
/**
 * @file apps/web/src/lib/api/gutachter.api.ts
 */
import { apiClient } from './client';

export interface Gutachter {
  id: string;
  vorname: string;
  nachname: string;
  email: string | null;
  telefon: string | null;
  fachgebiet: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GutachterListResponse {
  gutachter: Gutachter[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export const gutachterApi = {
  list: (query?: { suche?: string }): Promise<GutachterListResponse> => {
    const params = new URLSearchParams();
    if (query?.suche) { params.set('suche', query.suche); }
    const qs = params.toString();
    return apiClient.get<GutachterListResponse>(`/gutachter${qs ? `?${qs}` : ''}`);
  },

  findById: (id: string): Promise<Gutachter> =>
    apiClient.get<Gutachter>(`/gutachter/${id}`),

  create: (data: { vorname: string; nachname: string; email?: string; telefon?: string; fachgebiet?: string }): Promise<Gutachter> =>
    apiClient.post<Gutachter>('/gutachter', data),

  update: (id: string, data: Partial<{ vorname: string; nachname: string; email: string; telefon: string; fachgebiet: string }>): Promise<Gutachter> =>
    apiClient.patch<Gutachter>(`/gutachter/${id}`, data),

  delete: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/gutachter/${id}`),
};

```

## apps/web/src/lib/api/kunden.api.ts
```typescript
/**
 * @file apps/web/src/lib/api/kunden.api.ts
 * @description API-Funktionen für das Kunden-Modul.
 */

import { apiClient } from './client';

export interface Kunde {
  id: string;
  vorname: string | null;
  nachname: string;
  firma: string | null;
  email: string | null;
  telefon: string | null;
  mobil: string | null;
  strasse: string | null;
  plz: string | null;
  stadt: string | null;
  land: string | null;
  notizen: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { gutachten: number; kontakthistorie: number };
}

export interface KundenListResponse {
  kunden: Kunde[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface CreateKundeInput {
  vorname?: string | null;
  nachname: string;
  firma?: string | null;
  email?: string | null;
  telefon?: string | null;
  mobil?: string | null;
  strasse?: string | null;
  plz?: string | null;
  stadt?: string | null;
  land?: string;
  notizen?: string | null;
}

export const kundenApi = {
  list: (query?: { page?: number; pageSize?: number; suche?: string }): Promise<KundenListResponse> => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          params.set(key, String(val));
        }
      });
    }
    const qs = params.toString();
    return apiClient.get<KundenListResponse>(`/kunden${qs ? `?${qs}` : ''}`);
  },

  findById: (id: string): Promise<Kunde> =>
    apiClient.get<Kunde>(`/kunden/${id}`),

  create: (data: CreateKundeInput): Promise<Kunde> =>
    apiClient.post<Kunde>('/kunden', data),

  update: (id: string, data: Partial<CreateKundeInput>): Promise<Kunde> =>
    apiClient.patch<Kunde>(`/kunden/${id}`, data),

  delete: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/kunden/${id}`),

  addKontakt: (id: string, data: { art: string; inhalt: string; bearbeiter?: string }) =>
    apiClient.post(`/kunden/${id}/kontakte`, data),
};

```

## apps/web/src/lib/api/subresources.api.ts
```typescript
/**
 * @file apps/web/src/lib/api/subresources.api.ts
 * @description API-Funktionen für Gutachten-Unterressourcen.
 * Feldnamen entsprechen dem Prisma-Schema.
 */

import { apiClient } from './client';

// ─── Fahrzeuge ───────────────────────────────────────────────────────────────

export interface Fahrzeug {
  id: string;
  gutachtenId: string;
  kennzeichen: string;
  fahrgestell: string | null;   // FIN/VIN — korrekt: fahrgestell (nicht fahrgestellnummer)
  marke: string;
  modell: string;
  baujahr: number | null;
  farbe: string | null;
  kraftstoff: string | null;
  versicherung: string | null;
  versicherungsNr: string | null;
  createdAt: string;
}

export interface CreateFahrzeugInput {
  kennzeichen: string;           // Pflichtfeld
  marke: string;                 // Pflichtfeld
  modell: string;                // Pflichtfeld
  fahrgestell?: string;
  baujahr?: number;
  farbe?: string;
  kraftstoff?: string;
  versicherung?: string;
  versicherungsNr?: string;
}

// ─── Personen ────────────────────────────────────────────────────────────────

export interface Person {
  id: string;
  gutachtenId: string;
  typ: PersonTyp;
  vorname: string;
  nachname: string;
  geburtsdatum: string | null;
  strasse: string | null;
  plz: string | null;
  stadt: string | null;
  telefon: string | null;
  email: string | null;
  fuehrerschein: string | null;
  fuehrerscheinklasse: string | null;
  zeugenaussage: string | null;
  createdAt: string;
}

// PersonTyp-Enum gemäß Prisma-Schema
export type PersonTyp = 'FAHRER' | 'BEIFAHRER' | 'FUSSGAENGER' | 'ZEUGE' | 'VERLETZTE';

export interface CreatePersonInput {
  typ: PersonTyp;
  vorname: string;               // Pflichtfeld
  nachname: string;              // Pflichtfeld
  geburtsdatum?: string;
  strasse?: string;
  plz?: string;
  stadt?: string;
  telefon?: string;
  email?: string;
  fuehrerschein?: string;
  fuehrerscheinklasse?: string;
  zeugenaussage?: string;
}

// ─── Schadensposten ──────────────────────────────────────────────────────────

export interface Schadensposten {
  id: string;
  gutachtenId: string;
  position: number;
  bezeichnung: string;           // Hauptbezeichnung (korrekt: nicht 'beschreibung')
  beschreibung: string | null;   // Optionale Detailbeschreibung
  betragCents: number;           // In Cents (nicht betrag!)
  kategorie: string;
  createdAt: string;
}

export interface SchadenspostenSumme {
  posten: Schadensposten[];
  summen: {
    gesamtCents: number;
    gesamtEuro: number;
    anzahl: number;
  };
}

export interface CreateSchadenspostenInput {
  position: number;
  bezeichnung: string;           // Pflichtfeld
  beschreibung?: string;
  betragCents: number;           // In Cents
  kategorie: string;             // Pflichtfeld (z.B. 'Reparatur', 'Wertminderung')
}

// ─── Notizen ─────────────────────────────────────────────────────────────────

export interface Notiz {
  id: string;
  gutachtenId: string;
  inhalt: string;
  autor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotizInput {
  inhalt: string;
  autor?: string;
}

// ─── Aufgaben ─────────────────────────────────────────────────────────────────

export interface Aufgabe {
  id: string;
  gutachtenId: string;
  titel: string;
  erledigt: boolean;
  faelligAm: string | null;
  prioritaet: 'NIEDRIG' | 'NORMAL' | 'HOCH' | 'KRITISCH';
  zugewiesen: string | null;
  erledigtAm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAufgabeInput {
  titel: string;
  faelligAm?: string;
  zugewiesen?: string;
  prioritaet?: 'NIEDRIG' | 'NORMAL' | 'HOCH' | 'KRITISCH';
}

// ─── Dateien ─────────────────────────────────────────────────────────────────

export interface Datei {
  id: string;
  gutachtenId: string;
  originalname: string;
  filename: string;              // gespeicherter Name (korrekt: filename, nicht dateiname)
  pfad: string;
  mimetype: string;
  groesse: number;
  beschreibung: string | null;
  createdAt: string;
}

// ─── Audit-Log ───────────────────────────────────────────────────────────────

export interface AuditEintrag {
  id: string;
  gutachtenId: string;
  aktion: string;
  bearbeiter: string | null;
  beschreibung: string;
  alterWert: unknown | null;
  neuerWert: unknown | null;
  createdAt: string;
}

// ─── Unfalldaten ─────────────────────────────────────────────────────────────

export interface Unfalldaten {
  id: string;
  gutachtenId: string;
  unfallZeit: string | null;
  // Adresse
  strasse: string | null;
  hausnummer: string | null;
  plz: string | null;
  stadt: string | null;
  land: string | null;
  // GPS
  breitengrad: number | null;
  laengengrad: number | null;
  strassentyp: string | null;
  // Hergang
  unfallHergang: string | null;
  // Wetter & Bedingungen
  wetterlage: string | null;        // Enum: KLAR | BEWOELKT | REGEN | ...
  temperatur: number | null;
  sichtverhaeltnis: string | null;  // Enum: GUT | MITTEL | SCHLECHT | NACHT | DAEMMERUNG
  strassenzustand: string | null;   // Enum: TROCKEN | NASS | SCHNEEBEDECKT | VEREIST | VERSCHMUTZT
  lichtverhaeltnis: string | null;
  // Polizei
  polizeiAktenzeichen: string | null;
  polizeiDienststelle: string | null;
  polizeiEinsatznummer: string | null;
  polizeiProtokollDatum: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUnfalldatenInput {
  unfallZeit?: string;
  strasse?: string;
  hausnummer?: string;
  plz?: string;
  stadt?: string;
  land?: string;
  strassentyp?: string;
  unfallHergang?: string;
  wetterlage?: string;
  temperatur?: number;
  sichtverhaeltnis?: string;
  strassenzustand?: string;
  lichtverhaeltnis?: string;
  polizeiAktenzeichen?: string;
  polizeiDienststelle?: string;
}

// ─── API-Objekt ───────────────────────────────────────────────────────────────

export const subresourcesApi = {
  fahrzeuge: {
    list: (gutachtenId: string): Promise<Fahrzeug[]> =>
      apiClient.get<Fahrzeug[]>(`/gutachten/${gutachtenId}/fahrzeuge`),
    create: (gutachtenId: string, data: CreateFahrzeugInput): Promise<Fahrzeug> =>
      apiClient.post<Fahrzeug>(`/gutachten/${gutachtenId}/fahrzeuge`, data),
    update: (gutachtenId: string, id: string, data: Partial<CreateFahrzeugInput>): Promise<Fahrzeug> =>
      apiClient.patch<Fahrzeug>(`/gutachten/${gutachtenId}/fahrzeuge/${id}`, data),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/fahrzeuge/${id}`),
  },

  personen: {
    list: (gutachtenId: string): Promise<Person[]> =>
      apiClient.get<Person[]>(`/gutachten/${gutachtenId}/personen`),
    create: (gutachtenId: string, data: CreatePersonInput): Promise<Person> =>
      apiClient.post<Person>(`/gutachten/${gutachtenId}/personen`, data),
    update: (gutachtenId: string, id: string, data: Partial<CreatePersonInput>): Promise<Person> =>
      apiClient.patch<Person>(`/gutachten/${gutachtenId}/personen/${id}`, data),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/personen/${id}`),
  },

  schaden: {
    list: (gutachtenId: string): Promise<SchadenspostenSumme> =>
      apiClient.get<SchadenspostenSumme>(`/gutachten/${gutachtenId}/schaden`),
    create: (gutachtenId: string, data: CreateSchadenspostenInput): Promise<Schadensposten> =>
      apiClient.post<Schadensposten>(`/gutachten/${gutachtenId}/schaden`, data),
    update: (gutachtenId: string, id: string, data: Partial<CreateSchadenspostenInput>): Promise<Schadensposten> =>
      apiClient.patch<Schadensposten>(`/gutachten/${gutachtenId}/schaden/${id}`, data),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/schaden/${id}`),
  },

  notizen: {
    list: (gutachtenId: string): Promise<Notiz[]> =>
      apiClient.get<Notiz[]>(`/gutachten/${gutachtenId}/notizen`),
    create: (gutachtenId: string, data: CreateNotizInput): Promise<Notiz> =>
      apiClient.post<Notiz>(`/gutachten/${gutachtenId}/notizen`, data),
    update: (gutachtenId: string, id: string, data: CreateNotizInput): Promise<Notiz> =>
      apiClient.patch<Notiz>(`/gutachten/${gutachtenId}/notizen/${id}`, data),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/notizen/${id}`),
  },

  aufgaben: {
    list: (gutachtenId: string): Promise<Aufgabe[]> =>
      apiClient.get<Aufgabe[]>(`/gutachten/${gutachtenId}/aufgaben`),
    create: (gutachtenId: string, data: CreateAufgabeInput): Promise<Aufgabe> =>
      apiClient.post<Aufgabe>(`/gutachten/${gutachtenId}/aufgaben`, data),
    toggleErledigt: (gutachtenId: string, id: string, erledigt: boolean): Promise<Aufgabe> =>
      apiClient.patch<Aufgabe>(`/gutachten/${gutachtenId}/aufgaben/${id}`, { erledigt }),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/aufgaben/${id}`),
  },

  dateien: {
    list: (gutachtenId: string): Promise<Datei[]> =>
      apiClient.get<Datei[]>(`/gutachten/${gutachtenId}/dateien`),
    upload: (gutachtenId: string, formData: FormData): Promise<Datei> =>
      apiClient.upload<Datei>(`/gutachten/${gutachtenId}/dateien`, formData),
    delete: (gutachtenId: string, id: string): Promise<{ message: string }> =>
      apiClient.delete(`/gutachten/${gutachtenId}/dateien/${id}`),
    downloadUrl: (gutachtenId: string, id: string): string =>
      `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'}/gutachten/${gutachtenId}/dateien/${id}/download`,
  },

  audit: {
    list: (gutachtenId: string): Promise<AuditEintrag[]> =>
      apiClient.get<AuditEintrag[]>(`/gutachten/${gutachtenId}/audit`),
  },

  unfall: {
    get: (gutachtenId: string): Promise<Unfalldaten | null> =>
      apiClient.get<Unfalldaten | null>(`/gutachten/${gutachtenId}/unfall`),
    upsert: (gutachtenId: string, data: UpdateUnfalldatenInput): Promise<Unfalldaten> =>
      apiClient.put<Unfalldaten>(`/gutachten/${gutachtenId}/unfall`, data),
  },
};

```

## apps/web/src/lib/api/suche.api.ts
```typescript
/**
 * @file apps/web/src/lib/api/suche.api.ts
 * @description API-Funktionen für die Volltextsuche.
 */

import { apiClient } from './client';

export interface SucheResult {
  gutachten: Array<{
    id: string;
    aktenzeichen: string;
    titel: string;
    status: string;
  }>;
  kunden: Array<{
    id: string;
    vorname: string | null;
    nachname: string;
    firma: string | null;
    email: string | null;
  }>;
  gutachter: Array<{
    id: string;
    vorname: string;
    nachname: string;
    email: string | null;
  }>;
  total: number;
}

export const sucheApi = {
  suche: (q: string, limit?: number): Promise<SucheResult> => {
    const qs = new URLSearchParams({ q });
    if (limit) qs.set('limit', String(limit));
    return apiClient.get<SucheResult>(`/suche?${qs}`);
  },
};

```

## apps/web/src/lib/api/termine.api.ts
```typescript
/**
 * @file apps/web/src/lib/api/termine.api.ts
 * @description API-Funktionen für das Termin-Modul.
 */

import { apiClient } from './client';

export interface Termin {
  id: string;
  titel: string;
  beschreibung: string | null;
  start: string;
  ende: string | null;
  ort: string | null;
  farbe: string | null;
  erinnerung: number | null;
  gutachtenId: string | null;
  createdAt: string;
  updatedAt: string;
  gutachten: { id: string; aktenzeichen: string; titel: string } | null;
}

export interface CreateTerminInput {
  titel: string;
  beschreibung?: string;
  start: string;
  ende: string;
  ort?: string;
  farbe?: string;
  erinnerung?: number;
  gutachtenId?: string | null;
}

export const termineApi = {
  list: (params?: { von?: string; bis?: string; gutachtenId?: string }): Promise<Termin[]> => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      });
    }
    return apiClient.get<Termin[]>(`/termine${qs.toString() ? `?${qs}` : ''}`);
  },

  findById: (id: string): Promise<Termin> =>
    apiClient.get<Termin>(`/termine/${id}`),

  create: (data: CreateTerminInput): Promise<Termin> =>
    apiClient.post<Termin>('/termine', data),

  update: (id: string, data: Partial<CreateTerminInput>): Promise<Termin> =>
    apiClient.patch<Termin>(`/termine/${id}`, data),

  delete: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/termine/${id}`),
};

```

## packages/database/src/index.ts
```typescript
/**
 * @file packages/database/src/index.ts
 * @description Prisma-Client Singleton für den Gutachten-Manager.
 *
 * Exportiert einen einzigen, geteilten PrismaClient der in der gesamten
 * Anwendung verwendet wird. Das Singleton-Pattern verhindert mehrfache
 * Datenbankverbindungen in der Entwicklungsumgebung (Hot-Reload Problem).
 *
 * Verwendung in anderen Paketen:
 *   import { prisma } from '@gutachten/database'
 *   const gutachten = await prisma.gutachten.findMany()
 */

import { PrismaClient } from '@prisma/client';

// Globaler Typ für den Singleton im Development-Modus
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * PrismaClient Singleton.
 *
 * Im Entwicklungsmodus (NODE_ENV !== 'production') wird der Client global
 * gespeichert um mehrfache Instanziierungen bei Hot-Reloads zu vermeiden.
 * In der Produktion wird eine neue Instanz erstellt.
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });
}

export const prisma: PrismaClient =
  process.env['NODE_ENV'] === 'production'
    ? createPrismaClient()
    : (global.__prisma ?? (global.__prisma = createPrismaClient()));

// Alle Prisma-Typen re-exportieren für einfache Verwendung
export * from '@prisma/client';

```

## packages/database/prisma/schema.prisma
```prisma
// =============================================================================
// schema.prisma — Gutachten-Manager Datenbankschema
// =============================================================================
// Dieses Schema definiert die gesamte Datenbankstruktur des Gutachten-Managers.
//
// Tabellen-Übersicht:
//   Kern:          Gutachten, GutachtenStatus
//   Beteiligte:    Kunden, Gutachter, Fahrzeuge, Personen, Zeugen
//   Unfall:        UnfallOrt, Wetterdaten, Polizeidaten
//   Finanzen:      Schadensposten
//   Medien:        Dateien (Uploads)
//   Workflow:      Aufgaben, Notizen, Termine (Kalender)
//   System:        AuditLog, FeatureFlags, Tenants
//
// Migrations ausführen:
//   pnpm db:migrate:dev    (Entwicklung — erstellt Migration)
//   pnpm db:migrate        (Produktion — wendet Migration an)
// =============================================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =============================================================================
// ENUMS
// =============================================================================

/// Die 7 Workflow-Stufen eines Gutachtens
enum GutachtenStatus {
  AUFGENOMMEN   // Erstkontakt, Daten werden erfasst
  BEAUFTRAGT    // Auftrag erteilt, Gutachter zugewiesen
  BESICHTIGUNG  // Vor-Ort-Besichtigung geplant oder durchgeführt
  ENTWURF       // Gutachten wird erstellt
  FREIGABE      // Entwurf liegt vor, wartet auf Freigabe
  FERTIG        // Gutachten abgeschlossen und übergeben
  ARCHIV        // Archiviert
}

/// Typ einer am Unfall beteiligten Person
enum PersonTyp {
  FAHRER          // Fahrzeugführer
  BEIFAHRER       // Beifahrer
  FUSSGAENGER     // Fußgänger
  ZEUGE           // Zeuge (nicht direkt beteiligt)
  VERLETZTE       // Verletzte Person
}

/// Wetterbedingungen zum Unfallzeitpunkt
enum Wetterlage {
  KLAR
  BEWOELKT
  REGEN
  STARKREGEN
  SCHNEE
  GLAETTE
  NEBEL
  STURM
}

/// Straßenzustand zum Unfallzeitpunkt
enum Strassenzustand {
  TROCKEN
  NASS
  SCHNEEBEDECKT
  VEREIST
  VERSCHMUTZT
}

/// Sichtverhältnisse zum Unfallzeitpunkt
enum Sichtverhaeltnis {
  GUT        // > 100m Sicht
  MITTEL     // 50-100m Sicht
  SCHLECHT   // < 50m Sicht
  NACHT
  DAEMMERUNG
}

/// Priorität einer Aufgabe
enum AufgabePrioritaet {
  NIEDRIG
  NORMAL
  HOCH
  KRITISCH
}

/// Typ eines Audit-Log-Eintrags
enum AuditAktion {
  ERSTELLT
  AKTUALISIERT
  GELOESCHT
  STATUS_GEAENDERT
  DATEI_HOCHGELADEN
  DATEI_GELOESCHT
  KOMMENTAR_HINZUGEFUEGT
}

// =============================================================================
// KERN-TABELLEN
// =============================================================================

/// Haupttabelle: Repräsentiert ein einzelnes Gutachten
model Gutachten {
  id             String          @id @default(cuid())
  /// Eindeutiges Aktenzeichen (auto: GA-2026-001, oder manuell)
  aktenzeichen   String          @unique
  /// Kurzer Titel/Betreff des Gutachtens
  titel          String
  /// Detaillierte Beschreibung (Rich-Text HTML von TipTap)
  beschreibung   String?         @db.Text
  /// Aktueller Workflow-Status
  status         GutachtenStatus @default(AUFGENOMMEN)
  /// Fälligkeitsdatum (Abgabefrist)
  frist          DateTime?
  /// Datum der Auftragserteilung
  auftragsdatum  DateTime?
  /// Datum der Fertigstellung
  abschlussdatum DateTime?

  /// Auftraggeber (Kunde)
  kundeId        String?
  kunde          Kunde?          @relation(fields: [kundeId], references: [id])

  /// Zuständiger Gutachter
  gutachterId    String?
  gutachter      Gutachter?      @relation(fields: [gutachterId], references: [id])

  /// Verknüpfte Gutachten (z.B. Folge-Gutachten)
  verwandteGutachten    Gutachten[]   @relation("GutachtenVerknuepfung")
  verwandteMitGutachten Gutachten[]   @relation("GutachtenVerknuepfung")

  /// Unfalldaten
  unfall         Unfall?

  /// Beteiligte Fahrzeuge
  fahrzeuge      Fahrzeug[]

  /// Beteiligte Personen & Zeugen
  personen       Person[]

  /// Schadensposten
  schadensposten Schadensposten[]

  /// Hochgeladene Dateien
  dateien        Datei[]

  /// Interne Notizen
  notizen        Notiz[]

  /// Aufgaben/To-Dos
  aufgaben       Aufgabe[]

  /// Kalender-Termine
  termine        Termin[]

  /// Änderungshistorie
  auditLogs      AuditLog[]

  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@index([status])
  @@index([frist])
  @@index([kundeId])
  @@index([gutachterId])
  @@index([aktenzeichen])
  @@map("gutachten")
}

// =============================================================================
// BETEILIGTE PERSONEN & ORGANISATIONEN
// =============================================================================

/// Auftraggeber / Kunde — vollständige CRM-Entität
model Kunde {
  id             String      @id @default(cuid())
  /// Vorname (bei Privatpersonen)
  vorname        String?
  /// Nachname / Firmenname
  nachname       String
  /// Firmenname (falls Unternehmen)
  firma          String?
  /// E-Mail-Adresse
  email          String?
  /// Telefonnummer
  telefon        String?
  /// Mobilnummer
  mobil          String?
  /// Straße und Hausnummer
  strasse        String?
  /// Postleitzahl
  plz            String?
  /// Stadt
  stadt          String?
  /// Land (Standard: Deutschland)
  land           String?     @default("Deutschland")
  /// Interne Notizen zum Kunden
  notizen        String?     @db.Text

  /// Zugeordnete Gutachten
  gutachten      Gutachten[]

  /// Kontakthistorie
  kontakthistorie KontaktHistorie[]

  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@index([nachname])
  @@index([email])
  @@map("kunden")
}

/// Kontakthistorie für CRM
model KontaktHistorie {
  id         String   @id @default(cuid())
  kundeId    String
  kunde      Kunde    @relation(fields: [kundeId], references: [id], onDelete: Cascade)
  /// Art des Kontakts (Telefon, E-Mail, Post, Persönlich)
  art        String
  /// Inhalt des Kontakts
  inhalt     String   @db.Text
  /// Wer hat den Kontakt durchgeführt
  bearbeiter String?
  kontaktDat DateTime @default(now())

  @@index([kundeId])
  @@map("kontakt_historie")
}

/// Gutachter / Sachverständiger
model Gutachter {
  id         String      @id @default(cuid())
  vorname    String
  nachname   String
  email      String?
  telefon    String?
  /// Spezialisierungen (kommagetrennt, z.B. "Unfallanalyse, KFZ-Bewertung")
  fachgebiet String?

  gutachten  Gutachten[]

  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  @@index([nachname])
  @@map("gutachter")
}

/// Am Unfall beteiligte Person oder Zeuge
model Person {
  id           String    @id @default(cuid())
  gutachtenId  String
  gutachten    Gutachten @relation(fields: [gutachtenId], references: [id], onDelete: Cascade)

  typ          PersonTyp
  vorname      String
  nachname     String
  geburtsdatum DateTime?
  strasse      String?
  plz          String?
  stadt        String?
  telefon      String?
  email        String?

  /// Führerscheinnummer (bei Fahrern)
  fuehrerschein String?
  /// Führerscheinklasse (z.B. B, BE, C)
  fuehrerscheinklasse String?

  /// Aussage des Zeugen (nur bei PersonTyp.ZEUGE)
  zeugenaussage String? @db.Text

  /// Verbundenes Fahrzeug (bei Fahrern)
  fahrzeugId    String?
  fahrzeug      Fahrzeug? @relation(fields: [fahrzeugId], references: [id])

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([gutachtenId])
  @@map("personen")
}

// =============================================================================
// FAHRZEUGE
// =============================================================================

/// Am Unfall beteiligtes Fahrzeug
model Fahrzeug {
  id              String    @id @default(cuid())
  gutachtenId     String
  gutachten       Gutachten @relation(fields: [gutachtenId], references: [id], onDelete: Cascade)

  /// Amtliches Kennzeichen (z.B. M-AB 1234)
  kennzeichen     String
  /// Fahrzeugidentifikationsnummer (FIN/VIN)
  fahrgestell     String?
  /// Fahrzeugmarke (z.B. BMW, Mercedes)
  marke           String
  /// Fahrzeugmodell (z.B. 3er, C-Klasse)
  modell          String
  /// Baujahr
  baujahr         Int?
  /// Fahrzeugfarbe
  farbe           String?
  /// Kraftstoffart
  kraftstoff      String?

  /// KFZ-Versicherung
  versicherung    String?
  /// Versicherungsscheinnummer
  versicherungsNr String?

  /// Fahrer/Beteiligte Personen
  personen        Person[]

  /// Fahrzeugfotos (Unterauswahl aus dateien des Gutachtens)
  dateien         Datei[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([gutachtenId])
  @@index([kennzeichen])
  @@map("fahrzeuge")
}

// =============================================================================
// UNFALLDATEN
// =============================================================================

/// Unfalldaten — direkt einem Gutachten zugeordnet (1:1)
model Unfall {
  id              String    @id @default(cuid())
  gutachtenId     String    @unique
  gutachten       Gutachten @relation(fields: [gutachtenId], references: [id], onDelete: Cascade)

  /// Unfallzeitpunkt (Datum + Uhrzeit)
  unfallZeit      DateTime?

  /// Unfallort — Adresse
  strasse         String?
  hausnummer      String?
  plz             String?
  stadt           String?
  land            String?   @default("Deutschland")

  /// GPS-Koordinaten für Kartendarstellung
  breitengrad     Float?
  laengengrad     Float?

  /// Streckentyp (Autobahn, Bundesstraße, Landstraße, Innerorts)
  strassentyp     String?

  /// Unfallbeschreibung
  unfallHergang   String?   @db.Text

  /// Wetterbedingungen
  wetterlage      Wetterlage?
  temperatur      Float?    // Grad Celsius
  sichtverhaeltnis Sichtverhaeltnis?
  strassenzustand Strassenzustand?

  /// Polizeidaten
  polizeiAktenzeichen String?
  polizeiDienststelle  String?
  polizeiEinsatznummer String?
  polizeiProtokollDatum DateTime?

  /// Lichtbedingungen (Tag, Nacht, Dämmerung)
  lichtverhaeltnis String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("unfaelle")
}

// =============================================================================
// SCHADENSBERECHNUNG
// =============================================================================

/// Ein einzelner Schadensposten (Reparatur, Wertminderung, etc.)
model Schadensposten {
  id          String    @id @default(cuid())
  gutachtenId String
  gutachten   Gutachten @relation(fields: [gutachtenId], references: [id], onDelete: Cascade)

  /// Position in der Liste (für Sortierung)
  position    Int
  /// Bezeichnung des Postens (z.B. "Reparaturkosten Kotflügel")
  bezeichnung String
  /// Detaillierte Beschreibung
  beschreibung String?  @db.Text
  /// Betrag in Euro (Cents als Integer für Genauigkeit)
  betragCents  Int      // Cent-Beträge vermeiden Floating-Point-Fehler
  /// Kategorie (z.B. Reparatur, Wertminderung, Nutzungsausfall, Gutachterkosten)
  kategorie   String

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([gutachtenId])
  @@map("schadensposten")
}

// =============================================================================
// DATEIVERWALTUNG
// =============================================================================

/// Hochgeladene Datei (Foto, PDF, Dokument)
model Datei {
  id            String    @id @default(cuid())
  gutachtenId   String
  gutachten     Gutachten @relation(fields: [gutachtenId], references: [id], onDelete: Cascade)

  /// Optionale Zuordnung zu einem Fahrzeug
  fahrzeugId    String?
  fahrzeug      Fahrzeug? @relation(fields: [fahrzeugId], references: [id])

  /// Originaler Dateiname
  originalname  String
  /// Gespeicherter Dateiname (eindeutig, UUID-basiert)
  filename      String    @unique
  /// Relativer Pfad im Upload-Verzeichnis
  pfad          String
  /// MIME-Typ (z.B. image/jpeg, application/pdf)
  mimetype      String
  /// Dateigröße in Bytes
  groesse       Int
  /// Beschreibung/Titel der Datei
  beschreibung  String?

  createdAt     DateTime  @default(now())

  @@index([gutachtenId])
  @@index([fahrzeugId])
  @@map("dateien")
}

// =============================================================================
// WORKFLOW: NOTIZEN, AUFGABEN, TERMINE
// =============================================================================

/// Interne Notiz zu einem Gutachten (nicht im PDF sichtbar)
model Notiz {
  id          String    @id @default(cuid())
  gutachtenId String
  gutachten   Gutachten @relation(fields: [gutachtenId], references: [id], onDelete: Cascade)

  /// Notiz-Inhalt
  inhalt      String    @db.Text
  /// Wer hat die Notiz geschrieben
  autor       String?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([gutachtenId])
  @@map("notizen")
}

/// Aufgabe/To-Do zu einem Gutachten
model Aufgabe {
  id          String             @id @default(cuid())
  gutachtenId String
  gutachten   Gutachten          @relation(fields: [gutachtenId], references: [id], onDelete: Cascade)

  /// Beschreibung der Aufgabe
  titel       String
  /// Erledigt?
  erledigt    Boolean            @default(false)
  /// Fälligkeitsdatum
  faelligAm   DateTime?
  /// Priorität
  prioritaet  AufgabePrioritaet  @default(NORMAL)
  /// Zugewiesen an
  zugewiesen  String?
  /// Erledigt am
  erledigtAm  DateTime?

  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  @@index([gutachtenId])
  @@index([erledigt])
  @@map("aufgaben")
}

/// Kalender-Termin (z.B. Besichtigung vor Ort)
model Termin {
  id          String    @id @default(cuid())
  gutachtenId String?
  gutachten   Gutachten? @relation(fields: [gutachtenId], references: [id], onDelete: SetNull)

  /// Titel des Termins
  titel       String
  /// Beschreibung
  beschreibung String?
  /// Terminbeginn
  start       DateTime
  /// Terminende
  ende        DateTime
  /// Ort des Termins
  ort         String?
  /// Erinnerung (Minuten vor dem Termin)
  erinnerung  Int?      // z.B. 60 = 1 Stunde vorher
  /// Farbe für Kalenderanzeige (Hex)
  farbe       String?   @default("#1976d2")

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([gutachtenId])
  @@index([start])
  @@map("termine")
}

// =============================================================================
// SYSTEM: AUDIT-LOG, FEATURE-FLAGS, TENANTS
// =============================================================================

/// Vollständige Änderungshistorie (Audit-Log)
model AuditLog {
  id          String      @id @default(cuid())
  gutachtenId String
  gutachten   Gutachten   @relation(fields: [gutachtenId], references: [id], onDelete: Cascade)

  /// Was wurde gemacht
  aktion      AuditAktion
  /// Wer hat es gemacht
  bearbeiter  String?
  /// Beschreibung der Änderung
  beschreibung String
  /// Alte Werte (JSON)
  alterWert   Json?
  /// Neue Werte (JSON)
  neuerWert   Json?

  createdAt   DateTime    @default(now())

  @@index([gutachtenId])
  @@index([createdAt])
  @@map("audit_logs")
}

/// Feature-Flags für Admin-Panel
model FeatureFlag {
  id          String   @id @default(cuid())
  /// Eindeutiger Name (z.B. "FEATURE_KALENDER")
  name        String   @unique
  /// Beschreibung für das Admin-Panel
  beschreibung String?
  /// Ist das Feature aktiv?
  aktiv       Boolean  @default(true)
  /// Für welchen Tenant gilt das? (null = global)
  tenantId    String?

  updatedAt   DateTime @updatedAt

  @@index([name])
  @@index([tenantId])
  @@map("feature_flags")
}

/// Mandanten (Tenants) für SaaS-Betrieb (vorbereitet, noch nicht aktiv)
model Tenant {
  id          String   @id @default(cuid())
  /// Eindeutiger Bezeichner (wird als Schema-Name verwendet)
  slug        String   @unique
  /// Anzeigename des Büros
  name        String
  /// PostgreSQL-Schema-Name für diesen Mandanten
  schemaName  String   @unique
  /// Ist der Tenant aktiv?
  aktiv       Boolean  @default(true)
  /// E-Mail-Adresse des Büros
  email       String?
  /// Telefon des Büros
  telefon     String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("tenants")
}

```

## packages/shared/src/index.ts
```typescript
/**
 * @file packages/shared/src/index.ts
 * @description Haupt-Export des @gutachten/shared Pakets.
 *
 * Alles was von Frontend (apps/web) und Backend (apps/api)
 * gemeinsam genutzt wird, wird hier exportiert.
 *
 * Verwendung:
 *   import { GUTACHTEN_STATUS, formatEuro, ApiResponse } from '@gutachten/shared'
 */

// Typen
export * from './types/api.types';

// Konstanten
export * from './constants/status.constants';
export * from './constants/routes.constants';

// Utilities
export * from './utils/date.utils';
export * from './utils/currency.utils';

```

## packages/shared/src/types/api.types.ts
```typescript
/**
 * @file packages/shared/src/types/api.types.ts
 * @description TypeScript-Typen für API-Requests und -Responses.
 *
 * Alle API-Antworten folgen einem einheitlichen Format:
 *   - Erfolg: { success: true, data: T, meta?: PaginationMeta }
 *   - Fehler: { success: false, error: ApiError }
 *
 * Diese Typen werden von:
 *   - apps/api: für das Erstellen der Responses
 *   - apps/web: für das Typisieren der fetch()-Aufrufe
 */

// =============================================================================
// STANDARD API RESPONSE FORMAT
// =============================================================================

/** Standard-Erfolgs-Response */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/** Standard-Fehler-Response */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

/** Vereinigter Response-Typ */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Fehler-Objekt in einer API-Response */
export interface ApiError {
  /** Maschinenlesbarer Fehlercode (z.B. "VALIDATION_ERROR", "NOT_FOUND") */
  code: string;
  /** Menschenlesbarer Fehlertext (Deutsch) */
  message: string;
  /** Detaillierte Validierungsfehler (optional) */
  details?: ValidationError[];
}

/** Einzelner Validierungsfehler (z.B. von Zod) */
export interface ValidationError {
  /** Feldname (z.B. "aktenzeichen", "frist") */
  field: string;
  /** Fehlermeldung für dieses Feld */
  message: string;
}

// =============================================================================
// PAGINATION
// =============================================================================

/** Pagination-Metadaten in Listen-Responses */
export interface PaginationMeta {
  /** Aktuelle Seite (1-basiert) */
  page: number;
  /** Einträge pro Seite */
  pageSize: number;
  /** Gesamtanzahl der Einträge */
  total: number;
  /** Gesamtanzahl der Seiten */
  totalPages: number;
}

/** Query-Parameter für paginierte Anfragen */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

// =============================================================================
// FILTER & SORT
// =============================================================================

/** Sortierrichtung */
export type SortRichtung = 'asc' | 'desc';

/** Basis-Query-Parameter für alle Listen-Endpunkte */
export interface BaseListQuery extends PaginationQuery {
  /** Sortierfeld */
  sortBy?: string;
  /** Sortierrichtung */
  sortDir?: SortRichtung;
  /** Suchbegriff (Volltextsuche) */
  suche?: string;
}

// =============================================================================
// FEHLER-CODES
// =============================================================================

/** Standardisierte API-Fehlercodes */
export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

```

## packages/shared/src/constants/index.ts
```typescript
/**
 * @file packages/shared/src/constants/index.ts
 * @description Re-Export aller Konstanten.
 */

export * from './status.constants';
export * from './routes.constants';

```

## packages/shared/src/constants/routes.constants.ts
```typescript
/**
 * @file packages/shared/src/constants/routes.constants.ts
 * @description API-Routen-Konstanten für Frontend und Backend.
 *
 * Zentralisiert alle API-Routen um Tippfehler zu vermeiden.
 * Beide Seiten (Frontend-API-Client und Backend-Router) nutzen diese Konstanten.
 */

/** API-Basis-URL (Version 1) */
export const API_BASE = '/api/v1';

/** Alle API-Endpunkte */
export const API_ROUTES = {
  // Health-Check
  HEALTH: `${API_BASE}/health`,

  // Gutachten
  GUTACHTEN: {
    BASE: `${API_BASE}/gutachten`,
    DETAIL: (id: string) => `${API_BASE}/gutachten/${id}`,
    STATUS: (id: string) => `${API_BASE}/gutachten/${id}/status`,
    VERKNUEPFEN: (id: string) => `${API_BASE}/gutachten/${id}/verknuepfungen`,
    FAHRZEUGE: (id: string) => `${API_BASE}/gutachten/${id}/fahrzeuge`,
    PERSONEN: (id: string) => `${API_BASE}/gutachten/${id}/personen`,
    SCHAEDEN: (id: string) => `${API_BASE}/gutachten/${id}/schaeden`,
    DATEIEN: (id: string) => `${API_BASE}/gutachten/${id}/dateien`,
    NOTIZEN: (id: string) => `${API_BASE}/gutachten/${id}/notizen`,
    AUFGABEN: (id: string) => `${API_BASE}/gutachten/${id}/aufgaben`,
    TERMINE: (id: string) => `${API_BASE}/gutachten/${id}/termine`,
    AUDIT: (id: string) => `${API_BASE}/gutachten/${id}/audit`,
    UNFALL: (id: string) => `${API_BASE}/gutachten/${id}/unfall`,
    PDF: (id: string) => `${API_BASE}/gutachten/${id}/pdf`,
  },

  // Kunden (CRM)
  KUNDEN: {
    BASE: `${API_BASE}/kunden`,
    DETAIL: (id: string) => `${API_BASE}/kunden/${id}`,
    KONTAKTHISTORIE: (id: string) => `${API_BASE}/kunden/${id}/kontakthistorie`,
    GUTACHTEN: (id: string) => `${API_BASE}/kunden/${id}/gutachten`,
  },

  // Gutachter
  GUTACHTER: {
    BASE: `${API_BASE}/gutachter`,
    DETAIL: (id: string) => `${API_BASE}/gutachter/${id}`,
  },

  // Kalender
  KALENDER: {
    BASE: `${API_BASE}/kalender`,
    TERMIN_DETAIL: (id: string) => `${API_BASE}/kalender/${id}`,
  },

  // Suche
  SUCHE: {
    BASE: `${API_BASE}/suche`,
  },

  // Admin
  ADMIN: {
    FEATURE_FLAGS: `${API_BASE}/admin/feature-flags`,
    FEATURE_FLAG_DETAIL: (name: string) => `${API_BASE}/admin/feature-flags/${name}`,
    TENANTS: `${API_BASE}/admin/tenants`,
    LOGS: `${API_BASE}/admin/logs`,
  },

  // Backup
  BACKUP: {
    ERSTELLEN: `${API_BASE}/backup/erstellen`,
    LISTE: `${API_BASE}/backup/liste`,
    HERUNTERLADEN: (name: string) => `${API_BASE}/backup/${name}`,
  },

  // Dashboard
  DASHBOARD: {
    STATS: `${API_BASE}/dashboard/stats`,
    FRISTEN: `${API_BASE}/dashboard/fristen`,
  },
} as const;

```

## packages/shared/src/constants/status.constants.ts
```typescript
/**
 * @file packages/shared/src/constants/status.constants.ts
 * @description Konstanten für Gutachten-Status-Werte.
 *
 * Diese Konstanten sind die einzige Quelle der Wahrheit für Status-Labels,
 * Farben und Reihenfolge. Sowohl Frontend als auch Backend nutzen diese.
 *
 * Reihenfolge der Status-Stufen:
 *   1. AUFGENOMMEN → 2. BEAUFTRAGT → 3. BESICHTIGUNG →
 *   4. ENTWURF → 5. FREIGABE → 6. FERTIG → 7. ARCHIV
 */

/** Alle möglichen Gutachten-Status-Werte (muss mit Prisma-Enum übereinstimmen) */
export type GutachtenStatusTyp =
  | 'AUFGENOMMEN'
  | 'BEAUFTRAGT'
  | 'BESICHTIGUNG'
  | 'ENTWURF'
  | 'FREIGABE'
  | 'FERTIG'
  | 'ARCHIV';

/** Metadaten für jeden Status */
export interface StatusMetadata {
  /** Angezeigter Text in der UI */
  label: string;
  /** Kurzbeschreibung was dieser Status bedeutet */
  beschreibung: string;
  /** Material UI Farbe für Chips und Kanban-Spalten */
  farbe: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  /** Hex-Farbe für Kalender und individuelle Darstellung */
  hex: string;
  /** Reihenfolge im Workflow (1 = Anfang, 7 = Ende) */
  reihenfolge: number;
}

/** Mapping von Status-Wert zu Metadaten */
export const GUTACHTEN_STATUS: Record<GutachtenStatusTyp, StatusMetadata> = {
  AUFGENOMMEN: {
    label: 'Aufgenommen',
    beschreibung: 'Erstkontakt, Daten werden erfasst',
    farbe: 'default',
    hex: '#9e9e9e',
    reihenfolge: 1,
  },
  BEAUFTRAGT: {
    label: 'Beauftragt',
    beschreibung: 'Auftrag erteilt, Gutachter zugewiesen',
    farbe: 'info',
    hex: '#0288d1',
    reihenfolge: 2,
  },
  BESICHTIGUNG: {
    label: 'Besichtigung',
    beschreibung: 'Vor-Ort-Besichtigung geplant oder durchgeführt',
    farbe: 'warning',
    hex: '#f57c00',
    reihenfolge: 3,
  },
  ENTWURF: {
    label: 'Entwurf',
    beschreibung: 'Gutachten wird erstellt',
    farbe: 'secondary',
    hex: '#7b1fa2',
    reihenfolge: 4,
  },
  FREIGABE: {
    label: 'Freigabe',
    beschreibung: 'Entwurf liegt vor, wartet auf Freigabe',
    farbe: 'primary',
    hex: '#1976d2',
    reihenfolge: 5,
  },
  FERTIG: {
    label: 'Fertig',
    beschreibung: 'Gutachten abgeschlossen und übergeben',
    farbe: 'success',
    hex: '#388e3c',
    reihenfolge: 6,
  },
  ARCHIV: {
    label: 'Archiv',
    beschreibung: 'Archiviert',
    farbe: 'default',
    hex: '#616161',
    reihenfolge: 7,
  },
};

/** Alle Status-Werte in der richtigen Reihenfolge */
export const STATUS_REIHENFOLGE: GutachtenStatusTyp[] = [
  'AUFGENOMMEN',
  'BEAUFTRAGT',
  'BESICHTIGUNG',
  'ENTWURF',
  'FREIGABE',
  'FERTIG',
  'ARCHIV',
];

/** Aktive (nicht archivierte) Status */
export const AKTIVE_STATUS: GutachtenStatusTyp[] = STATUS_REIHENFOLGE.filter(
  (s) => s !== 'ARCHIV',
);

/** Abgeschlossene Status */
export const ABGESCHLOSSENE_STATUS: GutachtenStatusTyp[] = ['FERTIG', 'ARCHIV'];

```

## packages/shared/src/utils/currency.utils.ts
```typescript
/**
 * @file packages/shared/src/utils/currency.utils.ts
 * @description Hilfsfunktionen für Geldbeträge.
 *
 * WICHTIG: Die Datenbank speichert Beträge als CENT-Integer (nicht als Float).
 * Das verhindert Fließkomma-Rundungsfehler (z.B. 0.1 + 0.2 ≠ 0.3 in Floating Point).
 *
 * Konvention:
 *   - DB/API: Cents als Integer (z.B. 150000 = 1500,00 €)
 *   - Anzeige: Formatiert mit Intl.NumberFormat (z.B. "1.500,00 €")
 *   - Eingabe: Dezimalzahl vom Benutzer → Cents für DB
 */

/** Formatiert Cent-Betrag als deutschen Euro-String: "1.500,00 €" */
export function formatEuro(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '–';

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

/** Konvertiert Euro-Dezimalzahl zu Cents: 1500.50 → 150050 */
export function euroZuCents(euro: number): number {
  return Math.round(euro * 100);
}

/** Konvertiert Cents zu Euro-Dezimalzahl: 150050 → 1500.50 */
export function centsZuEuro(cents: number): number {
  return cents / 100;
}

/** Summiert mehrere Cent-Beträge */
export function summiereSchaeden(posten: Array<{ betragCents: number }>): number {
  return posten.reduce((summe, p) => summe + p.betragCents, 0);
}

```

## packages/shared/src/utils/date.utils.ts
```typescript
/**
 * @file packages/shared/src/utils/date.utils.ts
 * @description Datums-Hilfsfunktionen für deutschen Raum.
 *
 * Alle Funktionen sind "pure functions" — keine Seiteneffekte, gleiche
 * Eingabe ergibt immer gleiche Ausgabe. Einfach testbar.
 *
 * Hinweis: Keine externe Bibliothek (wie dayjs/date-fns) um das Paket
 * schlanker zu halten. Nur native Intl-API.
 */

/** Deutsches Datumsformat: 23.03.2026 */
export function formatDatum(datum: Date | string | null | undefined): string {
  if (!datum) return '–';
  const d = typeof datum === 'string' ? new Date(datum) : datum;
  if (isNaN(d.getTime())) return '–';

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** Deutsches Datum + Uhrzeit: 23.03.2026, 14:30 Uhr */
export function formatDatumUhrzeit(datum: Date | string | null | undefined): string {
  if (!datum) return '–';
  const d = typeof datum === 'string' ? new Date(datum) : datum;
  if (isNaN(d.getTime())) return '–';

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d) + ' Uhr';
}

/** Relatives Datum: "vor 3 Tagen", "in 5 Tagen", "heute" */
export function formatRelativ(datum: Date | string | null | undefined): string {
  if (!datum) return '–';
  const d = typeof datum === 'string' ? new Date(datum) : datum;
  if (isNaN(d.getTime())) return '–';

  const jetzt = new Date();
  const diffMs = d.getTime() - jetzt.getTime();
  const diffTage = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffTage === 0) return 'Heute';
  if (diffTage === 1) return 'Morgen';
  if (diffTage === -1) return 'Gestern';
  if (diffTage > 0) return `in ${diffTage} Tagen`;
  return `vor ${Math.abs(diffTage)} Tagen`;
}

/**
 * Gibt zurück ob eine Frist abgelaufen ist.
 * @param frist Das Fälligkeitsdatum
 * @param pufferTage Anzahl Tage vor Ablauf als "kritisch" (Standard: 3)
 */
export function fristStatus(
  frist: Date | string | null | undefined,
  pufferTage = 3,
): 'normal' | 'bald' | 'ueberfaellig' {
  if (!frist) return 'normal';
  const d = typeof frist === 'string' ? new Date(frist) : frist;
  if (isNaN(d.getTime())) return 'normal';

  const jetzt = new Date();
  const diffMs = d.getTime() - jetzt.getTime();
  const diffTage = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffTage < 0) return 'ueberfaellig';
  if (diffTage <= pufferTage) return 'bald';
  return 'normal';
}

/** ISO-Datum-String für API-Requests: "2026-03-23" */
export function toIsoDate(datum: Date): string {
  return datum.toISOString().split('T')[0] ?? '';
}

```

## packages/shared/src/utils/index.ts
```typescript
/**
 * @file packages/shared/src/utils/index.ts
 * @description Re-Export aller Utility-Funktionen.
 */

export * from './date.utils';
export * from './currency.utils';

```

## infrastructure/docker/api-entrypoint.sh
```bash
#!/bin/sh
# =============================================================================
# api-entrypoint.sh — Startet die API nach Datenbank-Migration
#
# Hinweis: Docker Compose startet diesen Container erst, nachdem der
# db-Dienst seinen Healthcheck (pg_isready) bestanden hat.
# Ein eigener Warte-Loop ist daher nicht noetig.
# =============================================================================

set -e

echo "[Entrypoint] ============================================================"
echo "[Entrypoint] Gutachten-Manager API wird gestartet"
echo "[Entrypoint] NODE_ENV=${NODE_ENV:-production}  PORT=${PORT:-4000}"
echo "[Entrypoint] ============================================================"

# -----------------------------------------------------------------------
# Schema anwenden
# prisma db push legt alle Tabellen an / passt sie an.
# --accept-data-loss  erlaubt nicht-rueckwaertskompatible Aenderungen
# --skip-generate     Prisma-Client wurde bereits im Build-Schritt erzeugt
# -----------------------------------------------------------------------
echo "[Entrypoint] Wende Datenbankschema an (prisma db push)..."

node_modules/.bin/prisma db push \
  --schema packages/database/prisma/schema.prisma \
  --accept-data-loss \
  --skip-generate

echo "[Entrypoint] Schema erfolgreich angewendet."

# -----------------------------------------------------------------------
# API-Server starten
# -----------------------------------------------------------------------
echo "[Entrypoint] Starte API-Server auf Port ${PORT:-4000}..."
exec node dist/server.js

```

## infrastructure/docker/api.Dockerfile
```text
# =============================================================================
# api.Dockerfile — Express.js Backend
# =============================================================================
# Build-Kontext: Projektstamm (docker compose context: .)

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Alle Quellen auf einmal kopieren (pnpm workspace:* braucht vollstaendige Pakete)
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Abhaengigkeiten installieren
RUN pnpm install --no-frozen-lockfile

# 1. Prisma-Client generieren
RUN pnpm --filter @gutachten/database db:generate

# 2. Shared-Package kompilieren
RUN pnpm --filter @gutachten/shared build

# 3. Database-Package kompilieren
RUN pnpm --filter @gutachten/database build

# 4. API kompilieren
RUN pnpm --filter api build


# ---- Stage 2: Runner (Production) ----
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser  --system --uid 1001 api

# Compiled API
COPY --from=builder /app/apps/api/dist ./dist

# node_modules (enthaelt alle externen Pakete + pnpm-Symlinks + .prisma)
COPY --from=builder /app/node_modules ./node_modules

# Workspace-Pakete (kompiliert)
COPY --from=builder /app/packages/database/dist        ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/shared/dist          ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json   ./packages/shared/package.json

# Prisma-Schema fuer Migration
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Verzeichnisse und Rechte
RUN mkdir -p /app/uploads /app/logs /app/backups \
  && chown -R api:nodejs /app/uploads /app/logs /app/backups /app/dist

COPY infrastructure/docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER api

EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]

```

## infrastructure/docker/web.Dockerfile
```text
# =============================================================================
# web.Dockerfile — Next.js Frontend
# =============================================================================
# Build-Kontext: Projektstamm (docker compose context: .)

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Alle Quellen auf einmal kopieren (pnpm workspace:* braucht vollstaendige Pakete)
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Abhaengigkeiten installieren
RUN pnpm install --no-frozen-lockfile

ARG NEXT_PUBLIC_API_URL=http://localhost/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js Build
RUN pnpm --filter web build


# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node", "server.js"]

```

## infrastructure/docker/nginx/nginx.conf
```text
# =============================================================================
# nginx.conf — Reverse-Proxy Konfiguration für den Gutachten-Manager
# =============================================================================
# Nginx sitzt vor Frontend und Backend und leitet Anfragen weiter:
#   /       → Next.js Frontend (Port 3000)
#   /api/   → Express.js Backend (Port 4000)
#
# Vorteile:
#   - Einziger öffentlicher Port (80/443)
#   - SSL-Terminierung hier (für Produktion)
#   - Gzip-Komprimierung
#   - Security-Headers
# =============================================================================

worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip-Komprimierung
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Datei-Upload Limit (muss mit API-Einstellung übereinstimmen)
    client_max_body_size 100M;

    # Upstream-Server definieren
    upstream web_server {
        server web:3000;
        keepalive 32;
    }

    upstream api_server {
        server api:4000;
        keepalive 32;
    }

    server {
        listen 80;
        server_name localhost;

        # Security-Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # -----------------------------------------------
        # API-Anfragen → Express.js Backend
        # -----------------------------------------------
        location /api/ {
            proxy_pass http://api_server;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Timeout für lange API-Anfragen (z.B. PDF-Generierung)
            proxy_read_timeout 120s;
            proxy_connect_timeout 10s;
        }

        # -----------------------------------------------
        # Alle anderen Anfragen → Next.js Frontend
        # -----------------------------------------------
        location / {
            proxy_pass http://web_server;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # -----------------------------------------------
        # Health-Check Endpunkt (für Docker/Load-Balancer)
        # -----------------------------------------------
        location /nginx-health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
    }
}

```

## docker-compose.yml
```yaml
# =============================================================================
# docker-compose.yml — Gutachten-Manager
# =============================================================================
# Liegt im Projektstamm, damit "docker compose up" ohne Flags funktioniert.
# Alle Pfade sind relativ zum Projektstamm.
#
# Starten:  docker compose up --build -d
# Stoppen:  docker compose down
# Logs:     docker compose logs -f
# Status:   docker compose ps
# =============================================================================

services:

  # ---------------------------------------------------------------------------
  # NGINX — Reverse-Proxy (Port 80 → Web:3000 / API:4000)
  # ---------------------------------------------------------------------------
  nginx:
    image: nginx:1.27-alpine
    container_name: gutachten_nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./infrastructure/docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      web:
        condition: service_healthy
      api:
        condition: service_healthy
    networks:
      - gutachten_network

  # ---------------------------------------------------------------------------
  # WEB — Next.js Frontend
  # ---------------------------------------------------------------------------
  web:
    build:
      context: .
      dockerfile: infrastructure/docker/web.Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost/api/v1}
    container_name: gutachten_web
    restart: unless-stopped
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost/api/v1}
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    networks:
      - gutachten_network

  # ---------------------------------------------------------------------------
  # API — Express.js Backend (mit automatischer DB-Migration beim Start)
  # ---------------------------------------------------------------------------
  api:
    build:
      context: .
      dockerfile: infrastructure/docker/api.Dockerfile
    container_name: gutachten_api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgresql://${DATABASE_USER:-gutachten_user}:${DATABASE_PASSWORD:-GutachtenMgr2026}@db:5432/${DATABASE_NAME:-gutachten_manager}?schema=public
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost}
      MAX_UPLOAD_SIZE_MB: ${MAX_UPLOAD_SIZE_MB:-50}
      UPLOAD_DIR: /app/uploads
      LOG_LEVEL: ${LOG_LEVEL:-info}
      LOG_DIR: /app/logs
      BACKUP_DIR: /app/backups
      BACKUP_RETENTION_DAYS: ${BACKUP_RETENTION_DAYS:-30}
      BACKUP_CRON_SCHEDULE: ${BACKUP_CRON_SCHEDULE:-0 2 * * *}
    volumes:
      - uploads_data:/app/uploads
      - logs_data:/app/logs
      - backups_data:/app/backups
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:4000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 90s
    networks:
      - gutachten_network

  # ---------------------------------------------------------------------------
  # DB — PostgreSQL Datenbank
  # ---------------------------------------------------------------------------
  db:
    image: postgres:16-alpine
    container_name: gutachten_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DATABASE_NAME:-gutachten_manager}
      POSTGRES_USER: ${DATABASE_USER:-gutachten_user}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD:-GutachtenMgr2026}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USER:-gutachten_user} -d ${DATABASE_NAME:-gutachten_manager}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s
    networks:
      - gutachten_network

# =============================================================================
# VOLUMES
# =============================================================================
volumes:
  postgres_data:
    driver: local
    name: gutachten_postgres_data
  uploads_data:
    driver: local
    name: gutachten_uploads
  logs_data:
    driver: local
    name: gutachten_logs
  backups_data:
    driver: local
    name: gutachten_backups
  nginx_logs:
    driver: local
    name: gutachten_nginx_logs

# =============================================================================
# NETZWERK
# =============================================================================
networks:
  gutachten_network:
    driver: bridge
    name: gutachten_network

```

## package.json
```json
{
  "name": "gutachten-manager",
  "version": "2026.3.1",
  "private": true,
  "description": "Professionelles Management-System für unfallanalytische und unfalltechnische Gutachten",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "start": "turbo run start",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint:fix",
    "typecheck": "turbo run typecheck",
    "db:generate": "turbo run db:generate",
    "db:migrate": "turbo run db:migrate",
    "db:migrate:dev": "turbo run db:migrate:dev",
    "db:seed": "turbo run db:seed",
    "db:studio": "cd packages/database && pnpm prisma studio",
    "clean": "turbo run clean && find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +"
  },
  "devDependencies": {
    "turbo": "^2.3.3",
    "prettier": "^3.4.2",
    "@types/node": "^22.10.5"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.15.4"
}

```

## pnpm-workspace.yaml
```yaml
# =============================================================================
# pnpm Workspace Konfiguration
# =============================================================================
# Definiert welche Pakete Teil des Monorepos sind.
# Alle Verzeichnisse unter 'apps/' und 'packages/' werden als Workspace-Pakete
# behandelt und können sich gegenseitig als Abhängigkeiten referenzieren.
#
# Verwendung:
#   pnpm install                 # Alle Pakete installieren
#   pnpm --filter web dev        # Nur 'web' App starten
#   pnpm --filter api build      # Nur 'api' App bauen
# =============================================================================

packages:
  - "apps/*"
  - "packages/*"

```

## turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "start": {
      "dependsOn": ["build"],
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "lint": {
      "outputs": []
    },
    "lint:fix": {
      "cache": false
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:migrate:dev": {
      "cache": false
    },
    "db:seed": {
      "cache": false,
      "dependsOn": ["db:migrate"]
    }
  }
}

```

## apps/api/package.json
```json
{
  "name": "api",
  "version": "2026.3.1",
  "private": true,
  "description": "Express.js REST API für den Gutachten-Manager",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --max-warnings 0",
    "lint:fix": "eslint src --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "db:generate": "pnpm --filter @gutachten/database db:generate",
    "db:migrate": "pnpm --filter @gutachten/database db:migrate",
    "db:migrate:dev": "pnpm --filter @gutachten/database db:migrate:dev",
    "db:seed": "pnpm --filter @gutachten/database db:seed",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@gutachten/database": "workspace:*",
    "@gutachten/shared": "workspace:*",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "helmet": "^8.0.0",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "node-cron": "^3.0.3",
    "pdfkit": "^0.15.1",
    "winston": "^3.17.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/compression": "^1.7.5",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.0",
    "@types/morgan": "^1.9.9",
    "@types/multer": "^1.4.12",
    "@types/node": "^22.10.5",
    "@types/node-cron": "^3.0.11",
    "@types/pdfkit": "^0.13.9",
    "@types/jest": "^29.5.14",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.7.3"
  }
}

```

## apps/api/tsconfig.json
```json
{
  "extends": "../../packages/config/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "declaration": false,
    "declarationMap": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}

```

## apps/web/package.json
```json
{
  "name": "web",
  "version": "2026.3.1",
  "private": true,
  "description": "Next.js Frontend für den Gutachten-Manager",
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint --max-warnings 0",
    "lint:fix": "next lint --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "clean": "rm -rf .next dist"
  },
  "dependencies": {
    "@gutachten/shared": "workspace:*",
    "@emotion/cache": "^11.14.0",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.0",
    "@mui/icons-material": "^6.4.0",
    "@mui/material": "^6.4.0",
    "@mui/x-date-pickers": "^7.26.0",
    "@tanstack/react-query": "^5.65.1",
    "@tanstack/react-query-devtools": "^5.65.1",
    "@tiptap/extension-bold": "^2.11.3",
    "@tiptap/extension-bullet-list": "^2.11.3",
    "@tiptap/extension-heading": "^2.11.3",
    "@tiptap/extension-link": "^2.11.3",
    "@tiptap/extension-ordered-list": "^2.11.3",
    "@tiptap/extension-table": "^2.11.3",
    "@tiptap/react": "^2.11.3",
    "@tiptap/starter-kit": "^2.11.3",
    "leaflet": "^1.9.4",
    "next": "^15.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "recharts": "^2.15.0",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@types/jest": "^29.5.14",
    "@types/leaflet": "^1.9.15",
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.7",
    "@types/react-dom": "^19.0.3",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "typescript": "^5.7.3"
  }
}

```

## apps/web/next.config.ts
```typescript
/**
 * @file apps/web/next.config.ts
 * @description Next.js Konfiguration für den Gutachten-Manager.
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone-Output für kleinere Docker-Images
  output: 'standalone',

  // Strenger Modus für bessere React-Fehlererkennung
  reactStrictMode: true,

  // TypeScript-Fehler beim Build ignorieren (Typ-Checks laufen separat)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint beim Build deaktivieren (läuft separat im CI)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Bilder von externen Domains erlauben (für zukünftige Features)
  images: {
    remotePatterns: [],
  },

  // Leaflet benötigt server-seitige Imports zu deaktivieren
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;

```

## apps/web/tsconfig.json
```json
{
  "extends": "../../packages/config/tsconfig/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [{ "name": "next" }],
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": false
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "jest.config.ts", "jest.config.js", "jest.setup.ts"]
}

```

## packages/database/package.json
```json
{
  "name": "@gutachten/database",
  "version": "2026.3.1",
  "private": true,
  "description": "Prisma ORM Schema, Migrationen und Datenbank-Client für den Gutachten-Manager",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate deploy",
    "db:migrate:dev": "prisma migrate dev",
    "db:seed": "ts-node --project tsconfig.seed.json seeds/index.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset"
  },
  "dependencies": {
    "@prisma/client": "^6.3.1"
  },
  "devDependencies": {
    "prisma": "^6.3.1",
    "ts-node": "^10.9.2",
    "typescript": "^5.7.3",
    "@types/node": "^22.10.5"
  }
}

```

## packages/database/tsconfig.json
```json
{
  "extends": "../config/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "seeds", "prisma"]
}

```

## packages/shared/package.json
```json
{
  "name": "@gutachten/shared",
  "version": "2026.3.1",
  "private": true,
  "description": "Gemeinsame TypeScript-Typen, Konstanten und Utilities fuer den Gutachten-Manager",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}

```

## packages/config/tsconfig/base.json
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Basis TypeScript-Konfiguration",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}

```

## packages/config/tsconfig/node.json
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Node.js TypeScript-Konfiguration (für apps/api und packages/*)",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src"
  }
}

```

## packages/config/tsconfig/nextjs.json
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Next.js TypeScript-Konfiguration (für apps/web)",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "ES2017"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  }
}

```

## .env.example
```text
# =============================================================================
# Gutachten-Manager — Umgebungsvariablen
# =============================================================================
# ANLEITUNG:
#   Diese Datei wurde in ".env" umbenannt. Alle Werte funktionieren
#   sofort out-of-the-box. Fuer Produktion sollten Sie DATABASE_PASSWORD
#   und JWT_SECRET durch eigene sichere Werte ersetzen.
# =============================================================================

# -----------------------------------------------------------------------------
# Datenbank (PostgreSQL)
# -----------------------------------------------------------------------------
DATABASE_NAME=gutachten_manager
DATABASE_USER=gutachten_user
DATABASE_PASSWORD=GutachtenMgr2026

# -----------------------------------------------------------------------------
# API Server
# -----------------------------------------------------------------------------
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGINS=http://localhost
MAX_UPLOAD_SIZE_MB=50

# -----------------------------------------------------------------------------
# Frontend (Next.js)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_API_URL=http://localhost/api/v1

# -----------------------------------------------------------------------------
# Backup-System
# -----------------------------------------------------------------------------
BACKUP_RETENTION_DAYS=30
BACKUP_CRON_SCHEDULE=0 2 * * *

```

## STARTEN.bat
```batch
@echo off
setlocal EnableDelayedExpansion

:: Fenster offen halten bei Doppelklick
echo %CMDCMDLINE% | findstr /i "/c " >nul 2>&1
if %errorlevel% equ 0 ( cmd /K ""%~f0"" & exit /b )

cd /d "%~dp0"
if not exist "logs" mkdir logs
set LOG=logs\starten-aktuell.log
echo === Gutachten-Manager Start %DATE% %TIME% === > "%LOG%"

cls
color 0A
echo.
echo  ============================================================
echo   GUTACHTEN-MANAGER  ^|  Wird gestartet...
echo  ============================================================
echo.

:: ── 1. Verzeichnis pruefen ────────────────────────────────────────────────────
if not exist "docker-compose.yml" (
    color 0C
    echo  [!!] docker-compose.yml nicht gefunden.
    echo       Bitte STARTEN.bat aus dem Gutachten-Manager-Ordner ausfuehren.
    pause & exit /b 1
)

:: ── 2. Docker pruefen ─────────────────────────────────────────────────────────
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Docker Engine nicht bereit. Starte Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" >nul 2>&1

    echo  [!] Warte auf Docker Engine (bis zu 120 Sekunden)...
    set /a DOCKER_WAIT=0
    :WARTE_DOCKER
    timeout /t 5 /nobreak >nul
    set /a DOCKER_WAIT+=5
    docker info >nul 2>&1
    if %errorlevel% equ 0 goto DOCKER_OK
    if %DOCKER_WAIT% geq 120 (
        color 0C
        echo  [!!] Docker Engine nach 120 Sekunden nicht bereit.
        echo       Bitte Docker Desktop manuell starten und nochmals ausfuehren.
        pause & exit /b 1
    )
    goto WARTE_DOCKER
)
:DOCKER_OK
echo  [OK] Docker Engine laeuft.
echo [OK] Docker bereit >> "%LOG%"

:: ── 3. .env sicherstellen ─────────────────────────────────────────────────────
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo  [OK] .env aus .env.example erstellt.
    )
)

:: ── 4. Images bauen (Ausgabe sichtbar!) ──────────────────────────────────────
echo.
echo  ┌─────────────────────────────────────────────────────────┐
echo  │  Schritt 1/2: Docker-Images bauen                       │
echo  │  Erster Start: 5-15 Minuten  /  Folgestarts: ~1 Minute  │
echo  └─────────────────────────────────────────────────────────┘
echo.
echo [%TIME%] Starte docker compose build... >> "%LOG%"

docker compose build
set BUILD_ERR=%errorlevel%
echo [%TIME%] docker compose build beendet (Exit: %BUILD_ERR%) >> "%LOG%"

if %BUILD_ERR% neq 0 (
    color 0C
    echo.
    echo  [!!] Build fehlgeschlagen (Exit-Code: %BUILD_ERR%)
    echo       Fehlermeldungen stehen oben im Fenster.
    echo       Log: %CD%\%LOG%
    echo [FEHLER] Build fehlgeschlagen >> "%LOG%"
    docker compose logs --tail=30 >> "%LOG%" 2>&1
    pause & exit /b 1
)
echo  [OK] Images gebaut.
echo.

:: ── 5. Container starten ─────────────────────────────────────────────────────
echo  ┌─────────────────────────────────────────────────────────┐
echo  │  Schritt 2/2: Container starten                         │
echo  └─────────────────────────────────────────────────────────┘
echo.
echo [%TIME%] Starte Container... >> "%LOG%"

docker compose up -d
set UP_ERR=%errorlevel%
echo [%TIME%] docker compose up beendet (Exit: %UP_ERR%) >> "%LOG%"

if %UP_ERR% neq 0 (
    color 0C
    echo  [!!] Container konnten nicht gestartet werden (Exit: %UP_ERR%).
    docker compose logs --tail=30
    docker compose logs --tail=30 >> "%LOG%" 2>&1
    pause & exit /b 1
)
echo  [OK] Container gestartet.

:: ── 6. Auf Bereitschaft warten ────────────────────────────────────────────────
echo.
echo  [..] Warte auf Anwendung (max. 4 Minuten)...
set VERSUCHE=0
:HEALTH_CHECK
set /a VERSUCHE+=1
powershell -NonInteractive -Command "try{$r=(Invoke-WebRequest 'http://localhost/api/v1/health' -UseBasicParsing -TimeoutSec 3 -EA Stop).StatusCode;exit ($r -ne 200)}catch{exit 1}" >nul 2>&1
if %errorlevel% equ 0 goto BEREIT
if %VERSUCHE% geq 80 goto TIMEOUT
<nul set /p "=  Versuch !VERSUCHE!/80  "
echo.
timeout /t 3 /nobreak >nul
goto HEALTH_CHECK

:TIMEOUT
echo  [!] Timeout -- App braucht laenger. Bitte http://localhost in 2 Min oeffnen.
echo [WARN] Health-Check Timeout nach %VERSUCHE% Versuchen >> "%LOG%"
docker compose logs --tail=20 >> "%LOG%" 2>&1
goto BROWSER

:BEREIT
echo  [OK] Anwendung bereit nach %VERSUCHE% Versuchen!
echo [OK] Bereit nach %VERSUCHE% Versuchen (%TIME%) >> "%LOG%"

:BROWSER
timeout /t 1 /nobreak >nul
start "" "http://localhost"
docker compose ps >> "%LOG%" 2>&1

color 0B
echo.
echo  ============================================================
echo   Gutachten-Manager laeuft!
echo.
echo   Adresse:  http://localhost
echo   Stoppen:  BEENDEN.bat
echo   Status:   STATUS.bat
echo   Log:      %CD%\%LOG%
echo  ============================================================
echo.
pause

```

## BEENDEN.bat
```batch
@echo off
setlocal

:: Fenster offen halten wenn per Doppelklick gestartet
echo %CMDCMDLINE% | findstr /i "/c " >nul 2>&1
if %errorlevel% equ 0 (
    cmd /K ""%~f0""
    exit /b
)

cd /d "%~dp0"
cls
color 0C
echo.
echo  ============================================================
echo   GUTACHTEN-MANAGER  ^|  Wird gestoppt...
echo  ============================================================
echo.
echo  Stoppe alle Container...
echo.

docker compose down

if %errorlevel% equ 0 (
    color 0A
    echo.
    echo  [OK] Gutachten-Manager wurde gestoppt.
    echo  Ihre Daten sind sicher in der Datenbank gespeichert.
) else (
    echo.
    echo  Hinweis: Anwendung lief moeglicherweise nicht.
)

echo.
echo  Druecken Sie eine beliebige Taste zum Schliessen.
pause >nul

```

## STATUS.bat
```batch
@echo off
setlocal

:: Fenster offen halten wenn per Doppelklick gestartet
echo %CMDCMDLINE% | findstr /i "/c " >nul 2>&1
if %errorlevel% equ 0 (
    cmd /K ""%~f0""
    exit /b
)

cd /d "%~dp0"
if not exist "logs" mkdir logs
set LOG_STATUS=logs\status-aktuell.log

(
    echo ================================================================
    echo  GUTACHTEN-MANAGER -- Status-Protokoll
    echo  Datum: %DATE%   Zeit: %TIME%
    echo ================================================================
    echo.
) > "%LOG_STATUS%"

cls
color 0B
echo.
echo  ============================================================
echo   GUTACHTEN-MANAGER  ^|  Status-Uebersicht
echo  ============================================================
echo.

echo  Container-Status:
echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
docker compose ps
docker compose ps >> "%LOG_STATUS%" 2>&1
echo.

echo  Erreichbarkeit:
echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
powershell -NonInteractive -Command "try{$r=(Invoke-WebRequest 'http://localhost/api/v1/health' -UseBasicParsing -TimeoutSec 5 -EA Stop).StatusCode;exit ($r -ne 200)}catch{exit 1}" >nul 2>&1
if %errorlevel% equ 0 (
    color 0A
    echo   [OK]  http://localhost          ERREICHBAR
    echo   [OK]  ERREICHBAR >> "%LOG_STATUS%"
) else (
    color 0C
    echo   [!!]  http://localhost          NICHT ERREICHBAR
    echo   [!!]  NICHT ERREICHBAR >> "%LOG_STATUS%"
)
color 0B
echo.

echo  Ressourcen-Verbrauch:
echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
docker stats --no-stream --format "  {{.Name}}: CPU {{.CPUPerc}}  RAM {{.MemUsage}}" 2>&1
docker stats --no-stream --format "  {{.Name}}: CPU {{.CPUPerc}}  RAM {{.MemUsage}}" >> "%LOG_STATUS%" 2>&1
echo.

echo  Letzte Log-Eintraege (30 Zeilen):
echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
docker compose logs --tail=30 2>&1
docker compose logs --tail=30 >> "%LOG_STATUS%" 2>&1
echo.

echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
echo.
echo  Logdatei:  %CD%\%LOG_STATUS%
echo.
echo  Druecken Sie eine beliebige Taste zum Schliessen.
pause >nul

```
