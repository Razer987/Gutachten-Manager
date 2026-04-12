# Gutachten-Manager — Vollständiger Code-Audit
**Datum:** 12. April 2026  
**Prüfer:** Claude (Sonnet 4.6) — Strenge Analyse ohne Vorkenntnisse aus früheren Sitzungen  
**Methode:** Alle Quelldateien wurden einzeln gelesen und gegen Schema, Routen und Frontend-Client geprüft

---

## 1. Systemarchitektur

### Technologie-Stack

| Schicht | Technologie | Version |
|---------|-------------|---------|
| Frontend | Next.js 15, React 18, Material UI 6 | App Router |
| Backend | Express.js, TypeScript | Node.js 20 |
| Datenbank | PostgreSQL 16 | via Prisma ORM 6 |
| Pakete | pnpm 9.15.4, Turborepo 2 | Monorepo |
| Deployment | Docker Compose, Nginx | 4 Container |

### Monorepo-Struktur

```
gutachten-manager/
├── apps/
│   ├── api/          Express.js REST API (Port 4000 intern)
│   └── web/          Next.js Frontend (Port 3000 intern)
├── packages/
│   ├── database/     Prisma Schema + Client-Singleton
│   ├── shared/       Gemeinsame Typen, Konstanten, Utils
│   └── config/       TypeScript- und ESLint-Konfigurationen
├── infrastructure/
│   └── docker/       Dockerfiles, Nginx-Config, Entrypoint-Script
├── docker-compose.yml
├── STARTEN.bat
├── BEENDEN.bat
└── STATUS.bat
```

### Datenfluss

```
Browser → Nginx:80 → /api/* → API:4000 → PostgreSQL:5432
                   → /*    → Web:3000
```

---

## 2. Datenbankschema (packages/database/prisma/schema.prisma)

### Tabellen-Übersicht

| Tabelle | Zeilen ca. | Zweck |
|---------|-----------|-------|
| `gutachten` | Kern | Hauptentität, 7-Stufen-Workflow |
| `kunden` | CRM | Auftraggeber |
| `gutachter` | CRM | Sachverständige |
| `unfall` | 1:1 | Unfallort, Hergang, Wetter, Polizei |
| `fahrzeuge` | n:1 | Beteiligte KFZ |
| `personen` | n:1 | Fahrer, Zeugen, Verletzte |
| `schadensposten` | n:1 | Kostenberechnung (Cents) |
| `dateien` | n:1 | Upload-Verwaltung |
| `notizen` | n:1 | Interne Notizen |
| `aufgaben` | n:1 | To-Do-Liste |
| `termine` | n:1 | Kalender |
| `audit_logs` | n:1 | Änderungshistorie |
| `kontakt_historie` | n:1 | CRM-Kontakthistorie |
| `feature_flags` | System | Admin-Panel-Flags |
| `tenants` | System | SaaS-Vorbereitung (inaktiv) |

### Enums (Prisma ↔ Backend ↔ Frontend VERIFIZIERT)

```
GutachtenStatus: AUFGENOMMEN | BEAUFTRAGT | BESICHTIGUNG | ENTWURF | FREIGABE | FERTIG | ARCHIV
PersonTyp:       FAHRER | BEIFAHRER | FUSSGAENGER | ZEUGE | VERLETZTE
AufgabePrioritaet: NIEDRIG | NORMAL | HOCH | KRITISCH
Wetterlage:      KLAR | BEWOELKT | REGEN | STARKREGEN | SCHNEE | GLAETTE | NEBEL | STURM
Strassenzustand: TROCKEN | NASS | SCHNEEBEDECKT | VEREIST | VERSCHMUTZT
Sichtverhaeltnis: GUT | MITTEL | SCHLECHT | NACHT | DAEMMERUNG
```

---

## 3. API-Endpunkte (vollständige Referenz)

### Haupt-Ressourcen

