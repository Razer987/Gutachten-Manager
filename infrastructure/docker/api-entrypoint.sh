#!/bin/sh
# =============================================================================
# api-entrypoint.sh
#
# Ablauf:
#   1. Prisma db push   — Schema auf DB anwenden (idempotent)
#   2. node dist/server.js — API starten
#
# Vorbedingung (garantiert durch depends_on: condition: service_healthy):
#   PostgreSQL ist vollständig initialisiert und nimmt Verbindungen an.
#   User, Datenbank und Passwort stimmen mit DATABASE_URL überein.
#
# Fehler P1000 (Authentication failed):
#   Credentials in .env stimmen nicht mit dem PostgreSQL-Volume überein.
#   Lösung: docker compose down -v && docker compose up --build
# =============================================================================

set -e

echo "[api] NODE_ENV=${NODE_ENV}  PORT=${PORT}"
echo "[api] Applying database schema..."

node_modules/.bin/prisma db push \
  --schema node_modules/@gutachten/database/prisma/schema.prisma \
  --skip-generate

echo "[api] Schema applied. Starting server..."
exec node dist/server.js
