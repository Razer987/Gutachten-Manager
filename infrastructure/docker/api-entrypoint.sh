#!/bin/sh
# =============================================================================
# api-entrypoint.sh — Startet die API nach Datenbank-Migration
#
# Docker Compose startet diesen Container erst, nachdem der db-Dienst seinen
# Healthcheck (pg_isready) bestanden hat. Ein eigener Warte-Loop ist daher
# nicht noetig.
#
# Verzeichnisstruktur (durch pnpm deploy erzeugt):
#   /app/package.json                                  Manifest der API
#   /app/dist/server.js                                Kompilierte API
#   /app/node_modules/.bin/prisma                      Prisma-CLI
#   /app/node_modules/@gutachten/database/prisma/      Prisma-Schema
#   /app/node_modules/@gutachten/database/dist/        Kompilierter DB-Client
#   /app/node_modules/@gutachten/shared/dist/          Gemeinsame Typen
# =============================================================================

set -e

echo "[Entrypoint] ============================================================"
echo "[Entrypoint] Gutachten-Manager API wird gestartet"
echo "[Entrypoint] NODE_ENV=${NODE_ENV:-production}  PORT=${PORT:-4000}"
echo "[Entrypoint] ============================================================"

# -----------------------------------------------------------------------------
# Schema anwenden
# prisma db push legt alle Tabellen an bzw. passt sie an.
# --skip-generate  Prisma-Client wurde bereits im Build-Schritt erzeugt.
# -----------------------------------------------------------------------------
echo "[Entrypoint] Wende Datenbankschema an (prisma db push)..."

node_modules/.bin/prisma db push \
  --schema node_modules/@gutachten/database/prisma/schema.prisma \
  --skip-generate

echo "[Entrypoint] Schema erfolgreich angewendet."

# -----------------------------------------------------------------------------
# API-Server starten
# -----------------------------------------------------------------------------
echo "[Entrypoint] Starte API-Server auf Port ${PORT:-4000}..."
exec node dist/server.js
