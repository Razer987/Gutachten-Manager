# infrastructure/ — Docker & Deployment

Dieser Ordner enthält alle Dateien die für das **Deployment** (Inbetriebnahme)
des Gutachten-Managers benötigt werden.

## Was ist hier drin?

```
infrastructure/
├── docker/
│   ├── web.Dockerfile          # Docker-Image für das Frontend (Next.js)
│   ├── api.Dockerfile          # Docker-Image für das Backend (Express.js)
│   └── nginx/
│       └── nginx.conf          # Nginx Reverse-Proxy Konfiguration
├── docker-compose.yml          # Produktion: alle Services zusammen
├── docker-compose.dev.yml      # Entwicklung: mit Hot-Reload
└── docker-compose.test.yml     # Testing: isolierte Test-Umgebung
```

## Docker-Compose Umgebungen

### Produktion
```bash
docker compose up -d
```
Startet: Frontend, Backend, PostgreSQL, Nginx

### Entwicklung (mit Hot-Reload)
```bash
docker compose -f docker-compose.dev.yml up
```
Code-Änderungen werden sofort übernommen.

### Tests
```bash
docker compose -f docker-compose.test.yml up --exit-code-from test-runner
```

## Ports & Services

| Service    | Intern | Extern (Host) | Beschreibung                    |
|------------|--------|---------------|---------------------------------|
| nginx      | 80     | 80 / 443      | Reverse-Proxy (Einstiegspunkt)  |
| web        | 3000   | -             | Next.js Frontend                |
| api        | 4000   | -             | Express.js Backend              |
| db         | 5432   | 5432          | PostgreSQL Datenbank            |

**Hinweis:** Von außen ist nur Nginx erreichbar (Port 80/443).
Frontend und Backend sind nur intern erreichbar.

## Nginx als Reverse-Proxy

```
Anfrage von außen (Browser)
  │
  ▼
Nginx :80
  ├── / → web:3000 (Frontend)
  └── /api/ → api:4000 (Backend)
```
