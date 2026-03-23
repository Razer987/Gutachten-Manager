#!/usr/bin/env bash
# =============================================================================
# backup.sh — Gutachten-Manager Backup-Skript
# =============================================================================
# Erstellt ein vollständiges Backup der Anwendungsdaten.
#
# Verwendung:
#   ./scripts/backup.sh [--output <verzeichnis>]
#
# Was gesichert wird:
#   1. PostgreSQL-Datenbank (pg_dump)
#   2. Hochgeladene Dateien (uploads/)
#   3. Konfiguration (.env)
#
# Was NICHT gesichert wird:
#   - node_modules/ (kann mit 'pnpm install' wiederhergestellt werden)
#   - .next/ Build-Artefakte (können mit 'pnpm build' wiederhergestellt werden)
#   - Docker-Images (können neu gezogen werden)
#
# Ausgabe:
#   backups/backup-JJJJ-MM-TT-HH-MM-SS.tar.gz
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Konfiguration (aus .env laden falls vorhanden)
if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$ROOT_DIR/.env" && set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")
BACKUP_NAME="backup-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
TEMP_DIR=$(mktemp -d)

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step()    { echo -e "${BLUE}→${NC} $1"; }
print_success() { echo -e "  ${GREEN}✓${NC} $1"; }
print_error()   { echo -e "  ${RED}✗${NC} $1" >&2; }

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

main() {
  cd "$ROOT_DIR"

  echo ""
  echo -e "${BLUE}Gutachten-Manager — Backup erstellen${NC}"
  echo -e "${BLUE}════════════════════════════════════${NC}"
  echo ""
  echo "  Zeitstempel: $TIMESTAMP"
  echo "  Zielordner:  $BACKUP_DIR"
  echo ""

  # Backup-Verzeichnis erstellen
  mkdir -p "$BACKUP_DIR"
  mkdir -p "$TEMP_DIR/$BACKUP_NAME"

  # -----------------------------------------
  # 1. Datenbank sichern
  # -----------------------------------------
  print_step "Datenbank sichern (pg_dump)..."

  docker compose exec -T db pg_dump \
    -U "${DATABASE_USER:-postgres}" \
    -d "${DATABASE_NAME:-gutachten_manager}" \
    --format=custom \
    --compress=9 \
    > "$TEMP_DIR/$BACKUP_NAME/database.dump" 2>&1

  print_success "Datenbank gesichert ($(du -sh "$TEMP_DIR/$BACKUP_NAME/database.dump" | cut -f1))"

  # -----------------------------------------
  # 2. Hochgeladene Dateien sichern
  # -----------------------------------------
  print_step "Hochgeladene Dateien sichern..."

  local uploads_dir="$ROOT_DIR/apps/api/uploads"
  if [[ -d "$uploads_dir" ]]; then
    cp -r "$uploads_dir" "$TEMP_DIR/$BACKUP_NAME/uploads"
    print_success "Dateien gesichert ($(du -sh "$TEMP_DIR/$BACKUP_NAME/uploads" | cut -f1))"
  else
    mkdir -p "$TEMP_DIR/$BACKUP_NAME/uploads"
    echo -e "  ${YELLOW}⚠${NC} Kein uploads/ Verzeichnis gefunden (übersprungen)"
  fi

  # -----------------------------------------
  # 3. Konfiguration sichern
  # -----------------------------------------
  print_step "Konfiguration sichern..."

  if [[ -f "$ROOT_DIR/.env" ]]; then
    cp "$ROOT_DIR/.env" "$TEMP_DIR/$BACKUP_NAME/.env.backup"
    print_success "Konfiguration gesichert"
  else
    echo -e "  ${YELLOW}⚠${NC} Keine .env Datei gefunden (übersprungen)"
  fi

  # -----------------------------------------
  # 4. Backup-Metadaten schreiben
  # -----------------------------------------
  cat > "$TEMP_DIR/$BACKUP_NAME/BACKUP_INFO.txt" << EOF
Gutachten-Manager — Backup-Informationen
==========================================
Zeitstempel: $TIMESTAMP
Version:     $(node -p "require('./package.json').version" 2>/dev/null || echo 'unbekannt')
Git-Branch:  $(git branch --show-current 2>/dev/null || echo 'unbekannt')
Git-Commit:  $(git rev-parse --short HEAD 2>/dev/null || echo 'unbekannt')
Host:        $(hostname)

Wiederherstellung:
  ./scripts/restore.sh ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz
EOF

  # -----------------------------------------
  # 5. Archiv erstellen
  # -----------------------------------------
  print_step "Archiv komprimieren..."

  tar -czf "${BACKUP_PATH}.tar.gz" -C "$TEMP_DIR" "$BACKUP_NAME"

  local size
  size=$(du -sh "${BACKUP_PATH}.tar.gz" | cut -f1)
  print_success "Archiv erstellt: ${BACKUP_NAME}.tar.gz ($size)"

  # -----------------------------------------
  # 6. Alte Backups bereinigen
  # -----------------------------------------
  print_step "Alte Backups bereinigen (älter als ${BACKUP_RETENTION_DAYS} Tage)..."

  local deleted=0
  while IFS= read -r old_backup; do
    rm -f "$old_backup"
    ((deleted++))
  done < <(find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime +"$BACKUP_RETENTION_DAYS" 2>/dev/null)

  if [[ $deleted -gt 0 ]]; then
    print_success "$deleted alte Backup(s) gelöscht"
  else
    echo -e "  ${BLUE}·${NC} Keine alten Backups zu bereinigen"
  fi

  # Abschluss
  echo ""
  echo -e "${GREEN}✓ Backup erfolgreich erstellt${NC}"
  echo ""
  echo "  Backup-Datei: ${BACKUP_PATH}.tar.gz"
  echo "  Größe:        $size"
  echo ""
  echo "  Wiederherstellen mit:"
  echo "    ./scripts/restore.sh ${BACKUP_PATH}.tar.gz"
  echo ""
}

main "$@"
