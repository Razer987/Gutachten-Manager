# =============================================================================
# api.Dockerfile — Express.js Backend
# =============================================================================
# Build-Kontext: Projektstamm (docker compose context: .)
#
# Architektur:
#   Stage 1 (builder): Installiert alle Abhaengigkeiten, erzeugt den Prisma-
#                      Client (Ausgabe liegt innerhalb von @gutachten/database/
#                      generated/client), kompiliert shared / database / api
#                      und erstellt via "pnpm deploy" ein eigenstaendiges
#                      Production-Bundle unter /deploy mit flacher node_modules-
#                      Struktur.
#
#   Stage 2 (runner):  Uebernimmt ausschliesslich /deploy. Keine pnpm-Symlinks,
#                      keine devDependencies. Der generierte Prisma-Client
#                      befindet sich unter
#                      node_modules/@gutachten/database/generated/client
#                      (via "files"-Feld der Workspace-package.json).
#
# Prisma-CLI zur Laufzeit:
#   "prisma" ist direkte dependency von apps/api -> pnpm deploy legt die CLI
#   nach /deploy/node_modules/.bin/prisma und macht sie fuer den Entrypoint
#   (prisma db push) verfuegbar.
# =============================================================================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# CA-Zertifikat fuer SSL-Inspection-Proxy einbinden (Sandbox-Umgebung).
# NODE_EXTRA_CA_CERTS wird benoetigt damit Node.js/corepack/npm dem Proxy-Zertifikat vertrauen.
COPY infrastructure/docker/anthropic-sandbox-ca.crt /usr/local/share/ca-certificates/anthropic-sandbox-ca.crt
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/anthropic-sandbox-ca.crt

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Monorepo-Manifeste
COPY package.json pnpm-workspace.yaml turbo.json ./

# Workspace-Pakete
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Vollinstallation inkl. devDependencies (Builds, Prisma-CLI, TypeScript).
# Erzeugt gleichzeitig die pnpm-lock.yaml fuer pnpm deploy.
RUN pnpm install --no-frozen-lockfile

# Build-Reihenfolge: Prisma-Client -> shared -> database -> api
# db:generate schreibt in packages/database/generated/client (siehe schema.prisma).
RUN pnpm --filter @gutachten/database db:generate \
 && pnpm --filter @gutachten/shared build \
 && pnpm --filter @gutachten/database build \
 && pnpm --filter api build

# Eigenstaendiges Production-Deployment erzeugen.
# - Workspace-Pakete werden mit ihrem "files"-Inhalt als echte Ordner unter
#   /deploy/node_modules/@gutachten/* kopiert.
# - @gutachten/database/generated/client (der Prisma-Client) wandert mit,
#   weil "generated" in der package.json unter "files" steht.
# - Alle prod-Dependencies (inkl. prisma CLI und @prisma/client) werden flach
#   unter /deploy/node_modules installiert — inklusive /deploy/node_modules/.bin.
RUN pnpm --filter api deploy --prod /deploy


# ---- Stage 2: Runner (Production) ----
FROM node:20-alpine AS runner

WORKDIR /app

# CA-Zertifikat einbinden damit apk add funktioniert
COPY infrastructure/docker/anthropic-sandbox-ca.crt /usr/local/share/ca-certificates/anthropic-sandbox-ca.crt
RUN cat /usr/local/share/ca-certificates/anthropic-sandbox-ca.crt >> /etc/ssl/certs/ca-certificates.crt

# postgresql-client fuer pg_dump (Backup-Service)
RUN apk add --no-cache postgresql-client

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 api

# Autarkes Deployment uebernehmen.
COPY --from=builder /deploy/package.json    ./package.json
COPY --from=builder /deploy/dist            ./dist
COPY --from=builder /deploy/node_modules    ./node_modules

# Laufzeit-Verzeichnisse (Uploads, Logs, Backups) und Rechte
RUN mkdir -p /app/uploads /app/logs /app/backups \
 && chown -R api:nodejs /app

COPY infrastructure/docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER api

EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
