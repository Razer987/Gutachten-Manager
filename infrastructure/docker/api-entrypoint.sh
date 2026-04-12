#!/bin/sh
# =============================================================================
# api-entrypoint.sh — Startet die API nach Datenbank-Migration
# =============================================================================

set -e

echo "[Entrypoint] ============================================================"
echo "[Entrypoint] Gutachten-Manager API wird gestartet..."
echo "[Entrypoint] NODE_ENV=${NODE_ENV:-production}"
echo "[Entrypoint] ============================================================"

# -----------------------------------------------------------------------
# DEBUG: Umgebungsinfos
# -----------------------------------------------------------------------
echo "[DEBUG] Shell-Binary   : $(readlink /proc/$$/exe 2>/dev/null || echo 'n/a')"
echo "[DEBUG] sh --version   : $(sh --version 2>&1 | head -1 || echo 'n/a')"
echo "[DEBUG] Arbeitsverz.   : $(pwd)"
echo "[DEBUG] Node           : $(node --version 2>&1 || echo 'n/a')"
echo "[DEBUG] DATABASE_URL   : $(echo "${DATABASE_URL:-NICHT_GESETZT}" | cut -c1-60)..."
echo "[DEBUG] Prisma-Binary  : $(ls -la node_modules/.bin/prisma 2>&1 || echo 'NICHT GEFUNDEN')"
echo "[DEBUG] Schema-Pfad    : $(ls -la packages/database/prisma/schema.prisma 2>&1 || echo 'NICHT GEFUNDEN')"

# -----------------------------------------------------------------------
# Schritt 1: Warten bis Datenbank erreichbar ist
# -----------------------------------------------------------------------
echo "[Entrypoint] Warte auf Datenbank..."

RETRIES=30
echo "[DEBUG] RETRIES=$RETRIES"
echo "[DEBUG] Test-Befehl: printf 'SELECT 1;' | node_modules/.bin/prisma db execute --stdin --schema packages/database/prisma/schema.prisma"

until printf 'SELECT 1;' | node_modules/.bin/prisma db execute \
  --stdin \
  --schema packages/database/prisma/schema.prisma \
  > /tmp/prisma-check.log 2>&1
do
  EXIT_CODE=$?
  RETRIES=$((RETRIES - 1))
  echo "[DEBUG] Versuch fehlgeschlagen. Exit-Code=$EXIT_CODE Verbleibend=$RETRIES"
  echo "[DEBUG] Prisma-Output: $(cat /tmp/prisma-check.log 2>/dev/null | head -5)"
  if [ "$RETRIES" -le 0 ]; then
    echo "[Entrypoint] FEHLER: Datenbank nach 30 Versuchen nicht erreichbar."
    echo "[DEBUG] Letzter Prisma-Output:"
    cat /tmp/prisma-check.log 2>/dev/null || echo "(kein Output)"
    echo "[Entrypoint] DATABASE_URL beginnt mit: $(echo "$DATABASE_URL" | cut -c1-40)..."
    exit 1
  fi
  echo "[Entrypoint] DB noch nicht bereit... (noch ${RETRIES} Versuche, warte 3s)"
  sleep 3
done

echo "[DEBUG] DB-Check erfolgreich. Prisma-Output: $(cat /tmp/prisma-check.log 2>/dev/null)"
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
