#!/bin/sh
# =============================================================================
# api-entrypoint.sh — Startet die API nach Datenbank-Migration
#
# Hinweis: Docker Compose startet diesen Container erst, nachdem der
# db-Dienst seinen Healthcheck (pg_isready) bestanden hat.
# Ein eigener Warte-Loop ist daher nicht noetig.
# =============================================================================

set -e

echo "[Entrypoint] ============================================================"
echo "[Entrypoint] Gutachten-Manager API wird gestartet"
echo "[Entrypoint] NODE_ENV=${NODE_ENV:-production}  PORT=${PORT:-4000}"
echo "[Entrypoint] ============================================================"

# -----------------------------------------------------------------------
# Schema anwenden
# prisma db push legt alle Tabellen an / passt sie an.
# --skip-generate  Prisma-Client wurde bereits im Build-Schritt erzeugt.
#
# Pfad: packages/database/node_modules/.bin/prisma
# Begruendung: pnpm hoistet Dev-Binaries von Sub-Packages nicht in das
# Root-node_modules/.bin/. Der explizite Pfad ist zuverlaessig.
# -----------------------------------------------------------------------
echo "[Entrypoint] Wende Datenbankschema an (prisma db push)..."

packages/database/node_modules/.bin/prisma db push \
  --schema packages/database/prisma/schema.prisma \
  --skip-generate

echo "[Entrypoint] Schema erfolgreich angewendet."

# -----------------------------------------------------------------------
# API-Server starten
# -----------------------------------------------------------------------
echo "[Entrypoint] Starte API-Server auf Port ${PORT:-4000}..."
exec node dist/server.js