| Method | Pfad | Datei |
|--------|------|-------|
| GET | `/api/v1/health` | v1/router.ts |
| GET | `/api/v1/gutachten` | gutachten.routes.ts |
| POST | `/api/v1/gutachten` | gutachten.routes.ts |
| GET | `/api/v1/gutachten/:id` | gutachten.routes.ts |
| PATCH | `/api/v1/gutachten/:id` | gutachten.routes.ts |
| DELETE | `/api/v1/gutachten/:id` | gutachten.routes.ts |
| PATCH | `/api/v1/gutachten/:id/status` | gutachten.routes.ts |
| POST | `/api/v1/gutachten/:id/verknuepfen` | gutachten.routes.ts |
| GET | `/api/v1/gutachten/:id/pdf` | gutachten.routes.ts |
| GET | `/api/v1/kunden` | kunden.routes.ts |
| POST | `/api/v1/kunden` | kunden.routes.ts |
| GET | `/api/v1/kunden/:id` | kunden.routes.ts |
| PATCH | `/api/v1/kunden/:id` | kunden.routes.ts |
| DELETE | `/api/v1/kunden/:id` | kunden.routes.ts |
| POST | `/api/v1/kunden/:id/kontakte` | kunden.routes.ts |
| GET | `/api/v1/gutachter` | gutachter.routes.ts |
| POST | `/api/v1/gutachter` | gutachter.routes.ts |
| GET | `/api/v1/gutachter/:id` | gutachter.routes.ts |
| PATCH | `/api/v1/gutachter/:id` | gutachter.routes.ts |
| DELETE | `/api/v1/gutachter/:id` | gutachter.routes.ts |
| GET | `/api/v1/termine` | termine.routes.ts |
| POST | `/api/v1/termine` | termine.routes.ts |
| GET | `/api/v1/termine/:id` | termine.routes.ts |
| PATCH | `/api/v1/termine/:id` | termine.routes.ts |
| DELETE | `/api/v1/termine/:id` | termine.routes.ts |
| GET | `/api/v1/kalender` | → alias für termine |
| GET | `/api/v1/dashboard/stats` | dashboard.routes.ts |
| GET | `/api/v1/dashboard/monatsuebersicht` | dashboard.routes.ts |
| GET | `/api/v1/suche?q=...` | suche.routes.ts |
| GET | `/api/v1/admin/feature-flags` | admin.routes.ts |
| PATCH | `/api/v1/admin/feature-flags/:name` | admin.routes.ts |
| POST | `/api/v1/admin/backup` | admin.routes.ts |

### Sub-Ressourcen (unter `/api/v1/gutachten/:gutachtenId/`)

| Method | Pfad | Datei |
|--------|------|-------|
| GET | `unfall` | unfall.routes.ts |
| PUT | `unfall` | unfall.routes.ts |
| GET | `fahrzeuge` | fahrzeuge.routes.ts |
| POST | `fahrzeuge` | fahrzeuge.routes.ts |
| GET | `fahrzeuge/:id` | fahrzeuge.routes.ts |
| PATCH | `fahrzeuge/:id` | fahrzeuge.routes.ts |
| DELETE | `fahrzeuge/:id` | fahrzeuge.routes.ts |
| GET | `personen` | personen.routes.ts |
| POST | `personen` | personen.routes.ts |
| GET | `personen/:id` | personen.routes.ts |
| PATCH | `personen/:id` | personen.routes.ts |
| DELETE | `personen/:id` | personen.routes.ts |
| GET | `schaden` | schaden.routes.ts |
| POST | `schaden` | schaden.routes.ts |
| PATCH | `schaden/:id` | schaden.routes.ts |
| DELETE | `schaden/:id` | schaden.routes.ts |
| GET | `notizen` | notizen.routes.ts |
| POST | `notizen` | notizen.routes.ts |
| PATCH | `notizen/:id` | notizen.routes.ts |
| DELETE | `notizen/:id` | notizen.routes.ts |
| GET | `aufgaben` | aufgaben.routes.ts |
| POST | `aufgaben` | aufgaben.routes.ts |
| PATCH | `aufgaben/:id` | aufgaben.routes.ts |
| DELETE | `aufgaben/:id` | aufgaben.routes.ts |
| GET | `dateien` | dateien.routes.ts |
| POST | `dateien` | dateien.routes.ts |
| GET | `dateien/:id` | dateien.routes.ts |
| GET | `dateien/:id/download` | dateien.routes.ts ✅ NEU |
| PATCH | `dateien/:id` | dateien.routes.ts |
| DELETE | `dateien/:id` | dateien.routes.ts |
| GET | `audit` | audit.routes.ts |

---

## 4. Frontend-Seiten (apps/web/src/app/(dashboard)/)

