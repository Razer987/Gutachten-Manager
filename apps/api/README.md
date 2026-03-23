# apps/api/ — Express.js Backend (REST API)

Das Backend des Gutachten-Managers. Eine **REST API** gebaut mit **Node.js**,
**Express.js** und **TypeScript**. Alle API-Endpunkte sind unter `/api/v1/` erreichbar.

## Was ist hier drin?

```
apps/api/
├── src/
│   ├── server.ts               # Einstiegspunkt — startet den Express-Server
│   ├── app.ts                  # Express App-Konfiguration & Middleware-Setup
│   ├── v1/                     # API Version 1 (alle aktuellen Endpunkte)
│   │   └── router.ts           # Haupt-Router — verbindet alle Module
│   ├── modules/                # Feature-Module (jedes Modul = eigenständige Einheit)
│   │   ├── gutachten/          # Gutachten CRUD & Workflow
│   │   │   ├── gutachten.routes.ts
│   │   │   ├── gutachten.controller.ts
│   │   │   ├── gutachten.service.ts
│   │   │   └── gutachten.validators.ts
│   │   ├── kunden/             # Kundenverwaltung (CRM)
│   │   ├── fahrzeuge/          # Fahrzeugdaten
│   │   ├── personen/           # Beteiligte Personen & Zeugen
│   │   ├── schaeden/           # Schadensberechnung
│   │   ├── dateien/            # Datei-Upload & -Verwaltung
│   │   ├── kalender/           # Termine & Kalender
│   │   ├── notizen/            # Interne Notizen
│   │   ├── aufgaben/           # To-Do Aufgaben
│   │   ├── audit/              # Änderungshistorie
│   │   ├── admin/              # Admin-Funktionen
│   │   └── backup/             # Backup & Export
│   ├── middleware/             # Express Middleware
│   │   ├── error.middleware.ts     # Fehlerbehandlung
│   │   ├── validation.middleware.ts # Request-Validierung (Zod)
│   │   ├── upload.middleware.ts    # Datei-Upload (Multer)
│   │   └── audit.middleware.ts    # Automatisches Audit-Logging
│   ├── config/                 # Konfiguration
│   │   ├── database.ts         # Prisma Client Singleton
│   │   ├── logger.ts           # Winston Logger Konfiguration
│   │   └── env.ts              # Umgebungsvariablen (typisiert & validiert)
│   └── lib/                    # Hilfsfunktionen
│       ├── aktenzeichen.ts     # Aktenzeichen-Generator (GA-2025-001)
│       └── pagination.ts       # Pagination-Hilfsfunktionen
├── uploads/                    # Hochgeladene Dateien (NICHT in Git!)
├── logs/                       # Server-Logs (NICHT in Git!)
├── tests/
│   ├── unit/                   # Einheitstests für Services & Utils
│   └── integration/            # API-Endpunkt-Tests
├── .env.example                # Umgebungsvariablen-Vorlage
├── tsconfig.json               # TypeScript-Konfiguration
└── package.json                # Abhängigkeiten & Skripte
```

## Lokale Entwicklung

```bash
# Im Projektroot:
pnpm --filter api dev

# Oder direkt in diesem Ordner:
cd apps/api
pnpm dev
```

Die API ist dann erreichbar unter:
- **API:** http://localhost:4000/api/v1/
- **Health-Check:** http://localhost:4000/api/v1/health

## API-Versionierung

Alle Endpunkte folgen dem Schema: `/api/v1/<ressource>`

Neue API-Versionen werden als `/api/v2/` hinzugefügt — die alte Version bleibt
erhalten bis alle Clients migriert sind.

## Module hinzufügen

Neue Features werden als eigenständige Module unter `src/modules/` angelegt:

```
src/modules/mein-feature/
├── mein-feature.routes.ts      # URL-Routen
├── mein-feature.controller.ts  # Request/Response-Handling
├── mein-feature.service.ts     # Business-Logik
└── mein-feature.validators.ts  # Input-Validierung (Zod)
```

Dann in `src/v1/router.ts` registrieren — fertig.

## Wichtige Technologien

| Technologie  | Verwendungszweck                        |
|--------------|-----------------------------------------|
| Express.js   | HTTP-Server & Routing                   |
| Prisma ORM   | Datenbankzugriff (typsicher)            |
| Zod          | Request-Validierung & Typen             |
| Multer       | Datei-Upload-Verarbeitung               |
| Winston      | Strukturiertes Logging                  |
| Puppeteer    | PDF-Generierung                         |
| node-cron    | Geplante Aufgaben (automatisches Backup)|
| Jest         | Unit & Integrationstests                |
