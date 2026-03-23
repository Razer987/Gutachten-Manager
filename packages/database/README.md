# packages/database/ — Datenbankschema & Prisma ORM

Dieses Paket verwaltet das **gesamte Datenbankschema** des Gutachten-Managers.
Es enthält den Prisma-Client, alle Schemas und alle Datenbankmigrationen.

## Was ist hier drin?

```
packages/database/
├── prisma/
│   ├── schema.prisma           # Datenbankschema (Tabellen, Felder, Beziehungen)
│   └── migrations/             # Automatisch generierte Migrationsdateien
│       ├── 20260323_init/      # Initiale Migration
│       └── migration_lock.toml # Versions-Lock (nicht manuell bearbeiten!)
├── seeds/
│   ├── index.ts                # Haupt-Seed-Datei
│   └── data/                   # Testdaten (JSON-Dateien)
├── src/
│   └── index.ts                # Exportiert den Prisma-Client
├── package.json
└── tsconfig.json
```

## Datenbank-Befehle

```bash
# Prisma-Client neu generieren (nach Schema-Änderungen)
pnpm db:generate

# Migration erstellen und anwenden (Entwicklung)
pnpm db:migrate:dev

# Migrationen in Produktion anwenden
pnpm db:migrate

# Datenbank mit Testdaten befüllen
pnpm db:seed

# Prisma Studio (Browser-GUI für die Datenbank)
pnpm db:studio
```

## Wie funktionieren Migrationen?

1. Schema in `prisma/schema.prisma` ändern
2. `pnpm db:migrate:dev` ausführen — Prisma erstellt automatisch eine Migrationsdatei
3. Migrationsdatei wird in Git committet
4. In Produktion wird `pnpm db:migrate` beim Start ausgeführt

**Niemals** Migrationsdateien manuell bearbeiten!

## Multi-Tenancy (SaaS-Vorbereitung)

Das System ist für **Schema-per-Tenant** vorbereitet:
- `public` Schema: Systemdaten (Tenants, Feature-Flags)
- `tenant_<id>` Schema: Mandanten-Daten (Gutachten, Kunden, etc.)

Jedes Büro bekommt sein eigenes Schema und hat damit vollständige Datenisolation.
