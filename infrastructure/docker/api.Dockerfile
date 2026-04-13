# =============================================================================
# api.Dockerfile — Express.js Backend
# =============================================================================
# Build-Kontext: Projektstamm (docker compose context: .)

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Alle Quellen auf einmal kopieren (pnpm workspace:* braucht vollstaendige Pakete)
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Abhaengigkeiten installieren
RUN pnpm install --no-frozen-lockfile

# 1. Prisma-Client generieren
RUN pnpm --filter @gutachten/database db:generate

# 2. Shared-Package kompilieren
RUN pnpm --filter @gutachten/shared build

# 3. Database-Package kompilieren
RUN pnpm --filter @gutachten/database build

# 4. API kompilieren
RUN pnpm --filter api build


# ---- Stage 2: Runner (Production) ----
FROM node:20-alpine AS runner

WORKDIR /app

# postgresql-client für pg_dump (Backup-Service)
RUN apk add --no-cache postgresql-client

RUN addgroup --system --gid 1001 nodejs \
  && adduser  --system --uid 1001 api

# Compiled API
COPY --from=builder /app/apps/api/dist ./dist

# node_modules (enthaelt alle externen Pakete + pnpm-Symlinks + .prisma)
COPY --from=builder /app/node_modules ./node_modules

# Workspace-Pakete (kompiliert)
COPY --from=builder /app/packages/database/dist        ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/shared/dist          ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json   ./packages/shared/package.json

# Prisma-Schema fuer Migration
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Verzeichnisse und Rechte
RUN mkdir -p /app/uploads /app/logs /app/backups \
  && chown -R api:nodejs /app/uploads /app/logs /app/backups /app/dist

COPY infrastructure/docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER api

EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
