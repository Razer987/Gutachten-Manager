#!/bin/sh
# =============================================================================
# api-entrypoint.sh — Startet die API nach Datenbank-Migration
# =============================================================================

set -e

echo "[Entrypoint] Gutachten-Manager API wird gestartet..."
echo "[Entrypoint] NODE_ENV=${NODE_ENV:-production}"

# -----------------------------------------------------------------------
# Schritt 1: Warten bis Datenbank erreichbar ist
# -----------------------------------------------------------------------
echo "[Entrypoint] Warte auf Datenbank..."

RETRIES=30
until node_modules/.bin/prisma db execute \
  --stdin \
  --schema packages/database/prisma/schema.prisma \
  <<< "SELECT 1;" > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "[Entrypoint] FEHLER: Datenbank nach 30 Versuchen nicht erreichbar."
    echo "[Entrypoint] DATABASE_URL beginnt mit: $(echo $DATABASE_URL | cut -c1-40)..."
    exit 1
  fi
  echo "[Entrypoint] DB noch nicht bereit... (noch ${RETRIES} Versuche, warte 3s)"
  sleep 3
done

echo "[Entrypoint] Datenbank erreichbar."

# -----------------------------------------------------------------------
# Schritt 2: Schema anwenden (db push erstellt Tabellen ohne Migrationsdateien)
# -----------------------------------------------------------------------
echo "[Entrypoint] Wende Datenbankschema an (prisma db push)..."

node_modules/.bin/prisma db push \
  --schema packages/database/prisma/schema.prisma \
  --accept-data-loss

echo "[Entrypoint] Schema angewendet."

# -----------------------------------------------------------------------
# Schritt 3: API-Server starten
# -----------------------------------------------------------------------
echo "[Entrypoint] Starte API-Server auf Port ${PORT:-4000}..."
exec node dist/server.js
