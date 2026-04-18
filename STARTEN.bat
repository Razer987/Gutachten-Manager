@echo off
title Gutachten-Manager - Starter
setlocal EnableDelayedExpansion

:: -------------------------------------------------------
:: Fenster bei Doppelklick offen halten
:: Methode: --running Argument - 100%% zuverlaessig
:: -------------------------------------------------------
if not "%~1"=="--running" (
    start "Gutachten-Manager" cmd /K ""%~f0" --running"
    exit /b
)

cd /d "%~dp0"
if not exist "logs" mkdir logs
set LOG=logs\starten-aktuell.log
echo === Gutachten-Manager Start %DATE% %TIME% === > "%LOG%"

cls
color 0A
echo.
echo  +----------------------------------------------------------+
echo  ^|  GUTACHTEN-MANAGER  - Wird gestartet...                 ^|
echo  +----------------------------------------------------------+
echo.

:: -------------------------------------------------------
:: Schritt 1: Verzeichnis pruefen
:: -------------------------------------------------------
echo  [1/5] Pruefe Projektverzeichnis...
if not exist "docker-compose.yml" (
    color 0C
    echo  [FEHLER] docker-compose.yml nicht gefunden!
    echo          Bitte STARTEN.bat aus dem Gutachten-Manager-Ordner ausfuehren.
    echo          Aktueller Ordner: %CD%
    goto ERROR_PAUSE
)
echo  [1/5] Verzeichnis OK: %CD%
echo.

:: -------------------------------------------------------
:: Schritt 2: Docker pruefen
:: -------------------------------------------------------
echo  [2/5] Pruefe Docker Desktop...
docker info >nul 2>&1
if %errorlevel% equ 0 goto DOCKER_OK

echo  [2/5] Docker nicht bereit - versuche zu starten...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" >nul 2>&1

set /a DOCKER_WAIT=0

:WARTE_DOCKER
if %DOCKER_WAIT% geq 120 (
    color 0C
    echo  [FEHLER] Docker Desktop nach 2 Minuten nicht gestartet.
    echo          Bitte Docker Desktop manuell starten und nochmal versuchen.
    goto ERROR_PAUSE
)
echo  [2/5] Warte auf Docker... (%DOCKER_WAIT%s / 120s)
timeout /t 5 /nobreak >nul
set /a DOCKER_WAIT+=5
docker info >nul 2>&1
if %errorlevel% neq 0 goto WARTE_DOCKER

:DOCKER_OK
echo  [2/5] Docker laeuft. OK
echo.

:: -------------------------------------------------------
:: Schritt 3: .env sicherstellen
:: -------------------------------------------------------
echo  [3/5] Pruefe Konfiguration...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo  [3/5] .env aus .env.example erstellt.
    ) else (
        color 0C
        echo  [FEHLER] Weder .env noch .env.example gefunden!
        goto ERROR_PAUSE
    )
) else (
    echo  [3/5] .env vorhanden. OK
)
echo.

:: -------------------------------------------------------
:: Schritt 4: Images bauen und Container starten
:: Ausgabe wird SICHTBAR angezeigt
:: -------------------------------------------------------
echo  [4/5] Baue Images und starte Container...
echo        Erster Start: 5-15 Minuten
echo        Folgestarts:  1-2 Minuten
echo.
echo  [4/5] Raeume alte Container auf (falls vorhanden)...
docker rm -f gutachten_db gutachten_api gutachten_web gutachten_nginx >nul 2>&1
echo.
echo [%TIME%] docker compose up --build -d >> "%LOG%"

docker compose up --build -d
set COMPOSE_ERR=%errorlevel%
echo [%TIME%] Exit-Code: %COMPOSE_ERR% >> "%LOG%"

if %COMPOSE_ERR% neq 0 (
    color 0C
    echo.
    echo  [FEHLER] Starten fehlgeschlagen! (Exit-Code: %COMPOSE_ERR%)
    echo.
    echo  Container-Logs:
    docker compose logs --tail=40
    docker compose logs --tail=40 >> "%LOG%" 2>&1
    goto ERROR_PAUSE
)
echo.
echo  [4/5] Container gestartet. OK
echo.

:: -------------------------------------------------------
:: Schritt 5: Warten bis App bereit ist
:: -------------------------------------------------------
echo  [5/5] Warte bis Anwendung bereit ist...
set /a VERSUCHE=0

:HEALTH_CHECK
set /a VERSUCHE+=1
if %VERSUCHE% gtr 80 goto TIMEOUT
powershell -NonInteractive -Command "try{$r=(Invoke-WebRequest 'http://localhost/api/v1/health' -UseBasicParsing -TimeoutSec 3 -EA Stop).StatusCode;exit ($r -ne 200)}catch{exit 1}" >nul 2>&1
if %errorlevel% equ 0 goto BEREIT
<nul set /p "=  Versuch !VERSUCHE!/80 "
echo.
timeout /t 3 /nobreak >nul
goto HEALTH_CHECK

:TIMEOUT
color 0E
echo.
echo  [!] Timeout - App braucht laenger als erwartet.
echo      Logs werden gespeichert...
docker compose logs --tail=40 >> "%LOG%" 2>&1
echo  [!] Tipp: Warte noch 2 Minuten und oeffne http://localhost manuell.
goto BROWSER

:BEREIT
echo.
echo  [5/5] Anwendung bereit nach %VERSUCHE% Versuchen! OK
echo [OK] Bereit (%TIME%) >> "%LOG%"

:BROWSER
timeout /t 1 /nobreak >nul
start "" "http://localhost"
docker compose ps >> "%LOG%" 2>&1

color 0B
echo.
echo  +----------------------------------------------------------+
echo  ^|  Gutachten-Manager laeuft!                              ^|
echo  ^|                                                         ^|
echo  ^|  Adresse : http://localhost                             ^|
echo  ^|  Stoppen : BEENDEN.bat                                  ^|
echo  ^|  Status  : STATUS.bat                                   ^|
echo  +----------------------------------------------------------+
echo.
pause
exit /b 0

:: -------------------------------------------------------
:ERROR_PAUSE
:: Zentraler Fehler-Halt - Fenster bleibt IMMER offen
:: -------------------------------------------------------
color 0C
echo.
echo  +----------------------------------------------------------+
echo  ^|  FEHLER - Bitte Meldungen oben lesen!                   ^|
echo  +----------------------------------------------------------+
echo  Log: %CD%\logs\starten-aktuell.log
echo.
pause
exit /b 1
