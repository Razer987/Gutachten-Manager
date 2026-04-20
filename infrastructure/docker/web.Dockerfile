# =============================================================================
# web.Dockerfile — Next.js Frontend
# =============================================================================
# Build-Kontext: Projektstamm (docker compose context: .)
#
# Standalone-Ausgabestruktur (ohne outputFileTracingRoot):
#   apps/web/.next/standalone/
#     server.js          ← Einstiegspunkt (direkt im Stamm)
#     .next/             ← Server-seitige Build-Artefakte
#     node_modules/      ← Runtime-Dependencies
#   apps/web/.next/static/   ← Statische Assets (separat kopieren)
#   apps/web/public/         ← Oeffentliche Dateien (separat kopieren)
#
# Im Runner:
#   WORKDIR /app
#   /app/server.js      → node server.js
#   /app/.next/static/  → statische Assets
#   /app/public/        → public files
# =============================================================================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Monorepo-Manifeste + alle Workspace-Quellen
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN pnpm install --no-frozen-lockfile

ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# @gutachten/shared muss zuerst kompiliert werden, damit TypeScript-Typen
# beim Next.js-Build aufgeloest werden koennen.
RUN pnpm --filter @gutachten/shared build \
 && pnpm --filter web build


# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone-Bundle: server.js liegt direkt im Stamm des Standalone-Ordners.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Statische Assets — muessen separat neben dem Standalone-Bundle liegen.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

# Oeffentliche Dateien (favicon, robots.txt, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget -qO /dev/null http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
