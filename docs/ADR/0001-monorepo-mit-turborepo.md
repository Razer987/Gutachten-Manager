# ADR 0001 — Monorepo mit pnpm Workspaces und Turborepo

**Status:** Akzeptiert
**Datum:** 2026-03-23

## Kontext

Der Gutachten-Manager besteht aus mehreren Teilen die miteinander kommunizieren:
- Ein Next.js Frontend
- Ein Express.js Backend
- Gemeinsame TypeScript-Typen die beide Teile nutzen

Diese Teile könnten in separaten Repositories verwaltet werden (Polyrepo)
oder in einem einzigen Repository (Monorepo).

## Entscheidung

**Monorepo mit pnpm Workspaces und Turborepo.**

## Begründung

### Vorteile des Monorepos

1. **Geteilte Typen ohne NPM-Veröffentlichung:**
   `@gutachten/shared` ist ein lokales Paket. Änderungen an Typen sind sofort
   in Frontend und Backend sichtbar — ohne Veröffentlichung bei npm.

2. **Atomare Commits:**
   Eine API-Änderung und die dazugehörige Frontend-Änderung können in einem
   einzigen Commit landen. Das macht die Git-Historie nachvollziehbarer.

3. **Einheitliche Werkzeuge:**
   ESLint, TypeScript und Prettier gelten einheitlich — konfiguriert einmal
   im `packages/config` Paket.

4. **Einfachere Entwicklung:**
   `pnpm dev` startet alle Apps gleichzeitig. Kein Wechsel zwischen Repositories.

### Warum Turborepo?

Turborepo löst das Kernproblem von Monorepos: **Build-Performance**.

- **Parallele Ausführung:** Frontend und Backend werden gleichzeitig gebaut
- **Intelligentes Caching:** Nur geänderte Pakete werden neu gebaut
- **Klare Pipeline:** `"dependsOn": ["^build"]` stellt sicher dass Abhängigkeiten
  zuerst gebaut werden

### Warum pnpm statt npm/yarn?

- Schnellere Installation (symlinks statt Kopien)
- Strengerer Umgang mit "phantom dependencies" (bessere Isolation)
- Native Workspace-Unterstützung
- Weniger Speicherverbrauch

## Konsequenzen

**Positiv:**
- Schnelle Entwicklungs-Iteration durch geteilte Typen
- Saubere Abhängigkeits-Struktur

**Negativ:**
- Entwickler müssen pnpm statt npm verwenden
- Etwas komplexerer initialer Setup verglichen mit Einzelprojekt

**Risiken:**
- Bei sehr großem Team kann ein Monorepo unübersichtlich werden
  → Dann Migration zu Nx oder getrennte Repositories möglich

## Alternativen die abgelehnt wurden

| Alternative     | Warum abgelehnt                                          |
|-----------------|----------------------------------------------------------|
| Polyrepo        | Typ-Synchronisation zu aufwändig, keine atomaren Commits |
| Nx              | Mächtiger als nötig, steilere Lernkurve                  |
| npm Workspaces  | Langsamer, keine gute Cache-Strategie                    |