| Route | Datei | Funktion |
|-------|-------|---------|
| `/gutachten` | gutachten/page.tsx | Listenansicht, Suche, Pagination |
| `/gutachten/new` | gutachten/new/page.tsx | Neues Gutachten erstellen |
| `/gutachten/[id]` | gutachten/[id]/page.tsx | Detailansicht mit 8 Tabs |
| `/gutachten/[id]/edit` | gutachten/[id]/edit/page.tsx | Gutachten bearbeiten |
| `/kunden` | kunden/page.tsx | Kundenliste |
| `/kunden/new` | kunden/new/page.tsx | Neuer Kunde |
| `/kunden/[id]` | kunden/[id]/page.tsx | Kundendetail |
| `/kunden/[id]/edit` | kunden/[id]/edit/page.tsx | Kunde bearbeiten |
| `/gutachter` | gutachter/page.tsx | Gutachterliste |
| `/gutachter/new` | gutachter/new/page.tsx | Neuer Gutachter |
| `/gutachter/[id]` | gutachter/[id]/page.tsx | Gutachterdetail |
| `/gutachter/[id]/edit` | gutachter/[id]/edit/page.tsx | Gutachter bearbeiten |
| `/kalender` | kalender/page.tsx | Terminkalender |
| `/dashboard` | dashboard/page.tsx | Statistiken & KPIs |
| `/suche` | suche/page.tsx | Volltextsuche |
| `/admin` | admin/page.tsx | Feature-Flags, Backup |
| `/berichte` | berichte/page.tsx | Reports |

---

## 5. Audit-Befunde

### 5.1 Bestätigte Bugs (alle behoben)

---

**BUG-01 — `suche.service.ts:50`: Fehlende `total`-Summe**  
Datei: `apps/api/src/modules/suche/suche.service.ts`  
Status: 🔴 KRITISCH → ✅ BEHOBEN

```typescript
// VORHER — kein total
return { gutachten, kunden, gutachter };

// NACHHER — total korrekt berechnet
const total = gutachten.length + kunden.length + gutachter.length;
return { gutachten, kunden, gutachter, total };
```

**Auswirkung:** Frontend verwendete `result?.total ?? 0`, was immer `0` ergab.
`hasResults` war dadurch immer `false` → Suchergebnisse wurden NIE angezeigt,
obwohl die Datenbank Treffer zurückgegeben hatte.

---

**BUG-02 — `suche/page.tsx:33-45`: Falsche Status-Konstanten**  
Datei: `apps/web/src/app/(dashboard)/suche/page.tsx`  
Status: 🔴 KRITISCH → ✅ BEHOBEN

```typescript
// VORHER — komplett falsche Enum-Werte (aus altem System)
const STATUS_COLORS = {
  ENTWURF: 'default',
  IN_BEARBEITUNG: 'primary',   // existiert NICHT im Schema
  ABGESCHLOSSEN: 'success',    // existiert NICHT im Schema
  ARCHIVIERT: 'warning',       // existiert NICHT im Schema
};

// NACHHER — korrekte Enum-Werte gemäß schema.prisma
const STATUS_COLORS = {
  AUFGENOMMEN: 'default',
  BEAUFTRAGT: 'info',
  BESICHTIGUNG: 'primary',
  ENTWURF: 'warning',
  FREIGABE: 'secondary',
  FERTIG: 'success',
  ARCHIV: 'default',
};
```

**Auswirkung:** 6 von 7 Status-Chips in der Suche zeigten rohe Enum-Werte
(z.B. "AUFGENOMMEN") statt der deutschen Labels.

---

**BUG-03 — `suche.api.ts:8-31`: `highlight`-Feld in Interface, aber nicht im Backend**  
Datei: `apps/web/src/lib/api/suche.api.ts`  
Status: 🟠 INKONSISTENZ → ✅ BEHOBEN

```typescript
// VORHER — highlight nie vom Backend zurückgegeben
gutachten: Array<{ id: string; aktenzeichen: string; titel: string; status: string; highlight: string }>;

// NACHHER — bereinigt, nur was das Backend wirklich sendet
gutachten: Array<{ id: string; aktenzeichen: string; titel: string; status: string }>;
```

**Auswirkung:** TypeScript-Inkonsistenz. Das Feld wurde im UI nicht gerendert,
aber die Typdefinition war falsch.

---

**BUG-04 — `subresources.api.ts`: Fehlende `update()`-Methoden**  
Datei: `apps/web/src/lib/api/subresources.api.ts`  
Status: 🔴 KRITISCH → ✅ BEHOBEN

