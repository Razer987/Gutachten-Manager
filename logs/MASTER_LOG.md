# MASTER LOG — Gutachten-Manager

> Dieses Dokument ist das zentrale Entwicklungs-Tagebuch des Gutachten-Managers.
> Jede wichtige Entscheidung, jeder Entwicklungsschritt und jede Überlegung
> wird hier festgehalten. Es dient als Gedächtnisprotokoll für das gesamte Team.

---

## Inhaltsverzeichnis

1. [Projektinitialisierung](#projektinitialisierung)
2. [Patch 0001 — Monorepo-Grundstruktur](#patch-0001)

---

## Projektinitialisierung

**Datum:** 2026-03-23
**Verantwortlich:** Claude Code (KI-Assistent)

### Ausgangssituation

Der Auftraggeber benötigt ein professionelles Verwaltungssystem für
unfallanalytische und unfalltechnische Gutachten. Das System soll:

- Vollständig webbasiert sein (Full-Stack)
- Skalierbar für mehrere Büros sein (SaaS-fähig)
- Erweiterbar und versionierbar sein
- Über ein Patch-System updatebar sein

### Anforderungsermittlung

In einem strukturierten Interview wurden **60 Fragen** gestellt und beantwortet.
Die vollständigen Antworten bilden die Grundlage für alle Architektur-Entscheidungen.

**Kernanforderungen:**
- Frontend: Next.js 14 + TypeScript + Material UI
- Backend: Node.js + Express.js + TypeScript
- Datenbank: PostgreSQL + Prisma ORM
- Monorepo: pnpm Workspaces + Turborepo
- Deployment: Docker + Docker Compose
- Testing: Jest (Unit/Integration) + Playwright (E2E)
- Logging: Winston (File-based)
- API-Versionierung: URL-basiert (/api/v1/)
- Releases: CalVer (2026.03.1)
- Multi-Tenancy: Schema-per-Tenant (vorbereitet)
- Keine Authentifizierung in Phase 1

### Technologie-Entscheidungen

Alle Technologie-Entscheidungen sind in `docs/ADR/` dokumentiert.

---

## Patch 0001 — Monorepo-Grundstruktur {#patch-0001}

**Datum:** 2026-03-23
**Patch-Datei:** `patches/0001-monorepo-grundstruktur.patch`
**Version:** 2026.03.1

### Was wurde gemacht?

Aufbau der vollständigen Monorepo-Grundstruktur mit:

- `package.json` (Root) mit pnpm Workspaces und Turborepo
- `pnpm-workspace.yaml` — Workspace-Konfiguration
- `turbo.json` — Build-Pipeline-Konfiguration
- `.gitignore` — vollständig, mit Erklärungen
- `.editorconfig` — einheitliche Code-Formatierung
- `.env.example` — alle Umgebungsvariablen dokumentiert
- Vollständige Ordnerstruktur mit `README.md` in jedem Verzeichnis
- `docs/SETUP.md` — Installationsanleitung
- `docs/ARCHITECTURE.md` — Systemarchitektur
- `docs/PATCHES.md` — Patch-System Dokumentation
- `docs/ADR/` — Architecture Decision Records
- `logs/MASTER_LOG.md` — dieses Dokument

### Warum Monorepo?

Ein Monorepo erlaubt es Frontend, Backend und gemeinsame Pakete in einem
einzigen Repository zu verwalten. Vorteile:

1. **Geteilte Typen:** TypeScript-Interfaces werden einmal definiert und
   von Frontend und Backend gemeinsam genutzt — keine Duplikation
2. **Atomare Commits:** Eine Änderung die Frontend UND Backend betrifft,
   kann in einem einzigen Commit landen
3. **Einheitliche Tooling:** ESLint, Prettier, TypeScript gelten überall gleich
4. **Einfache Abhängigkeiten:** `@gutachten/shared` ist ein lokales Paket

Nachteil: Komplexerer Setup. Wird durch Turborepo und pnpm Workspaces minimiert.

### Warum Turborepo?

Turborepo optimiert den Build-Prozess eines Monorepos:
- Parallele Ausführung von Tasks
- Intelligentes Caching (nur geänderte Pakete werden neu gebaut)
- Klare Abhängigkeits-Pipeline (`^build` = erst Abhängigkeiten bauen)

Alternative war Nx — entschieden gegen Nx weil Turborepo für diesen
Umfang ausreichend und einfacher zu konfigurieren ist.

### Bekannte Einschränkungen

- Node.js und pnpm müssen auf dem System installiert sein
- Windows-Unterstützung: Shell-Skripte müssen unter WSL2 ausgeführt werden

### Nächste Schritte

→ Patch 0002: Shared Packages (Prisma Schema, TypeScript-Typen, ESLint-Config)

---

*Ende des Logs für Patch 0001*
