#!/usr/bin/env bash
# =============================================================================
# install.sh — Gutachten-Manager Erstinstallation
# =============================================================================
# Führt die vollständige Erstinstallation auf einem neuen System durch.
#
# Verwendung:
#   ./scripts/install.sh
#
# Was dieses Skript macht:
#   1. Systemvoraussetzungen prüfen (Docker, Node.js, pnpm, Git)
#   2. .env Datei aus .env.example erstellen (falls nicht vorhanden)
#   3. pnpm Abhängigkeiten installieren
#   4. Docker-Container starten
#   5. Datenbankmigrationen ausführen
#   6. Patches anwenden
#   7. Erfolgs-Meldung ausgeben
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# -----------------------------------------------------------------------------
# Hilfsfunktionen
# -----------------------------------------------------------------------------

print_header() {
  clear
  echo ""
  echo -e "${BLUE}${BOLD}"
  echo "  ╔════════════════════════════════════════════════════════╗"
  echo "  ║           Gutachten-Manager — Installation             ║"
  echo "  ╚════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  echo ""
}

print_step() {
  local step="$1"
  local total="$2"
  local text="$3"
  echo -e "${BLUE}${BOLD}[Schritt $step/$total]${NC} $text"
}

print_success() { echo -e "  ${GREEN}✓${NC} $1"; }
print_error()   { echo -e "  ${RED}✗${NC} $1" >&2; }
print_info()    { echo -e "  ${BLUE}→${NC} $1"; }
print_warning() { echo -e "  ${YELLOW}⚠${NC} $1"; }

check_command() {
  local cmd="$1"
  local min_version="$2"
  local install_hint="$3"

  if ! command -v "$cmd" &>/dev/null; then
    print_error "$cmd ist nicht installiert."
    echo "    → Installation: $install_hint"
    return 1
  fi
  print_success "$cmd gefunden"
  return 0
}

# -----------------------------------------------------------------------------
# Hauptlogik
# -----------------------------------------------------------------------------

main() {
  print_header
  cd "$ROOT_DIR"

  # -----------------------------------------------
  # Schritt 1: Systemvoraussetzungen prüfen
  # -----------------------------------------------
  print_step 1 6 "Systemvoraussetzungen prüfen"
  echo ""

  local checks_ok=true

  check_command "docker" "24.0" "https://docs.docker.com/get-docker/" || checks_ok=false
  check_command "node" "20.0" "https://nodejs.org/" || checks_ok=false
  check_command "pnpm" "9.0" "npm install -g pnpm" || checks_ok=false
  check_command "git" "2.40" "https://git-scm.com/downloads" || checks_ok=false

  # Docker Compose prüfen (als Plugin oder standalone)
  if docker compose version &>/dev/null 2>&1; then
    print_success "docker compose (Plugin) gefunden"
  elif command -v docker-compose &>/dev/null; then
    print_warning "docker-compose (standalone) gefunden — empfohlen: Docker Compose Plugin"
  else
    print_error "Docker Compose nicht gefunden."
    echo "    → Installation: https://docs.docker.com/compose/install/"
    checks_ok=false
  fi

  if [[ "$checks_ok" == "false" ]]; then
    echo ""
    print_error "Systemvoraussetzungen nicht erfüllt. Bitte fehlende Software installieren."
    exit 1
  fi

  echo ""
  print_success "Alle Systemvoraussetzungen erfüllt."
  echo ""

  # -----------------------------------------------
  # Schritt 2: .env Datei einrichten
  # -----------------------------------------------
  print_step 2 6 "Umgebungsvariablen einrichten"
  echo ""

  if [[ -f "$ROOT_DIR/.env" ]]; then
    print_success ".env Datei existiert bereits"
    print_info "Falls Probleme auftreten: .env mit .env.example vergleichen"
  else
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    print_success ".env aus .env.example erstellt"
    echo ""
    print_warning "WICHTIG: Bitte jetzt die .env Datei bearbeiten!"
    echo ""
    echo "    Mindestens diese Werte müssen gesetzt werden:"
    echo "      DATABASE_USER     → Datenbankbenutzername"
    echo "      DATABASE_PASSWORD → Sicheres Passwort (mind. 16 Zeichen)"
    echo ""
    echo "    Bearbeiten mit:"
    echo "      nano .env"
    echo "      code .env   (VS Code)"
    echo ""

    read -r -p "  Drücke ENTER wenn .env konfiguriert ist..." _
  fi

  echo ""

  # -----------------------------------------------
  # Schritt 3: Abhängigkeiten installieren
  # -----------------------------------------------
  print_step 3 6 "Node.js Abhängigkeiten installieren"
  echo ""

  pnpm install --frozen-lockfile 2>&1 | tail -5 || {
    print_warning "Lockfile-Problem — versuche ohne --frozen-lockfile..."
    pnpm install 2>&1 | tail -5
  }

  print_success "Abhängigkeiten installiert"
  echo ""

  # -----------------------------------------------
  # Schritt 4: Docker-Container starten
  # -----------------------------------------------
  print_step 4 6 "Docker-Container starten"
  echo ""

  print_info "Starte Datenbank-Container..."
  docker compose up -d db

  print_info "Warte auf Datenbankbereitschaft (max. 30 Sekunden)..."
  local retries=0
  until docker compose exec db pg_isready -U postgres &>/dev/null 2>&1 || [[ $retries -ge 15 ]]; do
    sleep 2
    ((retries++))
    echo -n "."
  done
  echo ""

  if [[ $retries -ge 15 ]]; then
    print_error "Datenbank nicht erreichbar nach 30 Sekunden."
    echo "    → Logs prüfen: docker compose logs db"
    exit 1
  fi

  print_success "Datenbank ist bereit"
  echo ""

  # -----------------------------------------------
  # Schritt 5: Datenbankmigrationen
  # -----------------------------------------------
  print_step 5 6 "Datenbankmigrationen ausführen"
  echo ""

  pnpm db:migrate

  print_success "Datenbankmigrationen abgeschlossen"
  echo ""

  # -----------------------------------------------
  # Schritt 6: Alle Container starten & Patches
  # -----------------------------------------------
  print_step 6 6 "System starten & Patches anwenden"
  echo ""

  print_info "Starte alle Container..."
  docker compose up -d

  print_info "Patches anwenden..."
  bash "$SCRIPT_DIR/apply-patches.sh"

  # -----------------------------------------------
  # Abschluss
  # -----------------------------------------------
  echo ""
  echo -e "${GREEN}${BOLD}"
  echo "  ╔════════════════════════════════════════════════════════╗"
  echo "  ║       Installation erfolgreich abgeschlossen!         ║"
  echo "  ╚════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  echo ""
  echo "  Die Anwendung ist erreichbar unter:"
  echo ""
  echo -e "    ${BOLD}Frontend:${NC}    http://localhost:3000"
  echo -e "    ${BOLD}API:${NC}         http://localhost:4000/api/v1/"
  echo -e "    ${BOLD}Health-Check:${NC} http://localhost:4000/api/v1/health"
  echo ""
  echo "  Nützliche Befehle:"
  echo "    docker compose ps           → Status aller Container"
  echo "    docker compose logs -f      → Live-Logs"
  echo "    docker compose down         → System stoppen"
  echo "    ./scripts/update.sh         → System updaten"
  echo ""
}

main "$@"