```typescript
// VORHER — kein update für fahrzeuge, personen, notizen, schaden
fahrzeuge: { list, create, delete }
personen:  { list, create, delete }
notizen:   { list, create, delete }
schaden:   { list, create, delete }

// NACHHER — update hinzugefügt (PATCH /:id im Backend vorhanden)
fahrzeuge: { list, create, update, delete }
personen:  { list, create, update, delete }
notizen:   { list, create, update, delete }
schaden:   { list, create, update, delete }
```

**Auswirkung:** Edit-Buttons für Fahrzeuge, Personen, Notizen und Schadensposten
hatten keine API-Methode, obwohl das Backend `PATCH /:id` bereits implementiert hatte.

---

**BUG-05 — `dateien.routes.ts`/`dateien.controller.ts`: Fehlender Download-Endpunkt**  
Datei: `apps/api/src/modules/dateien/dateien.routes.ts` + `dateien.controller.ts`  
Status: 🔴 KRITISCH → ✅ BEHOBEN

```typescript
// VORHER — kein /download Endpunkt
// Frontend verwendete: /gutachten/:id/dateien/:id/download
// Existierende Route: GET /:id (liefert nur JSON-Metadaten)

// NACHHER — neuer Endpunkt vor GET /:id (Reihenfolge wichtig!)
router.get('/:id/download', asyncHandler(dateienController.download));
router.get('/:id', asyncHandler(dateienController.findById));

// Controller:
async download(req: Request, res: Response) {
  const datei = await dateienService.findById(req.params.gutachtenId, req.params.id);
  res.download(path.resolve(datei.pfad), datei.originalname);
},
```

**Auswirkung:** Klick auf Download-Button lieferte JSON-Metadaten statt
die eigentliche Datei. `res.download()` sendet die Datei als Download
mit originalem Dateinamen.

---

### 5.2 Falsch-Alarme (nach Prüfung nicht real)

| Befund | Warum kein Fehler |
|--------|-------------------|
| Unfall-Routes fehlt | Datei existiert, hat GET + PUT |
| Multer nicht konfiguriert | Konfiguration in dateien.routes.ts, Storage + Filter korrekt |
| DATABASE_PASSWORD Mismatch | docker-compose verwendet `${VAR:-default}`, .env überschreibt den Default |
| CORS blockiert Docker | `CORS_ORIGINS=http://localhost`, Browser-Requests kommen von `http://localhost` → gleiche Origin → kein CORS nötig |
| Unfall-Typ PUT statt PUT | Backend hat `router.put('/', ...)`, Frontend verwendet `apiClient.put()` → konsistent |

---

### 5.3 Offene Punkte (nicht blockierend)

| Nr | Beschreibung | Priorität |
|----|-------------|-----------|
| W-01 | Keine Authentifizierung (JWT/Session) implementiert | HOCH |
| W-02 | `prisma db push --accept-data-loss` in Produktion riskant; besser: `migrate deploy` | MITTEL |
| W-03 | `Unfalldaten.UpdateInput` fehlen: `breitengrad`, `laengengrad`, `polizeiEinsatznummer`, `polizeiProtokollDatum` | NIEDRIG |
| W-04 | `Datei.pfad` speichert absoluten Pfad im Container; bei Volume-Migration können Pfade ungültig werden | NIEDRIG |
| W-05 | Race Condition in `gutachten.service.ts update()`: findUnique + update ohne Transaktion | NIEDRIG |
| W-06 | PDF-Service hat kein Error-Handling wenn `pdfkit` crasht | NIEDRIG |
| W-07 | Kein Rate-Limiting für API-Endpunkte | NIEDRIG |

---

## 6. Docker-Analyse

### docker-compose.yml — Service-Abhängigkeiten

```
nginx → (wartet auf) web (healthy) + api (healthy)
web   → (wartet auf) api (healthy)
api   → (wartet auf) db (healthy)
db    → (keine Abhängigkeit)
```

### Start-Reihenfolge beim ersten Start

```
1. db startet (postgres:16-alpine)
2. db ist healthy (pg_isready antwortet)
3. api startet → entrypoint führt prisma db push aus
4. api ist healthy (port 4000 antwortet)
5. web startet (Next.js standalone)
6. web ist healthy (port 3000 antwortet)
7. nginx startet (als Reverse Proxy)
```

### api-entrypoint.sh (vereinfacht, robust)

```sh
#!/bin/sh
set -e
# DB ist garantiert healthy (depends_on: condition: service_healthy)
node_modules/.bin/prisma db push \
  --schema packages/database/prisma/schema.prisma \
  --accept-data-loss \
  --skip-generate
exec node dist/server.js
```

