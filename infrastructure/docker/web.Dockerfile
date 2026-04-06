# =============================================================================
# web.Dockerfile — Next.js Frontend
# =============================================================================
# Build-Kontext: Projektstamm (docker compose context: .)
#
# Stage 1 (builder): Next.js Build mit Standalone-Output
# Stage 2 (runner):  Minimales Production-Image
# =============================================================================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Workspace-Konfiguration
COPY package.json pnpm-workspace.yaml turbo.json ./
# packages/config vollstaendig kopieren (pnpm braucht index.js + tsconfig/* fuer workspace-Erkennung)
COPY packages/config/  ./packages/config/
COPY packages/shared/package.json  ./packages/shared/
COPY apps/web/package.json         ./apps/web/

# Abhaengigkeiten installieren (kein Lockfile erforderlich)
RUN pnpm install --no-frozen-lockfile

# Quellcode kopieren
COPY packages/config/  ./packages/config/
COPY packages/shared/  ./packages/shared/
COPY apps/web/         ./apps/web/

# Build-Argument fuer die API-URL (wird in das Bundle eingebaut)
ARG NEXT_PUBLIC_API_URL=http://localhost/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js Build (erzeugt .next/standalone durch output: 'standalone' in next.config)
RUN pnpm --filter web build


# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Statische Dateien
COPY --from=builder /app/apps/web/public ./public

# Next.js Standalone-Bundle (enthaelt alles was benoetigt wird)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node", "server.js"]
