@echo off
chcp 65001 >nul 2>&1
title Gutachten-Manager — Wird gestartet...
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║          GUTACHTEN-MANAGER — STARTER                    ║
echo  ║          Version 2026.03.1                              ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: ─── Ins Projektverzeichnis wechseln (wo die .bat liegt) ───
cd /d "%~dp0"

:: ─── Schritt 1: Docker prüfen ───────────────────────────────
echo  [1/5] Pruefe Docker Desktop...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ╔══════════════════════════════════════════════════════════╗
    echo  ║  FEHLER: Docker Desktop ist nicht gestartet!            ║
    echo  ║                                                          ║
    echo  ║  Bitte:                                                  ║
    echo  ║  1. Docker Desktop installieren (falls nicht vorhanden)  ║
    echo  ║     https://www.docker.com/products/docker-desktop       ║
    echo  ║  2. Docker Desktop starten (Taskleiste unten rechts)     ║
    echo  ║  3. Warten bis der Wal-Symbol erscheint                  ║
    echo  ║  4. Diese Datei erneut doppelklicken                     ║
    echo  ╚══════════════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)
echo  [1/5] Docker Desktop laeuft. OK
echo.

:: ─── Schritt 2: .env prüfen ─────────────────────────────────
echo  [2/5] Pruefe Konfiguration...
if not exist ".env" (
    echo  Keine .env gefunden — erstelle Standardkonfiguration...
    copy ".env.example" ".env" >nul 2>&1
    echo  Bitte passen Sie das Passwort in der Datei .env an!
    echo  Oeffne .env...
    notepad ".env"
    timeout /t 3 >nul
)
echo  [2/5] Konfiguration vorhanden. OK
echo.

:: ─── Schritt 3: Alte Container stoppen (falls vorhanden) ────
echo  [3/5] Stoppe alte Container (falls vorhanden)...
docker compose -f infrastructure/docker-compose.yml down >nul 2>&1
echo  [3/5] Bereinigt. OK
echo.

:: ─── Schritt 4: Starten ─────────────────────────────────────
echo  [4/5] Starte Gutachten-Manager...
echo        (Erster Start dauert 5-15 Minuten — Images werden gebaut)
echo        (Folgestarts dauern ca. 30-60 Sekunden)
echo.
docker compose -f infrastructure/docker-compose.yml up --build -d
if %errorlevel% neq 0 (
    echo.
    echo  FEHLER beim Starten! Zeige Logs:
    docker compose -f infrastructure/docker-compose.yml logs --tail=50
    pause
    exit /b 1
)
echo.
echo  [4/5] Container gestartet. OK
echo.

:: ─── Schritt 5: Warten bis die App erreichbar ist ───────────
echo  [5/5] Warte bis die Anwendung bereit ist...
echo        (Bitte warten — Datenbank wird initialisiert...)
echo.

set /a VERSUCHE=0
:WARTE_SCHLEIFE
set /a VERSUCHE+=1
if %VERSUCHE% gtr 30 (
    echo.
    echo  Die Anwendung braucht laenger als erwartet.
    echo  Oeffne den Browser trotzdem — evtl. noch kurz warten.
    goto OEFFNE_BROWSER
)

timeout /t 5 >nul 2>&1
curl -s http://localhost/api/v1/health >nul 2>&1
if %errorlevel% equ 0 goto BEREIT

echo  Warte... (Versuch %VERSUCHE%/30)
goto WARTE_SCHLEIFE

:BEREIT
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  Die Anwendung ist bereit!                              ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:OEFFNE_BROWSER
echo  Oeffne Browser...
timeout /t 2 >nul
start "" "http://localhost"
echo.
echo  ════════════════════════════════════════════════════════════
echo   Gutachten-Manager laeuft unter:  http://localhost
echo   API Health-Check:                http://localhost/api/v1/health
echo.
echo   Zum STOPPEN: Doppelklick auf BEENDEN.bat
echo  ════════════════════════════════════════════════════════════
echo.
echo  Dieses Fenster kann geschlossen werden.
echo  Die Anwendung laeuft im Hintergrund weiter.
echo.
pause
