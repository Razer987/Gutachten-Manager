# apps/web/ — Next.js Frontend

Das Frontend des Gutachten-Managers. Gebaut mit **Next.js 14** (App Router),
**TypeScript** und **Material UI (MUI)**.

## Was ist hier drin?

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router (Seiten & Layouts)
│   │   ├── (dashboard)/        # Geschützte Seiten mit Layout
│   │   │   ├── gutachten/      # Gutachtenverwaltung
│   │   │   ├── kunden/         # Kundenverwaltung (CRM)
│   │   │   ├── kalender/       # Terminkalender
│   │   │   ├── dashboard/      # Übersichts-Dashboard
│   │   │   └── admin/          # Admin-Panel
│   │   ├── layout.tsx          # Root-Layout (MUI Theme Provider)
│   │   └── page.tsx            # Startseite (Redirect zum Dashboard)
│   ├── components/             # Wiederverwendbare UI-Komponenten
│   │   ├── common/             # Allgemein (Buttons, Inputs, Dialoge)
│   │   ├── gutachten/          # Gutachten-spezifische Komponenten
│   │   ├── kunden/             # Kunden-spezifische Komponenten
│   │   └── layout/             # Navigation, Sidebar, Header
│   ├── hooks/                  # Custom React Hooks
│   ├── lib/                    # API-Client, Hilfsfunktionen
│   │   ├── api/                # Typisierte API-Aufrufe (fetch-Wrapper)
│   │   └── utils/              # Datums-, Zahlen-, Text-Hilfsfunktionen
│   ├── store/                  # Globaler State (Zustand)
│   ├── styles/                 # Globale CSS & MUI Theme-Konfiguration
│   └── types/                  # Frontend-spezifische TypeScript-Typen
├── public/                     # Statische Dateien (Bilder, Icons, Fonts)
├── tests/
│   ├── unit/                   # Komponenten-Unit-Tests (Jest)
│   ├── integration/            # Seiten-Integrationstests
│   └── e2e/                    # End-to-End Tests (Playwright)
├── .env.local.example          # Umgebungsvariablen für lokale Entwicklung
├── next.config.ts              # Next.js Konfiguration
├── tsconfig.json               # TypeScript-Konfiguration
└── package.json                # Abhängigkeiten & Skripte
```

## Lokale Entwicklung

```bash
# Im Projektroot:
pnpm --filter web dev

# Oder direkt in diesem Ordner:
cd apps/web
pnpm dev
```

Dann: http://localhost:3000

## Tests ausführen

```bash
# Unit & Integration Tests
pnpm --filter web test

# E2E Tests (Playwright)
pnpm --filter web test:e2e
```

## Wichtige Technologien

| Technologie       | Verwendungszweck                           |
|-------------------|--------------------------------------------|
| Next.js 14        | React-Framework, App Router, SSR           |
| TypeScript        | Typsicherheit                              |
| Material UI (MUI) | UI-Komponenten, Theming, Dark/Light Mode   |
| TipTap            | Rich-Text-Editor für Gutachten-Texte       |
| Leaflet           | Interaktive Karten (Unfallort)             |
| Konva.js          | Foto-Editor & Unfallskizzen                |
| React Query       | Server State Management & Caching          |
| Zustand           | Client State Management                    |
| Recharts          | Charts & Diagramme im Dashboard            |
| Playwright        | E2E-Tests                                  |
