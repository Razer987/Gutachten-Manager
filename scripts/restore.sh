#!/usr/bin/env bash
# =============================================================================
# restore.sh — Gutachten-Manager Backup wiederherstellen
# =============================================================================
# Stellt ein Backup wieder her.
#
# Verwendung:
#   ./scripts/restore.sh <backup-datei.tar.gz>
#
# WARNUNG: Alle aktuellen Daten werden überschrieben!
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a && source "$ROOT_DIR/.env" && set +a
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Backup-Datei als Parameter
BACKUP_FILE="${1:-}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo -e "${RED}Fehler: Keine Backup-Datei angegeben.${NC}"
  echo ""
  echo "Verwendung: ./scripts/restore.sh <backup-datei.tar.gz>"
  echo ""
  echo "Verfügbare Backups:"
  ls -lh "$ROOT_DIR/backups/"*.tar.gz 2>/dev/null || echo "  Keine Backups gefunden"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo -e "${RED}Fehler: Backup-Datei nicht gefunden: $BACKUP_FILE${NC}"
  exit 1
fi

TEMP_DIR=$(mktemp -d)
cleanup() { rm -rf "$TEMP_DIR"; }
trap cleanup EXIT

main() {
  cd "$ROOT_DIR"

  echo ""
  echo -e "${RED}${BOLD}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${RED}${BOLD}║   ACHTUNG: Datenwiederherstellung            ║${NC}"
  echo -e "${RED}${BOLD}╚══════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  Backup-Datei: ${BOLD}$BACKUP_FILE${NC}"
  echo ""
  echo -e "  ${YELLOW}WARNUNG: Alle aktuellen Daten werden überschrieben!${NC}"
  echo ""
  read -r -p "  Wiederherstellung wirklich durchführen? (ja/NEIN): " confirm

  if [[ "$confirm" != "ja" ]]; then
    echo ""
    echo "  Abgebrochen. Keine Änderungen vorgenommen."
    exit 0
  fi

  echo ""

  # 1. Archiv entpacken
  echo -e "${BLUE}→${NC} Archiv entpacken..."
  tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
  BACKUP_CONTENT=$(ls "$TEMP_DIR")
  echo -e "  ${GREEN}✓${NC} Entpackt: $BACKUP_CONTENT"

  # 2. Backup-Info anzeigen
  if [[ -f "$TEMP_DIR/$BACKUP_CONTENT/BACKUP_INFO.txt" ]]; then
    echo ""
    cat "$TEMP_DIR/$BACKUP_CONTENT/BACKUP_INFO.txt"
    echo ""
  fi

  # 3. Datenbank wiederherstellen
  echo -e "${BLUE}→${NC} Datenbank wiederherstellen..."
  docker compose exec -T db pg_restore \
    -U "${DATABASE_USER:-postgres}" \
    -d "${DATABASE_NAME:-gutachten_manager}" \
    --clean --if-exists \
    < "$TEMP_DIR/$BACKUP_CONTENT/database.dump"
  echo -e "  ${GREEN}✓${NC} Datenbank wiederhergestellt"

  # 4. Dateien wiederherstellen
  echo -e "${BLUE}→${NC} Hochgeladene Dateien wiederherstellen..."
  if [[ -d "$TEMP_DIR/$BACKUP_CONTENT/uploads" ]]; then
    rm -rf "$ROOT_DIR/apps/api/uploads"
    cp -r "$TEMP_DIR/$BACKUP_CONTENT/uploads" "$ROOT_DIR/apps/api/uploads"
    echo -e "  ${GREEN}✓${NC} Dateien wiederhergestellt"
  fi

  # Abschluss
  echo ""
  echo -e "${GREEN}${BOLD}✓ Wiederherstellung erfolgreich abgeschlossen${NC}"
  echo ""
}

main "$@"
