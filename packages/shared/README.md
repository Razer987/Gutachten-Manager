# packages/shared/ — Gemeinsame Typen & Utilities

Dieses Paket enthält **TypeScript-Typen, Konstanten und Hilfsfunktionen** die
sowohl vom Frontend (`apps/web`) als auch vom Backend (`apps/api`) genutzt werden.

## Was ist hier drin?

```
packages/shared/
├── src/
│   ├── types/                  # TypeScript-Interfaces & Types
│   │   ├── gutachten.types.ts  # Gutachten-Datentypen
│   │   ├── kunde.types.ts      # Kunden-Datentypen
│   │   ├── fahrzeug.types.ts   # Fahrzeug-Datentypen
│   │   ├── person.types.ts     # Personen & Zeugen-Datentypen
│   │   ├── api.types.ts        # API Response/Request-Typen
│   │   └── index.ts            # Re-Export aller Typen
│   ├── constants/              # Unveränderliche Konstanten
│   │   ├── status.constants.ts # Gutachten-Status-Werte
│   │   ├── routes.constants.ts # API-Route-Konstanten
│   │   └── index.ts
│   └── utils/                  # Hilfsfunktionen (Pure Functions)
│       ├── date.utils.ts       # Datumsformatierung (DE)
│       ├── currency.utils.ts   # Geldbeträge formatieren
│       ├── string.utils.ts     # Texthilfsfunktionen
│       └── index.ts
├── package.json
└── tsconfig.json
```

## Wichtige Regel

**Kein Framework-Code** in `packages/shared/`!
- Kein React, kein Express, kein Prisma
- Nur: TypeScript-Interfaces, reine Funktionen, Konstanten

So bleibt das Paket unabhängig und kann theoretisch auch in anderen Projekten
verwendet werden.
