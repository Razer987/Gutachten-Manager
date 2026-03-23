# Gutachten-Manager

> Professionelles Management-System für unfallanalytische und unfalltechnische Gutachten.

## Über dieses Projekt

Der Gutachten-Manager ist eine Full-Stack-Webanwendung, die Sachverständigenbüros bei der Verwaltung
von unfallanalytischen und unfalltechnischen Gutachten unterstützt. Das System deckt den gesamten
Lebenszyklus eines Gutachtens ab — von der Aufnahme bis zur Archivierung.

## Version

Aktuelle Version: **2026.03.1** (CalVer: JJJJ.MM.Patch)

## Schnellstart (Neuer PC / Erstinstallation)

```bash
# 1. Repository klonen
git clone <repository-url> gutachten-manager
cd gutachten-manager

# 2. Systemvoraussetzungen prüfen und installieren
./scripts/install.sh

# 3. Alle Patches anwenden (bringt System auf aktuellen Stand)
./scripts/apply-patches.sh

# 4. System starten
docker compose up -d
```

Die Anwendung ist dann erreichbar unter:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:4000/api/v1/
- **API-Dokumentation:** http://localhost:4000/api/v1/docs

## Projektstruktur

```
gutachten-manager/
├── apps/
│   ├── web/                    # Next.js 14 Frontend (Port 3000)
│   └── api/                    # Express.js Backend (Port 4000)
├── packages/
│   ├── database/               # Prisma ORM + PostgreSQL Schema
│   ├── shared/                 # Gemeinsame TypeScript-Typen & Utilities
│   └── config/                 # Gemeinsame ESLint & TypeScript-Konfiguration
├── infrastructure/
│   ├── docker/                 # Dockerfiles & Nginx-Konfiguration
│   ├── docker-compose.yml      # Produktions-Setup
│   ├── docker-compose.dev.yml  # Entwicklungs-Setup
│   └── docker-compose.test.yml # Test-Setup
├── patches/                    # Nummerierte Update-Patches
├── scripts/                    # Shell-Skripte für Installation & Wartung
├── docs/                       # Vollständige Dokumentation
└── logs/                       # MASTER_LOG.md & Anwendungs-Logs
```

## Tech-Stack

| Bereich        | Technologie                          |
|----------------|--------------------------------------|
| Frontend       | Next.js 14, TypeScript, Material UI  |
| Backend        | Node.js, Express.js, TypeScript      |
| Datenbank      | PostgreSQL 16, Prisma ORM            |
| Monorepo       | pnpm Workspaces, Turborepo           |
| Deployment     | Docker, Docker Compose, Nginx        |
| Testing        | Jest, Playwright (E2E)               |
| Logging        | Winston                              |

## Patch-System

Updates werden als nummerierte Patch-Dateien ausgeliefert.
Details: [docs/PATCHES.md](docs/PATCHES.md)

```bash
# System auf neuesten Stand bringen
./scripts/apply-patches.sh
```

## Dokumentation

| Dokument                             | Beschreibung                              |
|--------------------------------------|-------------------------------------------|
| [docs/SETUP.md](docs/SETUP.md)       | Detaillierte Installationsanleitung       |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Systemarchitektur & Diagramme     |
| [docs/API.md](docs/API.md)           | REST API Referenz                         |
| [docs/PATCHES.md](docs/PATCHES.md)   | Patch-System Dokumentation               |
| [logs/MASTER_LOG.md](logs/MASTER_LOG.md) | Entwicklungs-Entscheidungslog         |

## Für Entwickler

Bitte zuerst [docs/SETUP.md](docs/SETUP.md) lesen — dort steht alles was benötigt wird um
das Projekt lokal zum Laufen zu bringen.

## Lizenz

Proprietär — Alle Rechte vorbehalten.
