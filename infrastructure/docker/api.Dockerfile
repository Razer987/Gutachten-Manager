# =============================================================================
# api.Dockerfile — Express.js Backend
# =============================================================================
# Build-Kontext: Projektstamm (docker compose context: .)
#
# Architektur:
#   Stage 1 (builder): Installiert alle Abhaengigkeiten, kompiliert die
#                      Workspace-Pakete (shared, database, api) und erzeugt
#                      via "pnpm deploy" ein eigenstaendiges Production-
#                      Bundle unter /deploy mit flacher node_modules-Struktur.
#
#   Stage 2 (runner):  Uebernimmt ausschliesslich /deploy. Keine pnpm-Symlinks,
#                      keine Workspace-Verweise, keine devDependencies.
#                      Workspace-Pakete liegen als echte Ordner unter
#                      node_modules/@gutachten/* und sind fuer Node.js direkt
#                      ueber require('@gutachten/database') aufloesbar.
# =============================================================================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Monorepo-Manifeste
COPY package.json pnpm-workspace.yaml turbo.json ./

# Workspace-Pakete
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Vollinstallation inkl. devDependencies (fuer Builds und Prisma generate).
# Erzeugt gleichzeitig die pnpm-lock.yaml, die pnpm deploy spaeter benoetigt.
RUN pnpm install --no-frozen-lockfile

# Build-Reihenfolge: Prisma-Client -> shared -> database -> api
RUN pnpm --filter @gutachten/database db:generate \
 && pnpm --filter @gutachten/shared build \
 && pnpm --filter @gutachten/database build \
 && pnpm --filter api build

# Eigenstaendiges Production-Deployment erzeugen.
# pnpm deploy kopiert die in "files" deklarierten Inhalte der Workspace-Pakete
# (@gutachten/database: dist + prisma, @gutachten/shared: dist) als echte
# Ordner in /deploy/node_modules/@gutachten/* und installiert alle prod-
# Dependencies flach. Das Ergebnis ist ein autarkes Artefakt ohne pnpm-Store.
RUN pnpm --filter api deploy --prod /deploy

# Prisma-Client in der flachen Deployment-Struktur neu generieren, damit
# die Runtime den Client ohne pnpm-Hoisting-Hilfen findet.
RUN cd /deploy \
 && node_modules/.bin/prisma generate \
      --schema node_modules/@gutachten/database/prisma/schema.prisma


# ---- Stage 2: Runner (Production) ----
FROM node:20-alpine AS runner

WORKDIR /app

# postgresql-client fuer pg_dump (Backup-Service)
RUN apk add --no-cache postgresql-client

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 api

# Autarkes Deployment uebernehmen — enthaelt package.json, dist/ und
# node_modules/ mit allen Runtime-Abhaengigkeiten sowie den Workspace-
# Paketen als echte Verzeichnisse.
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
