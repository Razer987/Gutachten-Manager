#!/usr/bin/env bash
# =============================================================================
# update.sh — Gutachten-Manager System-Update
# =============================================================================
# Bringt eine bestehende Installation auf den neuesten Stand.
#
# Verwendung:
#   ./scripts/update.sh
#
# Was dieses Skript macht:
#   1. Aktuelle Version anzeigen
#   2. Neueste Version aus Git holen (git pull)
#   3. Node.js Abhängigkeiten aktualisieren
#   4. Neue Patches anwenden
#   5. Datenbankmigrationen ausführen
#   6. Container neu starten
#   7. Neue Version anzeigen
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

print_step()    { echo -e "${BLUE}${BOLD}→${NC} $1"; }
print_success() { echo -e "  ${GREEN}✓${NC} $1"; }
print_error()   { echo -e "  ${RED}✗${NC} $1" >&2; }
print_info()    { echo -e "  ${BLUE}·${NC} $1"; }

get_version() {
  node -p "require('./package.json').version" 2>/dev/null || echo "unbekannt"
}

main() {
  cd "$ROOT_DIR"

  echo ""
  echo -e "${BLUE}${BOLD}Gutachten-Manager — System-Update${NC}"
  echo -e "${BLUE}══════════════════════════════════${NC}"
  echo ""

  local version_before
  version_before=$(get_version)
  print_info "Aktuelle Version: ${BOLD}$version_before${NC}"
  echo ""

  # Schritt 1: Git Pull
  print_step "Neueste Version aus Git holen..."
  git pull origin "$(git branch --show-current)" 2>&1
  print_success "Git-Update abgeschlossen"
  echo ""

  # Schritt 2: Abhängigkeiten
  print_step "Node.js Abhängigkeiten aktualisieren..."
  pnpm install --frozen-lockfile 2>&1 | tail -3
  print_success "Abhängigkeiten aktualisiert"
  echo ""

  # Schritt 3: Patches anwenden
  print_step "Patches anwenden..."
  bash "$SCRIPT_DIR/apply-patches.sh"
  echo ""

  # Schritt 4: Datenbankmigrationen
  print_step "Datenbankmigrationen ausführen..."
  pnpm db:migrate
  print_success "Datenbankmigrationen abgeschlossen"
  echo ""

  # Schritt 5: Container neu starten
  print_step "Server neu starten..."
  docker compose restart api web
  print_success "Server neu gestartet"
  echo ""

  # Abschluss
  local version_after
  version_after=$(get_version)

  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║     Update erfolgreich!              ║${NC}"
  echo -e "${GREEN}${BOLD}╚══════════════════════════════════════╝${NC}"
  echo ""
  if [[ "$version_before" != "$version_after" ]]; then
    echo -e "  Version: ${YELLOW}$version_before${NC} → ${GREEN}${BOLD}$version_after${NC}"
  else
    echo -e "  Version: ${GREEN}${BOLD}$version_after${NC} (aktuell)"
  fi
  echo ""
}

main "$@"