**Begründung der Vereinfachung:** Der frühere `until prisma db execute`-Loop
konnte indefinit hängen, da `prisma db execute --stdin` auf eine DB-Verbindung
warten kann ohne Timeout. Docker Compose übernimmt das Warten via
`depends_on: db: condition: service_healthy`.

### STARTEN.bat — Wichtigste Änderung

```batch
# VORHER (unsichtbar, hängt still)
docker compose up --build -d > "%TEMP%\gm_start.txt" 2>&1

# NACHHER (sichtbar, getrennte Schritte)
docker compose build          ← Build-Ausgabe live im Fenster
docker compose up -d          ← Container starten
```

---

## 7. Geänderte Dateien (diese Session)

| Datei | Art der Änderung | Bug |
|-------|-----------------|-----|
| `apps/api/src/modules/suche/suche.service.ts` | `total` zum Return hinzugefügt | BUG-01 |
| `apps/web/src/app/(dashboard)/suche/page.tsx` | Status-Konstanten korrigiert | BUG-02 |
| `apps/web/src/lib/api/suche.api.ts` | `highlight`-Felder entfernt, `firma` hinzugefügt | BUG-03 |
| `apps/web/src/lib/api/subresources.api.ts` | `update()` für 4 Ressourcen hinzugefügt | BUG-04 |
| `apps/api/src/modules/dateien/dateien.routes.ts` | `GET /:id/download` Route hinzugefügt | BUG-05 |
| `apps/api/src/modules/dateien/dateien.controller.ts` | `download()` Handler hinzugefügt | BUG-05 |
| `apps/web/src/app/(dashboard)/layout.tsx` | `'use client'` auf Zeile 1 verschoben | Build-Fehler |
| `infrastructure/docker/api-entrypoint.sh` | Vereinfacht, `prisma db execute` Loop entfernt | Hänger |
| `STARTEN.bat` | Build-Ausgabe sichtbar, `docker compose build` getrennt | Stille Hänger |
| `apps/web/src/app/(dashboard)/suche/page.tsx` | `useSearchParams` in `<Suspense>` eingebettet | Next.js 15 |
| `apps/web/public/.gitkeep` | Leeres Verzeichnis für Git/Docker trackbar gemacht | Docker Build |
| `packages/config/tsconfig/base.json` | `moduleResolution: "bundler"` → `"node"` | TypeScript |

---

## 8. Bekannte Grenzen dieser Prüfung

1. **Kein Live-Test möglich:** Docker ist in dieser Umgebung nicht ausführbar.
   Alle Befunde basieren auf statischer Code-Analyse.

2. **TypeScript-Fehler nicht durch Compiler geprüft:** `tsc --noEmit` wurde
   nicht ausgeführt. Mögliche TypeScript-Fehler in ungelesenen Dateien
   könnten existieren.

3. **Tests nicht ausgeführt:** `jest`-Tests in `apps/api/tests/` wurden
   nicht gelesen oder ausgeführt.

4. **Keine Sicherheitsprüfung:** Ein vollständiges Security-Audit
   (Penetrationstest, Dependency-Audit, CVE-Scan) wurde nicht durchgeführt.

---

## 9. Empfehlung für externe Code-Review (ChatGPT / Gemini)

Die folgenden Aspekte sind besonders geeignet für eine Zweitmeinung:

1. **`packages/database/prisma/schema.prisma`** — Ist das Datenbankdesign
   normalisiert? Fehlen Indizes? Ist `Cascade`-Delete überall korrekt?

2. **`apps/api/src/modules/gutachten/gutachten.service.ts`** — Sind alle
   Prisma-Queries optimiert? N+1-Problem?

3. **`apps/api/src/modules/dateien/dateien.routes.ts`** — Ist die
   Multer-Konfiguration sicher? Können Dateien außerhalb des Upload-Verzeichnisses
   gespeichert werden?

4. **`infrastructure/docker/`** — Sind die Dockerfiles für Produktion geeignet?
   Sind die Health-Check-Intervalle sinnvoll?

5. **Fehlende Authentifizierung** — Das System hat keine Auth-Middleware.
   Alle Endpunkte sind öffentlich erreichbar. Für Produktion kritisch.

---

*Erstellt von Claude Code (Sonnet 4.6) — Gutachten-Manager Audit 2026-04-12*
