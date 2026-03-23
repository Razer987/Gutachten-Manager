# apps/

Dieser Ordner enthält die **ausführbaren Anwendungen** des Gutachten-Managers.

## Enthaltene Apps

| Ordner | Beschreibung                          | Port |
|--------|---------------------------------------|------|
| `web/` | Next.js Frontend (Benutzeroberfläche) | 3000 |
| `api/` | Express.js Backend (REST API)         | 4000 |

## Wie hängt das zusammen?

```
Browser
  │  HTTP-Anfragen (Seiten, Assets)
  ▼
apps/web/   (Next.js)
  │  REST API Aufrufe an /api/v1/...
  ▼
apps/api/   (Express.js)
  │  Datenbankabfragen via Prisma
  ▼
PostgreSQL  (Datenbank)
```

## Lokale Entwicklung

```bash
# Beide Apps gleichzeitig starten (empfohlen)
pnpm dev

# Nur Frontend starten
pnpm --filter web dev

# Nur Backend starten
pnpm --filter api dev
```
