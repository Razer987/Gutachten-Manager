@echo off
title Gutachten-Manager - Wird gestartet...

echo.
echo  +----------------------------------------------------------+
echo  ^|       GUTACHTEN-MANAGER - STARTER                       ^|
echo  ^|       Version 2026.03.1                                 ^|
echo  +----------------------------------------------------------+
echo.

:: Ins Projektverzeichnis wechseln (wo die .bat liegt)
cd /d "%~dp0"

:: -------------------------------------------------------
:: Schritt 1: Docker suchen und pruefen
:: -------------------------------------------------------
echo  [1/5] Suche Docker Desktop...

:: Docker-Pfad in bekannten Installationsorten suchen
set DOCKER_FOUND=0

where docker >nul 2>&1
if %errorlevel% equ 0 set DOCKER_FOUND=1

if %DOCKER_FOUND% equ 0 (
    if exist "C:\Program Files\Docker\Docker\resources\bin\docker.exe" (
        set PATH=%PATH%;C:\Program Files\Docker\Docker\resources\bin
        set DOCKER_FOUND=1
        echo  Docker gefunden in: C:\Program Files\Docker\Docker\resources\bin
    )
)

if %DOCKER_FOUND% equ 0 (
    if exist "%LOCALAPPDATA%\Docker\wsl\distro\docker.exe" (
        set PATH=%PATH%;%LOCALAPPDATA%\Docker\wsl\distro
        set DOCKER_FOUND=1
    )
)

if %DOCKER_FOUND% equ 0 (
    echo.
    echo  FEHLER: Docker wurde nicht gefunden!
    echo.
    echo  Bitte installieren Sie Docker Desktop:
    echo    https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

echo  [1/5] Docker gefunden. Pruefe ob Daemon laeuft...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  Docker Desktop ist installiert, aber noch nicht gestartet.
    echo.
    echo  Bitte:
    echo    1. Docker Desktop starten (Suchfeld: "Docker Desktop")
    echo    2. Warten bis das Wal-Symbol in der Taskleiste erscheint
    echo    3. Diese Datei erneut doppelklicken
    echo.
    echo  Docker Desktop wird jetzt automatisch gestartet...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" >nul 2>&1
    echo  Warten Sie ca. 30 Sekunden, dann starten Sie STARTEN.bat erneut.
    echo.
    pause
    exit /b 1
)
echo  [1/5] Docker laeuft. OK
echo.

:: -------------------------------------------------------
:: Schritt 2: .env pruefen
:: -------------------------------------------------------
echo  [2/5] Pruefe Konfiguration...
if not exist ".env" (
    echo  Keine .env gefunden - erstelle Standardkonfiguration...
    copy ".env.example" ".env" >nul 2>&1
    echo  Konfiguration wurde erstellt.
)
echo  [2/5] Konfiguration vorhanden. OK
echo.

:: -------------------------------------------------------
:: Schritt 3: Alte Container stoppen
:: -------------------------------------------------------
echo  [3/5] Stoppe alte Container (falls vorhanden)...
docker compose -f infrastructure\docker-compose.yml down >nul 2>&1
echo  [3/5] Bereinigt. OK
echo.

:: -------------------------------------------------------
:: Schritt 4: Container starten
:: -------------------------------------------------------
echo  [4/5] Starte Gutachten-Manager...
echo        (Erster Start: 5-15 Minuten - Images werden gebaut)
echo        (Folgestarts:  ca. 30-60 Sekunden)
echo.
docker compose -f infrastructure\docker-compose.yml up --build -d
if %errorlevel% neq 0 (
    echo.
    echo  FEHLER beim Starten! Logs:
    docker compose -f infrastructure\docker-compose.yml logs --tail=50
    pause
    exit /b 1
)
echo.
echo  [4/5] Container gestartet. OK
echo.

:: -------------------------------------------------------
:: Schritt 5: Warten bis App bereit ist
:: -------------------------------------------------------
echo  [5/5] Warte bis Anwendung bereit ist...
echo        (Datenbank wird initialisiert - bitte warten...)
echo.

set VERSUCHE=0
:WARTE_SCHLEIFE
set /a VERSUCHE+=1
if %VERSUCHE% gtr 30 goto OEFFNE_BROWSER

timeout /t 5 >nul 2>&1
curl -s --max-time 3 http://localhost/api/v1/health >nul 2>&1
if %errorlevel% equ 0 goto BEREIT

echo  Warte... (Versuch %VERSUCHE% von 30)
goto WARTE_SCHLEIFE

:BEREIT
echo  Anwendung ist bereit!
echo.

:OEFFNE_BROWSER
echo  Oeffne Browser...
timeout /t 2 >nul
start "" "http://localhost"
echo.
echo  ----------------------------------------------------------
echo   Gutachten-Manager laeuft unter:  http://localhost
echo   Zum STOPPEN: Doppelklick auf BEENDEN.bat
echo  ----------------------------------------------------------
echo.
echo  Dieses Fenster kann jetzt geschlossen werden.
echo.
pause
