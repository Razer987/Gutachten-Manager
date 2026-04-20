# =============================================================================
# web.Dockerfile — Next.js Frontend
# =============================================================================
# Build-Kontext: Projektstamm (docker compose context: .)
#
# Architektur:
#   Stage 1 (builder): Installiert alle Abhaengigkeiten, kompiliert das
#                      Workspace-Paket @gutachten/shared (wird als Typ-Import
#                      von web verwendet) und baut anschliessend die Next.js-
#                      Anwendung mit "output: standalone".
#
#   Stage 2 (runner):  Uebernimmt ausschliesslich das Standalone-Bundle.
#
# Standalone-Verzeichnisstruktur (durch outputFileTracingRoot = Monorepo-Stamm):
#   .next/standalone/
#     apps/web/server.js          ← Einstiegspunkt
#     apps/web/.next/             (server-seitige Build-Artefakte)
#     apps/web/node_modules/      (web-spezifische Runtime-Deps)
#     node_modules/               (gehostete Deps aus dem Monorepo-Stamm)
#   .next/static/                 ← separat kopieren
#   public/                       ← separat kopieren
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

# @gutachten/shared muss vor dem Next.js-Build kompiliert sein.
# Das Paket stellt TypeScript-Typen bereit, die apps/web/src importiert.
# Ohne dist/ wuerden die Typ-Deklarationen fehlen und der Build wuerde
# mit unklaren Fehlern abbrechen.
RUN pnpm --filter @gutachten/shared build \
 && pnpm --filter web build


# ---- Stage 2: Runner ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone-Bundle (enthaelt server.js + node_modules in Monorepo-Struktur).
# Durch outputFileTracingRoot liegt server.js unter apps/web/server.js.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Statische Assets (CSS, JS-Chunks, Bilder) — nicht im Standalone enthalten.
# Next.js-Server erwartet sie unter apps/web/.next/static (relativ zu WORKDIR).
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Oeffentliche Dateien (favicon, robots.txt etc.)
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node", "apps/web/server.js"]
