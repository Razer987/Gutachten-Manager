#!/usr/bin/env bash
# =============================================================================
# test-all.sh — Vollständige Test-Suite
# =============================================================================
# Führt alle Tests aus: Unit, Integration, E2E.
# Wird nach jedem Patch ausgeführt um Qualität sicherzustellen.
#
# Verwendung:
#   ./scripts/test-all.sh [--skip-e2e] [--verbose]
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SKIP_E2E=false
VERBOSE=false

# Argumente parsen
for arg in "$@"; do
  case $arg in
    --skip-e2e) SKIP_E2E=true ;;
    --verbose)  VERBOSE=true ;;
  esac
done

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

run_step() {
  local name="$1"
  local cmd="$2"

  echo -e "${BLUE}→${NC} $name..."

  if $VERBOSE; then
    if eval "$cmd"; then
      echo -e "  ${GREEN}✓${NC} $name: BESTANDEN"
      ((TESTS_PASSED++))
    else
      echo -e "  ${RED}✗${NC} $name: FEHLGESCHLAGEN"
      ((TESTS_FAILED++))
      return 1
    fi
  else
    if eval "$cmd" &>/dev/null; then
      echo -e "  ${GREEN}✓${NC} $name: BESTANDEN"
      ((TESTS_PASSED++))
    else
      echo -e "  ${RED}✗${NC} $name: FEHLGESCHLAGEN"
      echo "    → Mit --verbose für Details erneut ausführen"
      ((TESTS_FAILED++))
      return 1
    fi
  fi
}

main() {
  cd "$ROOT_DIR"

  echo ""
  echo -e "${BLUE}${BOLD}Gutachten-Manager — Test-Suite${NC}"
  echo -e "${BLUE}══════════════════════════════════${NC}"
  echo ""

  local start_time
  start_time=$(date +%s)

  # 1. TypeScript-Prüfung
  run_step "TypeScript Typ-Prüfung (typecheck)" "pnpm typecheck"

  # 2. Lint
  run_step "Code-Qualität (ESLint)" "pnpm lint"

  # 3. Unit Tests
  run_step "Unit Tests (Jest)" "pnpm test"

  # 4. E2E Tests (optional)
  if [[ "$SKIP_E2E" == "false" ]]; then
    run_step "End-to-End Tests (Playwright)" "pnpm test:e2e"
  else
    echo -e "  ${YELLOW}⚠${NC} E2E Tests übersprungen (--skip-e2e)"
  fi

  # Ergebnis
  local end_time
  end_time=$(date +%s)
  local duration=$((end_time - start_time))

  echo ""
  echo -e "${BLUE}══════════════════════════════════${NC}"
  echo ""

  if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "  ${GREEN}${BOLD}Alle Tests bestanden! ✓${NC}"
    echo ""
    echo -e "  Bestanden: ${GREEN}${TESTS_PASSED}${NC} | Fehlgeschlagen: ${RED}${TESTS_FAILED}${NC} | Zeit: ${duration}s"
    echo ""
    exit 0
  else
    echo -e "  ${RED}${BOLD}Tests fehlgeschlagen! ✗${NC}"
    echo ""
    echo -e "  Bestanden: ${GREEN}${TESTS_PASSED}${NC} | Fehlgeschlagen: ${RED}${TESTS_FAILED}${NC} | Zeit: ${duration}s"
    echo ""
    exit 1
  fi
}

main "$@"
