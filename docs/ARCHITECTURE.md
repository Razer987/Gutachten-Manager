# Systemarchitektur — Gutachten-Manager

> Dieses Dokument beschreibt die technische Architektur des Gutachten-Managers.
> Es richtet sich an Entwickler die das System verstehen oder erweitern wollen.

---

## Inhaltsverzeichnis

1. [Gesamtübersicht](#1-gesamtübersicht)
2. [Komponenten im Detail](#2-komponenten-im-detail)
3. [Datenbankarchitektur](#3-datenbankarchitektur)
4. [API-Architektur](#4-api-architektur)
5. [Frontend-Architektur](#5-frontend-architektur)
6. [Deployment-Architektur](#6-deployment-architektur)
7. [Datenfluss](#7-datenfluss)
8. [Sicherheit](#8-sicherheit)
9. [Erweiterbarkeit](#9-erweiterbarkeit)

---

## 1. Gesamtübersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET / LAN                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP/HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX (Reverse Proxy)                        │
│                         Port 80/443                             │
│                                                                 │
│   /          → web:3000   (Next.js Frontend)                    │
│   /api/v1/   → api:4000   (Express.js Backend)                  │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐    ┌─────────────────────────────────────┐
│   apps/web           │    │   apps/api                          │
│   Next.js 14         │    │   Express.js + TypeScript           │
│   Port: 3000         │    │   Port: 4000                        │
│                      │    │                                     │
│   Material UI        │    │   REST API /api/v1/                 │
│   React Query        │    │   Prisma ORM                        │
│   TipTap Editor      │    │   Winston Logger                    │
│   Leaflet Maps       │    │   Multer (Uploads)                  │
│   Konva.js           │    │   node-cron (Backup)                │
└──────────────────────┘    └─────────────────┬───────────────────┘
                                              │
                     ┌────────────────────────┼──────────────────┐
                     │                        │                  │
                     ▼                        ▼                  ▼
          ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐
          │   PostgreSQL     │  │   File System   │  │   Log Files      │
          │   Port: 5432     │  │   /uploads      │  │   /logs          │
          │                  │  │                 │  │                  │
          │  Schema: public  │  │  Fotos, PDFs,   │  │  api-error.log   │
          │  Schema: t_büro1 │  │  Dokumente      │  │  api-combined    │
          │  Schema: t_büro2 │  │                 │  │                  │
          └──────────────────┘  └─────────────────┘  └──────────────────┘
```

---

## 2. Komponenten im Detail

### apps/web (Next.js Frontend)

Das Frontend ist eine **Server-Side Rendered (SSR)** Webanwendung.

**Warum Next.js?**
- App Router für moderne React-Features (Server Components)
- Eingebautes SSR für bessere Performance
- API-Routes könnten später für BFF (Backend-for-Frontend) genutzt werden
- Große Community, stabiles Framework

**Wichtige Bibliotheken:**
| Bibliothek    | Zweck                                        |
|---------------|----------------------------------------------|
| Material UI   | UI-Komponenten, Dark/Light Mode, Theming     |
| React Query   | Server-State, Caching, automatisches Refetch |
| Zustand       | Client-State (UI-Zustand, Filter, etc.)      |
| TipTap        | Rich-Text-Editor für Gutachten-Beschreibungen|
| Leaflet       | Interaktive Karten für Unfallorte            |
| Konva.js      | Foto-Annotierungen & Unfallskizzen           |
| Recharts      | Charts & Diagramme im Dashboard              |
| FullCalendar  | Kalenderansicht für Besichtigungstermine     |

### apps/api (Express.js Backend)

Das Backend ist eine **REST API** mit modularer Struktur.

**Warum Express.js?**
- Einfach, flexibel, weit verbreitet
- Große Bibliotheks-Auswahl
- Leicht verständlich für neue Entwickler

**Modulare Struktur:**
Jedes Feature ist ein eigenständiges Modul:
```
src/modules/gutachten/
├── gutachten.routes.ts      # URL-Definitionen
├── gutachten.controller.ts  # HTTP Request/Response
├── gutachten.service.ts     # Business-Logik
└── gutachten.validators.ts  # Eingabe-Validierung
```

Neue Module können hinzugefügt werden ohne bestehenden Code anzufassen.

---

## 3. Datenbankarchitektur

### Schema-Übersicht (vereinfacht)

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Kunden    │────<│    Gutachten     │>────│   Gutachter  │
│             │     │                  │     │              │
│  id         │     │  id              │     │  id          │
│  name       │     │  aktenzeichen    │     │  name        │
│  email      │     │  titel           │     │  email       │
│  telefon    │     │  status          │     │  telefon     │
│  adresse    │     │  kunde_id (FK)   │     └──────────────┘
└─────────────┘     │  gutachter_id(FK)│
                    │  unfallOrt       │
                    │  unfallZeit      │
                    │  frist           │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼───────────────────┐
          │                  │                   │
          ▼                  ▼                   ▼
┌──────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Fahrzeuge     │ │    Personen     │ │    Schaeden     │
│                  │ │                 │ │                 │
│  id              │ │  id             │ │  id             │
│  gutachten_id    │ │  gutachten_id   │ │  gutachten_id   │
│  kennzeichen     │ │  typ (FAHRER/   │ │  position       │
│  fahrgestell     │ │       ZEUGE)    │ │  beschreibung   │
│  marke           │ │  vorname        │ │  betrag         │
│  modell          │ │  nachname       │ └─────────────────┘
│  baujahr         │ │  telefon        │
└──────────────────┘ └─────────────────┘
```

### Multi-Tenancy (Schema-per-Tenant)

```
PostgreSQL-Datenbank: gutachten_manager
│
├── Schema: public              # System-Ebene
│   ├── tenants                 # Mandanten-Verwaltung
│   ├── feature_flags           # System-weite Feature-Flags
│   └── tenant_feature_flags    # Mandanten-spezifische Flags
│
├── Schema: tenant_buro_001     # Büro 1 (vollständig isoliert)
│   ├── gutachten
│   ├── kunden
│   └── ...
│
└── Schema: tenant_buro_002     # Büro 2 (vollständig isoliert)
    ├── gutachten
    ├── kunden
    └── ...
```

---

## 4. API-Architektur

### URL-Struktur

```
/api/v1/<ressource>              # Sammlung
/api/v1/<ressource>/:id          # Einzelnes Element
/api/v1/<ressource>/:id/<sub>    # Unterressource
```

### HTTP-Methoden (REST-Konvention)

| Methode  | Bedeutung              | Beispiel                          |
|----------|------------------------|-----------------------------------|
| GET      | Daten abrufen          | GET /api/v1/gutachten             |
| POST     | Neues Element anlegen  | POST /api/v1/gutachten            |
| PUT      | Komplett ersetzen      | PUT /api/v1/gutachten/123         |
| PATCH    | Teilweise aktualisieren| PATCH /api/v1/gutachten/123       |
| DELETE   | Löschen                | DELETE /api/v1/gutachten/123      |

### Standard-Antwortformat

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

Fehlerantwort:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Das Aktenzeichen ist bereits vergeben.",
    "details": [...]
  }
}
```

---

## 5. Frontend-Architektur

### Seitenstruktur (Next.js App Router)

```
src/app/
├── layout.tsx                  # Root Layout (MUI Theme, Provider)
├── page.tsx                    # / → Redirect zum Dashboard
└── (dashboard)/                # Route Group (mit Sidebar-Layout)
    ├── layout.tsx              # Dashboard-Layout (Sidebar + Header)
    ├── dashboard/
    │   └── page.tsx            # Übersichts-Dashboard
    ├── gutachten/
    │   ├── page.tsx            # Liste (Tabelle/Kanban)
    │   ├── neu/page.tsx        # Neues Gutachten erstellen
    │   └── [id]/
    │       ├── page.tsx        # Gutachten-Detailansicht
    │       └── bearbeiten/     # Gutachten bearbeiten
    ├── kunden/                 # CRM
    ├── kalender/               # Terminkalender
    └── admin/                  # Admin-Panel
```

### State-Management-Strategie

```
Server State (API-Daten)
  → React Query (TanStack Query)
  → Automatisches Caching, Refetch, Fehlerbehandlung

Client State (UI-Zustand)
  → Zustand
  → Filter, Anzeigemodus (Tabelle/Kanban), Theme

Form State
  → React Hook Form + Zod
  → Validierung, Dirty-Tracking
```

---

## 6. Deployment-Architektur

```
┌────────────────────────────────────────┐
│           docker-compose.yml           │
│                                        │
│  ┌──────────┐    ┌──────────────────┐  │
│  │  nginx   │    │   web (Next.js)  │  │
│  │  :80     │───▶│   :3000          │  │
│  │          │    └──────────────────┘  │
│  │          │    ┌──────────────────┐  │
│  │          │───▶│   api (Express)  │  │
│  └──────────┘    │   :4000          │  │
│                  └────────┬─────────┘  │
│                           │            │
│                  ┌────────▼─────────┐  │
│                  │   db (Postgres)  │  │
│                  │   :5432          │  │
│                  └──────────────────┘  │
└────────────────────────────────────────┘
```

### Container-Volumes (Persistenz)

| Volume         | Inhalt                      | Pfad im Container        |
|----------------|-----------------------------|--------------------------|
| postgres_data  | Datenbankdaten              | /var/lib/postgresql/data |
| uploads_data   | Hochgeladene Dateien        | /app/uploads             |
| logs_data      | Anwendungs-Logs             | /app/logs                |
| backups_data   | Automatische Backups        | /app/backups             |

---

## 7. Datenfluss

### Beispiel: Neues Gutachten erstellen

```
1. Benutzer füllt Formular aus (Frontend)
   │
2. React Hook Form validiert Eingaben (Zod)
   │  Fehler → Fehlermeldung anzeigen
   │
3. React Query Mutation → POST /api/v1/gutachten
   │
4. Express Router → GutachtenController.create()
   │
5. Zod validiert Request-Body (nochmals, serverseitig)
   │  Fehler → 400 Bad Request
   │
6. GutachtenService.create()
   │  - Aktenzeichen generieren (GA-2026-001)
   │  - Prisma → INSERT in Datenbank
   │  - Audit-Log-Eintrag erstellen
   │
7. Response: { success: true, data: { id, aktenzeichen, ... } }
   │
8. React Query invalidiert Cache → Liste wird neu geladen
   │
9. Benutzer sieht das neue Gutachten in der Liste
```

---

## 8. Sicherheit

### Maßnahmen

| Bereich          | Maßnahme                                              |
|------------------|-------------------------------------------------------|
| Eingaben         | Zod-Validierung auf API und Frontend                  |
| SQL-Injection    | Prisma ORM (parametrisierte Abfragen, kein Raw SQL)   |
| XSS              | React escaped standardmäßig, MUI sanitized            |
| CORS             | Nur erlaubte Origins (konfigurierbar via .env)        |
| Upload-Sicherheit| MIME-Type-Prüfung, Dateigrößen-Limit                  |
| Logs             | Keine sensiblen Daten in Logs                         |

### Bekannte Einschränkungen

- **Keine Authentifizierung in Phase 1** — geplant für spätere Version
- Das System sollte NICHT direkt im Internet ohne VPN/Firewall betrieben werden

---

## 9. Erweiterbarkeit

### Neues Feature-Modul hinzufügen

1. Datenbankschema in `packages/database/prisma/schema.prisma` erweitern
2. Migration erstellen: `pnpm db:migrate:dev`
3. Backend-Modul anlegen: `apps/api/src/modules/<feature>/`
4. In Router registrieren: `apps/api/src/v1/router.ts`
5. Frontend-Komponenten anlegen: `apps/web/src/modules/<feature>/`
6. Seite registrieren: `apps/web/src/app/(dashboard)/<feature>/page.tsx`
7. Patch erstellen und Nummer vergeben

### API-Version 2 hinzufügen

```
apps/api/src/
├── v1/              # Bestehende Version (bleibt unverändert!)
│   └── router.ts
└── v2/              # Neue Version
    └── router.ts
```

In `app.ts`:
```typescript
app.use('/api/v1', v1Router);  // Bleibt!
app.use('/api/v2', v2Router);  // Neu
```
