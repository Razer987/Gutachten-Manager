# =============================================================================
# api.Dockerfile — Express.js Backend
# =============================================================================
# Multi-Stage-Build für optimale Image-Größe:
#   Stage 1 (builder): Installiert Abhängigkeiten und kompiliert TypeScript
#   Stage 2 (runner):  Nur Production-Dependencies und kompilierter Code
#
# Verwendung:
#   docker build -f infrastructure/docker/api.Dockerfile -t gutachten-api .
# =============================================================================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

# Metadaten
LABEL maintainer="Gutachten-Manager"
LABEL description="Express.js API Builder"

WORKDIR /app

# pnpm installieren
RUN corepack enable && corepack prepare pnpm@latest --activate

# Workspace-Konfiguration kopieren (für pnpm workspaces)
COPY package.json pnpm-workspace.yaml turbo.json ./

# Package-JSONs aller Pakete kopieren (für pnpm install caching)
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Abhängigkeiten installieren (cached wenn keine package.json sich ändert)
RUN pnpm install --frozen-lockfile

# Quellcode kopieren
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Prisma-Client generieren
RUN pnpm --filter @gutachten/database db:generate

# TypeScript kompilieren
RUN pnpm --filter api build


# ---- Stage 2: Runner (Production) ----
FROM node:20-alpine AS runner

WORKDIR /app

# Nur Production-Abhängigkeiten
RUN corepack enable && corepack prepare pnpm@latest --activate

# Nicht-root Benutzer für Sicherheit
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 api

# Kompilierten Code und Abhängigkeiten aus Builder kopieren
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/node_modules ./packages/database/node_modules

# Uploads-Verzeichnis erstellen und Berechtigungen setzen
RUN mkdir -p /app/uploads /app/logs \
  && chown -R api:nodejs /app/uploads /app/logs

# Zu nicht-root Benutzer wechseln
USER api

# Gesundheitscheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

# Port freigeben
EXPOSE 4000

# Umgebungsvariablen
ENV NODE_ENV=production
ENV PORT=4000

# Anwendung starten
CMD ["node", "dist/server.js"]
