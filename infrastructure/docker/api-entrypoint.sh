#!/bin/sh
# =============================================================================
# api-entrypoint.sh — Startet die API nach Datenbank-Migration
#
# Docker Compose startet diesen Container erst, nachdem der db-Dienst seinen
# Healthcheck (pg_isready) bestanden hat. pg_isready prueft jedoch nur ob
# PostgreSQL Verbindungen annimmt — nicht ob User und Datenbank vollstaendig
# initialisiert sind. Daher retryt dieses Script prisma db push solange bis
# es erfolgreich ist oder MAX_RETRIES erreicht ist.
#
# Fehler P1000 (Authentication failed):
#   Tritt auf wenn die Credentials in .env nicht mit den Credentials im
#   persistenten Volume uebereinstimmen (z. B. nach Passwort-Aenderung).
#   Loesung: docker compose down -v && docker compose up --build
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
# Schema anwenden mit Retry-Loop
#
# Hintergrund: pg_isready (DB-Healthcheck) genuegt nicht als Garant dafuer
# dass PostgreSQL User + Datenbank bereits vollstaendig angelegt hat.
# Retry mit exponentiellem Backoff ueberbrueckt dieses Zeitfenster.
#
# Fehlerbehandlung P1000:
#   PostgreSQL-Credentials im Volume stimmen nicht mit DATABASE_URL ueberein.
#   => docker compose down -v && docker compose up --build
#
# --skip-generate  Prisma-Client wurde bereits im Build-Schritt erzeugt.
# -----------------------------------------------------------------------------
SCHEMA_PATH="node_modules/@gutachten/database/prisma/schema.prisma"
MAX_RETRIES=8
RETRY_DELAY=3

echo "[Entrypoint] Wende Datenbankschema an (prisma db push)..."

i=1
while [ "$i" -le "$MAX_RETRIES" ]; do
  if node_modules/.bin/prisma db push \
      --schema "$SCHEMA_PATH" \
      --skip-generate \
      2>&1; then
    echo "[Entrypoint] Schema erfolgreich angewendet."
    break
  fi

  EXIT_CODE=$?
  echo "[Entrypoint] Versuch ${i}/${MAX_RETRIES} fehlgeschlagen (exit ${EXIT_CODE}). Warte ${RETRY_DELAY}s..."

  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo ""
    echo "[Entrypoint] FEHLER: Schema konnte nach ${MAX_RETRIES} Versuchen nicht angewendet werden."
    echo ""
    echo "[Entrypoint] Moegliche Ursachen:"
    echo "[Entrypoint]   P1000  Credentials in .env stimmen nicht mit dem PostgreSQL-Volume ueberein."
    echo "[Entrypoint]          Loesung: docker compose down -v && docker compose up --build"
    echo "[Entrypoint]   P1001  PostgreSQL ist nicht erreichbar (Netzwerkproblem)."
    echo "[Entrypoint]   P1003  Datenbank existiert nicht."
    echo ""
    exit 1
  fi

  sleep "$RETRY_DELAY"
  RETRY_DELAY=$((RETRY_DELAY * 2))
  i=$((i + 1))
done

# -----------------------------------------------------------------------------
# API-Server starten
# -----------------------------------------------------------------------------
echo "[Entrypoint] Starte API-Server auf Port ${PORT:-4000}..."
exec node dist/server.js
