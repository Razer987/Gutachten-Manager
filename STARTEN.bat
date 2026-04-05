@echo off
setlocal EnableDelayedExpansion

:: =============================================================================
:: GUTACHTEN-MANAGER — STARTER
:: =============================================================================
:: Wenn per Doppelklick gestartet (cmd /C), Fenster haelt sich NICHT offen.
:: Trick: Mit /K neu starten, dann bleibt das Fenster immer offen.
:: =============================================================================

echo %CMDCMDLINE% | findstr /i "/c " >nul 2>&1
if %errorlevel% equ 0 (
    cmd /K ""%~f0""
    exit /b
)

:: Ins Projektverzeichnis wechseln
cd /d "%~dp0"

:: =============================================================================
:: HEADER
:: =============================================================================
cls
color 0A
echo.
echo  ============================================================
echo   GUTACHTEN-MANAGER  ^|  Version 2026.03.1
echo  ============================================================
echo.

:: =============================================================================
:: SCHRITT 1: Docker pruefen
:: =============================================================================
echo  [SCHRITT 1/5]  Docker pruefen...
echo  -------------------------------------------------------

set DOCKER_OK=0

where docker >nul 2>&1
if %errorlevel% equ 0 set DOCKER_OK=1

if %DOCKER_OK% equ 0 (
    if exist "C:\Program Files\Docker\Docker\resources\bin\docker.exe" (
        set "PATH=%PATH%;C:\Program Files\Docker\Docker\resources\bin"
        set DOCKER_OK=1
    )
)

if %DOCKER_OK% equ 0 (
    color 0C
    echo.
    echo  [FEHLER] Docker wurde nicht gefunden!
    echo.
    echo  Bitte Docker Desktop installieren:
    echo  https://www.docker.com/products/docker-desktop
    echo.
    echo  Druecken Sie eine beliebige Taste zum Schliessen.
    pause >nul
    exit /b 1
)

docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo  Docker ist installiert, aber noch nicht gestartet.
    echo  Starte Docker Desktop automatisch...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" >nul 2>&1
    echo.
    echo  Bitte warten Sie bis das Wal-Symbol in der Taskleiste
    echo  erscheint (ca. 30 Sekunden), dann starten Sie STARTEN.bat
    echo  erneut.
    echo.
    echo  Druecken Sie eine beliebige Taste zum Schliessen.
    pause >nul
    exit /b 1
)

echo  [OK] Docker laeuft.
echo.

:: =============================================================================
:: SCHRITT 2: Konfiguration pruefen
:: =============================================================================
echo  [SCHRITT 2/5]  Konfiguration pruefen...
echo  -------------------------------------------------------

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul 2>&1
        echo  [OK] .env wurde aus .env.example erstellt.
    ) else (
        color 0C
        echo.
        echo  [FEHLER] Keine .env und keine .env.example gefunden!
        echo  Stellen Sie sicher, dass Sie das Archiv vollstaendig
        echo  entpackt haben.
        echo.
        pause
        exit /b 1
    )
) else (
    echo  [OK] .env vorhanden.
)
echo.

:: =============================================================================
:: SCHRITT 3: Alte Container bereinigen
:: =============================================================================
echo  [SCHRITT 3/5]  Alte Container bereinigen...
echo  -------------------------------------------------------
docker compose -f infrastructure\docker-compose.yml down --remove-orphans >nul 2>&1
echo  [OK] Bereinigt.
echo.

:: =============================================================================
:: SCHRITT 4: Container bauen und starten
:: =============================================================================
echo  [SCHRITT 4/5]  Container starten (kann beim 1. Start laenger dauern)...
echo  -------------------------------------------------------
echo.
echo  Fortschritt:
echo.

:: Pruefe ob Images bereits existieren (Erststart vs. Folgestart)
docker images gutachten-manager-api >nul 2>&1
if %errorlevel% equ 0 (
    echo    Bekannte Images gefunden — schneller Start erwartet (~30s)
) else (
    echo    Erster Start erkannt — Images werden gebaut (~5-15 Minuten)
    echo    Bitte haben Sie Geduld...
)
echo.

echo    Starte Docker Compose (Ausgabe folgt):
echo    - - - - - - - - - - - - - - - - - - - - - - - - - - -
docker compose -f infrastructure\docker-compose.yml up --build -d
echo    - - - - - - - - - - - - - - - - - - - - - - - - - - -

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [FEHLER] Docker Compose ist fehlgeschlagen!
    echo.
    echo  Letzte Log-Eintraege:
    echo  - - - - - - - - - - - - - - - - - - - - - - - - - - -
    docker compose -f infrastructure\docker-compose.yml logs --tail=30
    echo  - - - - - - - - - - - - - - - - - - - - - - - - - - -
    echo.
    echo  Tipps:
    echo    - Port 80 bereits belegt? Andere App beenden.
    echo    - Port 5432 belegt? Lokales PostgreSQL beenden.
    echo    - Logs oben auf Fehlermeldungen pruefen.
    echo.
    echo  Druecken Sie eine beliebige Taste...
    pause >nul
    exit /b 1
)

echo.
echo  [OK] Container gestartet.
echo.

:: =============================================================================
:: SCHRITT 5: Warten bis App bereit ist
:: =============================================================================
echo  [SCHRITT 5/5]  Warte bis Anwendung bereit ist...
echo  -------------------------------------------------------
echo.

set VERSUCHE=0
set MAX_VERSUCHE=60

:WARTE_SCHLEIFE
set /a VERSUCHE+=1

:: Fortschrittsbalken berechnen (20 Zeichen breit)
set /a PROZENT=VERSUCHE*100/MAX_VERSUCHE
set /a BALKEN_VOLL=VERSUCHE*20/MAX_VERSUCHE
set /a BALKEN_LEER=20-BALKEN_VOLL

set "BAR="
for /l %%i in (1,1,%BALKEN_VOLL%) do set "BAR=!BAR!#"
for /l %%i in (1,1,%BALKEN_LEER%) do set "BAR=!BAR!."

<nul set /p "=[  !BAR!]  !PROZENT!%%   (Versuch !VERSUCHE!/%MAX_VERSUCHE%)   "
echo.

:: Auf API-Health-Endpoint pruefen
curl -s --max-time 3 http://localhost/api/v1/health >nul 2>&1
if %errorlevel% equ 0 goto BEREIT

if %VERSUCHE% geq %MAX_VERSUCHE% (
    echo.
    echo  [WARNUNG] Timeout — App antwortet noch nicht.
    echo  Moegliche Ursache: Datenbank-Migration laeuft noch.
    echo.
    echo  Bitte oeffnen Sie http://localhost manuell in 1-2 Minuten.
    goto OEFFNE_BROWSER
)

timeout /t 3 >nul 2>&1
goto WARTE_SCHLEIFE

:BEREIT
echo.
echo.
echo  [OK] Anwendung ist bereit!
echo.

:OEFFNE_BROWSER
echo  Browser wird geoeffnet...
timeout /t 1 >nul 2>&1
start "" "http://localhost"

:: =============================================================================
:: FERTIG
:: =============================================================================
echo.
color 0B
echo  ============================================================
echo.
echo   Gutachten-Manager laeuft!
echo.
echo   Adresse:   http://localhost
echo   API:       http://localhost/api/v1
echo.
echo   STOPPEN:   Doppelklick auf  BEENDEN.bat
echo   STATUS:    Doppelklick auf  STATUS.bat
echo.
echo  ============================================================
echo.
echo  Dieses Fenster kann offengelassen oder geschlossen werden.
echo  Die Anwendung laeuft im Hintergrund weiter.
echo.
pause
