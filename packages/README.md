# packages/

Dieser Ordner enthält **geteilte Pakete** die von mehreren Apps im Monorepo
verwendet werden. So wird Code-Duplizierung vermieden.

## Enthaltene Pakete

| Ordner       | Paketname               | Beschreibung                                      |
|--------------|-------------------------|---------------------------------------------------|
| `database/`  | `@gutachten/database`   | Prisma ORM Schema, Migrationen, DB-Client         |
| `shared/`    | `@gutachten/shared`     | Gemeinsame TypeScript-Typen, Konstanten, Utils    |
| `config/`    | `@gutachten/config`     | ESLint- und TypeScript-Konfigurationen            |

## Wie werden diese Pakete verwendet?

In `apps/api/package.json`:
```json
{
  "dependencies": {
    "@gutachten/database": "workspace:*",
    "@gutachten/shared": "workspace:*"
  }
}
```

In `apps/web/package.json`:
```json
{
  "dependencies": {
    "@gutachten/shared": "workspace:*"
  }
}
```

Das `workspace:*` bedeutet: "Nimm die lokale Version aus diesem Monorepo".

## Wichtige Regel

**Niemals** App-spezifischen Code in `packages/` ablegen.
`packages/` enthält nur Code der von **mindestens zwei** Apps genutzt wird.
