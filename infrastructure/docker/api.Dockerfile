# =============================================================================
# api.Dockerfile — Express.js Backend
# =============================================================================
# Build-Kontext: Projektstamm (docker compose context: .)
#
# Stage 1 (builder): Installiert alle Abhaengigkeiten, kompiliert TypeScript
# Stage 2 (runner):  Minimales Production-Image
# =============================================================================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

LABEL description="Gutachten-Manager API Builder"

WORKDIR /app

# pnpm aktivieren (via corepack, in Node 20 enthalten)
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Workspace-Root-Konfiguration zuerst kopieren (fuer pnpm install Cache)
COPY package.json pnpm-workspace.yaml turbo.json ./

# Package.json aller Workspace-Pakete kopieren (Cache-Layer)
COPY packages/config/package.json   ./packages/config/
COPY packages/shared/package.json   ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json          ./apps/api/

# Abhaengigkeiten installieren
# --no-frozen-lockfile: Kein pnpm-lock.yaml im Repo erforderlich
RUN pnpm install --no-frozen-lockfile

# Quellcode kopieren
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# 1. Prisma-Client generieren (erzeugt node_modules/.prisma/client)
RUN pnpm --filter @gutachten/database db:generate

# 2. Shared-Package kompilieren (wird von der API importiert)
RUN pnpm --filter @gutachten/shared build

# 3. Database-Package kompilieren (wird von der API importiert)
RUN pnpm --filter @gutachten/database build

# 4. API kompilieren
RUN pnpm --filter api build


# ---- Stage 2: Runner (Production) ----
FROM node:20-alpine AS runner

WORKDIR /app

# Nicht-Root-Benutzer fuer Sicherheit
RUN addgroup --system --gid 1001 nodejs \
  && adduser  --system --uid 1001 api

# -----------------------------------------------------------------------
# Compiled API
# -----------------------------------------------------------------------
COPY --from=builder /app/apps/api/dist ./dist

# -----------------------------------------------------------------------
# node_modules (enthaelt alle externen Pakete + pnpm-Symlinks + .prisma)
# -----------------------------------------------------------------------
COPY --from=builder /app/node_modules ./node_modules

# -----------------------------------------------------------------------
# Workspace-Pakete (kompiliert): Symlinks in node_modules zeigen hierauf
# node_modules/@gutachten/database -> ../../packages/database
# node_modules/@gutachten/shared   -> ../../packages/shared
# -----------------------------------------------------------------------
COPY --from=builder /app/packages/database/dist        ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/shared/dist          ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json   ./packages/shared/package.json

# -----------------------------------------------------------------------
# Prisma-Schema (wird von prisma migrate deploy benoetigt)
# -----------------------------------------------------------------------
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# -----------------------------------------------------------------------
# Verzeichnisse erstellen und Rechte setzen
# -----------------------------------------------------------------------
RUN mkdir -p /app/uploads /app/logs /app/backups \
  && chown -R api:nodejs /app/uploads /app/logs /app/backups /app/dist

# Entrypoint-Script kopieren und ausfuehrbar machen (als root, vor USER-Wechsel)
COPY infrastructure/docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Zu nicht-root Benutzer wechseln
USER api

# Port und Umgebungsvariablen
EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

# Health-Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

# Entrypoint: Migration + Server-Start
ENTRYPOINT ["/entrypoint.sh"]
