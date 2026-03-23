# packages/config/ — Gemeinsame Konfigurationen

Dieses Paket stellt **gemeinsame Konfigurationsdateien** für ESLint und TypeScript
bereit. So gelten im gesamten Monorepo einheitliche Code-Qualitätsregeln.

## Was ist hier drin?

```
packages/config/
├── eslint-config/
│   ├── index.js                # Basis ESLint-Regeln (alle Apps)
│   ├── next.js                 # Next.js-spezifische Regeln
│   └── node.js                 # Node.js-spezifische Regeln
└── tsconfig/
    ├── base.json               # Basis TypeScript-Konfiguration
    ├── nextjs.json             # Next.js TypeScript-Konfiguration
    └── node.json               # Node.js TypeScript-Konfiguration
```

## Verwendung

In `apps/web/.eslintrc.js`:
```js
module.exports = {
  extends: ["@gutachten/config/eslint-config/next"]
}
```

In `apps/web/tsconfig.json`:
```json
{
  "extends": "@gutachten/config/tsconfig/nextjs.json"
}
```

## Code-Qualitätsregeln (Wichtigste)

- Keine `any`-Typen erlaubt (`@typescript-eslint/no-explicit-any`)
- Kein ungenutzter Code (`no-unused-vars`)
- Imports müssen sortiert sein (`import/order`)
- Konsistente Formatierung (Prettier-Integration)
- Maximale Zeilenlänge: 100 Zeichen
