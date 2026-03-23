#!/usr/bin/env bash
# =============================================================================
# apply-patches.sh — Gutachten-Manager Patch-System
# =============================================================================
# Wendet alle ausstehenden Patches auf das aktuelle System an.
#
# Verwendung:
#   ./scripts/apply-patches.sh
#
# Funktionsweise:
#   1. Liest patches/applied.log um zu wissen welche Patches schon angewendet wurden
#   2. Geht alle .patch Dateien in patches/ durch (numerisch sortiert)
#   3. Überspringt bereits angewendete Patches
#   4. Wendet neue Patches mit 'git apply' an
#   5. Trägt erfolgreiche Patches in applied.log ein
#
# Fehlerverhalten:
#   - Bei Fehler: Sofortiger Abbruch (set -e)
#   - Fehlgeschlagene Patches werden NICHT in applied.log eingetragen
#   - Wiederholter Aufruf ist sicher (idempotent)
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Konfiguration
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PATCHES_DIR="$ROOT_DIR/patches"
APPLIED_LOG="$PATCHES_DIR/applied.log"

# Farben für Terminal-Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color (Reset)

# -----------------------------------------------------------------------------
# Hilfsfunktionen
# -----------------------------------------------------------------------------

print_header() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║     Gutachten-Manager — Patch-System         ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
  echo ""
}

print_success() {
  echo -e "  ${GREEN}✓${NC} $1"
}

print_info() {
  echo -e "  ${BLUE}→${NC} $1"
}

print_warning() {
  echo -e "  ${YELLOW}⚠${NC} $1"
}

print_error() {
  echo -e "  ${RED}✗${NC} $1" >&2
}

# Prüft ob ein Patch bereits angewendet wurde
is_patch_applied() {
  local patch_name="$1"
  if [[ -f "$APPLIED_LOG" ]]; then
    grep -q "^${patch_name} " "$APPLIED_LOG" 2>/dev/null && return 0
  fi
  return 1
}

# Markiert einen Patch als angewendet
mark_patch_applied() {
  local patch_name="$1"
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  echo "${patch_name} ${timestamp}" >> "$APPLIED_LOG"
}

# -----------------------------------------------------------------------------
# Hauptlogik
# -----------------------------------------------------------------------------

main() {
  print_header

  # Sicherstellen dass wir im Root-Verzeichnis sind
  cd "$ROOT_DIR"

  # Patches-Verzeichnis prüfen
  if [[ ! -d "$PATCHES_DIR" ]]; then
    print_error "patches/ Verzeichnis nicht gefunden: $PATCHES_DIR"
    exit 1
  fi

  # Applied-Log anlegen falls nicht vorhanden
  touch "$APPLIED_LOG"

  # Alle .patch Dateien numerisch sortiert einlesen
  mapfile -t patch_files < <(find "$PATCHES_DIR" -maxdepth 1 -name "*.patch" | sort -V)

  if [[ ${#patch_files[@]} -eq 0 ]]; then
    print_warning "Keine Patch-Dateien gefunden in $PATCHES_DIR"
    echo ""
    echo "  Das System ist aktuell — keine Patches vorhanden."
    echo ""
    exit 0
  fi

  local applied_count=0
  local skipped_count=0
  local failed_count=0

  for patch_file in "${patch_files[@]}"; do
    # Patch-Name ohne Pfad und ohne .patch Erweiterung
    patch_name=$(basename "$patch_file" .patch)

    if is_patch_applied "$patch_name"; then
      print_success "${patch_name}: bereits angewendet (übersprungen)"
      ((skipped_count++))
    else
      print_info "${patch_name}: wird angewendet..."

      # Patch anwenden
      if git apply --whitespace=nowarn "$patch_file" 2>&1; then
        mark_patch_applied "$patch_name"
        print_success "${patch_name}: erfolgreich angewendet"
        ((applied_count++))
      else
        print_error "${patch_name}: FEHLER beim Anwenden!"
        ((failed_count++))
        echo ""
        echo -e "  ${RED}Patch-Anwendung fehlgeschlagen.${NC}"
        echo ""
        echo "  Mögliche Ursachen:"
        echo "    • Lokale Änderungen an versionierten Dateien"
        echo "    • Patches wurden nicht in der richtigen Reihenfolge angewendet"
        echo ""
        echo "  Lösungsversuch:"
        echo "    git stash"
        echo "    ./scripts/apply-patches.sh"
        echo "    git stash pop"
        echo ""
        exit 1
      fi
    fi
  done

  # Zusammenfassung
  echo ""
  echo -e "${BLUE}══════════════════════════════════════════════${NC}"

  if [[ $applied_count -gt 0 ]]; then
    echo -e "  ${GREEN}✓ $applied_count neue Patch(es) angewendet${NC}"
  fi

  if [[ $skipped_count -gt 0 ]]; then
    echo -e "  ${GREEN}✓ $skipped_count Patch(es) bereits angewendet (übersprungen)${NC}"
  fi

  echo ""
  echo -e "  ${GREEN}System ist aktuell.${NC}"
  echo ""
}

main "$@"
