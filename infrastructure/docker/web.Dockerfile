# =============================================================================
# web.Dockerfile — Next.js Frontend
# =============================================================================
# Build-Kontext: Projektstamm (docker compose context: .)
#
# Warum outputFileTracingRoot noetig ist (pnpm-Monorepo-Besonderheit):
#   Next.js verfolgt beim Standalone-Build Symlinks durch den pnpm-Virtual-
#   Store (.pnpm/). Dabei gelangen Pfade ausserhalb von apps/web/ in den
#   Trace. Ohne outputFileTracingRoot landet server.js deshalb in einem
#   Unterverzeichnis statt im Standalone-Stamm.
#
#   outputFileTracingRoot = Monorepo-Stamm (/app) erzwingt folgende Struktur:
#
#   .next/standalone/             (Ausgabe des Builders)
#     apps/web/
#       server.js                 ← Einstiegspunkt
#       .next/                    ← Server-seitige Artefakte
#       node_modules/             ← web-spezifische Deps
#     node_modules/               ← gehostete Deps aus Monorepo-Stamm
#
#   Nach COPY standalone → /app/:
#     /app/apps/web/server.js     → CMD: node apps/web/server.js
#     /app/apps/web/.next/        → Server-Artefakte (im standalone enthalten)
#     /app/node_modules/          → Gehostete Deps
#
#   Separat kopiert (nicht im standalone enthalten):
#     /app/apps/web/.next/static/ → statische Assets (CSS, JS-Chunks)
#     /app/apps/web/public/       → oeffentliche Dateien
# =============================================================================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Monorepo-Manifeste + Workspace-Quellen
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN pnpm install --no-frozen-lockfile

ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# @gutachten/shared zuerst kompilieren (stellt TypeScript-Typen fuer web bereit).
# next build laeuft anschliessend und erzeugt .next/standalone mit der oben
# beschriebenen Verzeichnisstruktur.
RUN pnpm --filter @gutachten/shared build \
 && pnpm --filter web build


# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone-Bundle uebernehmen.
# Ergibt /app/apps/web/server.js als Einstiegspunkt.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Statische Assets (CSS, JS-Chunks, Bilder) separat kopieren.
# server.js erwartet sie unter ${__dirname}/.next/static
# = /app/apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Oeffentliche Dateien (favicon, robots.txt etc.)
# server.js erwartet sie unter ${__dirname}/public
# = /app/apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget -qO /dev/null http://localhost:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
