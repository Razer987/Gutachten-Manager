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

:: Ins Projektverzeichnis wechseln (wo die .bat liegt)
cd /d "%~dp0"

:: =============================================================================
:: LOG-DATEI einrichten
:: =============================================================================

if not exist "logs" mkdir logs

set LOG_AKTUELL=logs\starten-aktuell.log
set LOG_DATEI=logs\starten-%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%.log
set LOG_DATEI=%LOG_DATEI: =0%

(
    echo ================================================================
    echo  GUTACHTEN-MANAGER -- Startprotokoll
    echo  Datum:  %DATE%
    echo  Zeit:   %TIME%
    echo  Pfad:   %~f0
    echo  Windows: %OS%
    echo ================================================================
    echo.
) > "%LOG_AKTUELL%"

:: =============================================================================
:: HEADER
:: =============================================================================
cls
color 0A
call :ECHO  "============================================================"
call :ECHO  " GUTACHTEN-MANAGER  |  Version 2026.03.1"
call :ECHO  "============================================================"
call :ECHO  ""

:: =============================================================================
:: SCHRITT 1: Verzeichnis-Struktur pruefen
:: =============================================================================
call :ECHO  "[SCHRITT 1/6]  Verzeichnis pruefen..."
call :ECHO  "-------------------------------------------------------"

call :LOG "Aktuelles Verzeichnis: %CD%"

if not exist "infrastructure\docker-compose.yml" (
    call :LOG "FEHLER: infrastructure\docker-compose.yml nicht gefunden"
    color 0C
    call :ECHO  "[FEHLER] Datei nicht gefunden: infrastructure\docker-compose.yml"
    call :ECHO  ""
    call :ECHO  "Moegliche Ursachen:"
    call :ECHO  "  - ZIP-Archiv nicht vollstaendig entpackt"
    call :ECHO  "  - Falscher Ordner geoeffnet"
    call :ECHO  ""
    call :ECHO  "Stellen Sie sicher, dass STARTEN.bat direkt im"
    call :ECHO  "Gutachten-Manager Ordner liegt (neben infrastructure\)."
    call :ECHO  ""
    call :ECHO_LOGHINWEIS
    pause >nul
    exit /b 1
)

if not exist "infrastructure\docker\api.Dockerfile" (
    call :LOG "FEHLER: api.Dockerfile nicht gefunden"
    color 0C
    call :ECHO  "[FEHLER] Dockerfiles fehlen in infrastructure\docker\"
    call :ECHO  "Bitte das ZIP-Archiv erneut vollstaendig entpacken."
    call :ECHO  ""
    call :ECHO_LOGHINWEIS
    pause >nul
    exit /b 1
)

call :ECHO  "[OK] Verzeichnisstruktur vollstaendig."
call :ECHO  ""

:: =============================================================================
:: SCHRITT 2: Docker pruefen
:: =============================================================================
call :ECHO  "[SCHRITT 2/6]  Docker pruefen..."
call :ECHO  "-------------------------------------------------------"

set DOCKER_OK=0
where docker >nul 2>&1
if %errorlevel% equ 0 set DOCKER_OK=1

if %DOCKER_OK% equ 0 (
    if exist "C:\Program Files\Docker\Docker\resources\bin\docker.exe" (
        set "PATH=%PATH%;C:\Program Files\Docker\Docker\resources\bin"
        set DOCKER_OK=1
        call :LOG "Docker PATH ergaenzt: C:\Program Files\Docker\Docker\resources\bin"
    )
)

if %DOCKER_OK% equ 0 (
    call :LOG "FEHLER: Docker nicht gefunden"
    color 0C
    call :ECHO  "[FEHLER] Docker wurde nicht gefunden!"
    call :ECHO  "Bitte Docker Desktop installieren:"
    call :ECHO  "  https://www.docker.com/products/docker-desktop"
    call :ECHO  ""
    call :ECHO_LOGHINWEIS
    pause >nul
    exit /b 1
)

docker ps >nul 2>&1
if %errorlevel% neq 0 (
    call :LOG "FEHLER: Docker Daemon antwortet nicht"
    call :ECHO  "Docker Desktop ist installiert, laeuft aber noch nicht."
    call :ECHO  "Starte Docker Desktop..."
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" >nul 2>&1
    call :ECHO  ""
    call :ECHO  "Warten Sie bis das Wal-Symbol in der Taskleiste erscheint"
    call :ECHO  "(ca. 30 Sekunden), dann STARTEN.bat erneut ausfuehren."
    call :ECHO  ""
    call :ECHO_LOGHINWEIS
    pause >nul
    exit /b 1
)

for /f "tokens=*" %%v in ('docker --version 2^>^&1') do call :LOG "%%v"
for /f "tokens=*" %%v in ('docker compose version 2^>^&1') do call :LOG "%%v"
call :ECHO  "[OK] Docker laeuft."
call :ECHO  ""

:: =============================================================================
:: SCHRITT 3: Konfiguration pruefen
:: =============================================================================
call :ECHO  "[SCHRITT 3/6]  Konfiguration pruefen..."
call :ECHO  "-------------------------------------------------------"

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul 2>&1
        call :ECHO  "[OK] .env wurde aus .env.example erstellt."
        call :LOG   ".env aus .env.example erstellt"
    ) else (
        call :LOG "FEHLER: Weder .env noch .env.example gefunden"
        color 0C
        call :ECHO  "[FEHLER] Keine .env Konfigurationsdatei gefunden!"
        call :ECHO  "Benennen Sie .env.example in .env um."
        call :ECHO  ""
        call :ECHO_LOGHINWEIS
        pause >nul
        exit /b 1
    )
) else (
    call :LOG ".env vorhanden"
    call :ECHO  "[OK] .env vorhanden."
)
call :ECHO  ""

:: =============================================================================
:: SCHRITT 4: Alte Container bereinigen
:: =============================================================================
call :ECHO  "[SCHRITT 4/6]  Alte Container bereinigen..."
call :ECHO  "-------------------------------------------------------"
call :LOG   "docker compose down..."
docker compose --project-directory . -f infrastructure\docker-compose.yml down --remove-orphans >> "%LOG_AKTUELL%" 2>&1
call :ECHO  "[OK] Bereinigt."
call :ECHO  ""

:: =============================================================================
:: SCHRITT 5: Container bauen und starten
:: =============================================================================
call :ECHO  "[SCHRITT 5/6]  Container starten..."
call :ECHO  "-------------------------------------------------------"
call :ECHO  ""

docker image inspect gutachten_api >nul 2>&1
if %errorlevel% equ 0 (
    call :ECHO  "  Bekannte Images gefunden -- schneller Start (~30-60s)"
    call :LOG   "Folgestart: Images vorhanden"
) else (
    call :ECHO  "  Erster Start -- Images werden jetzt gebaut (~5-15 Min)"
    call :ECHO  "  Bitte haben Sie Geduld, der Fortschritt erscheint unten."
    call :LOG   "Erststart: Images fehlen, Build wird ausgefuehrt"
)
call :ECHO  ""
call :ECHO  "  Docker-Ausgabe:"
call :ECHO  "  - - - - - - - - - - - - - - - - - - - - - - - - - -"
call :LOG   "Starte: docker compose --project-directory . -f infrastructure\docker-compose.yml up --build -d"

:: Docker-Output in temporaere Datei umleiten, dann anzeigen + loggen
:: --project-directory . stellt sicher, dass Pfade relativ zum Projektstamm sind
docker compose --project-directory . -f infrastructure\docker-compose.yml up --build -d > "%TEMP%\gm_docker_out.txt" 2>&1
set BUILD_EXIT=%errorlevel%

:: Ausgabe auf Konsole zeigen
type "%TEMP%\gm_docker_out.txt"
:: Ausgabe ins Log schreiben
type "%TEMP%\gm_docker_out.txt" >> "%LOG_AKTUELL%"

call :ECHO  "  - - - - - - - - - - - - - - - - - - - - - - - - - -"

if %BUILD_EXIT% neq 0 (
    call :LOG "FEHLER: docker compose up fehlgeschlagen (Exit-Code: %BUILD_EXIT%)"
    color 0C
    call :ECHO  ""
    call :ECHO  "[FEHLER] Docker Compose ist fehlgeschlagen!"
    call :ECHO  ""

    :: Container-Logs fuer Diagnose
    call :ECHO  "  Container-Logs (letzte 40 Zeilen):"
    call :ECHO  "  - - - - - - - - - - - - - - - - - - - - - - - - -"
    docker compose --project-directory . -f infrastructure\docker-compose.yml logs --tail=40 2>&1
    docker compose --project-directory . -f infrastructure\docker-compose.yml logs --tail=40 >> "%LOG_AKTUELL%" 2>&1
    call :ECHO  "  - - - - - - - - - - - - - - - - - - - - - - - - -"

    call :ECHO  ""
    call :ECHO  "  Haeufige Ursachen:"
    call :ECHO  "    Port 80 belegt?   -> Anderen Webserver beenden"
    call :ECHO  "    Port 5432 belegt? -> Lokales PostgreSQL beenden"
    call :ECHO  "    Antivirus?        -> Projektordner als Ausnahme"
    call :ECHO  ""
    call :ECHO_LOGHINWEIS
    pause >nul
    exit /b 1
)

call :LOG "docker compose up erfolgreich"
call :ECHO  ""
call :ECHO  "[OK] Container gestartet."
call :ECHO  ""

:: =============================================================================
:: SCHRITT 6: Warten bis App bereit ist
:: =============================================================================
call :ECHO  "[SCHRITT 6/6]  Warte bis Anwendung bereit ist..."
call :ECHO  "-------------------------------------------------------"
call :ECHO  ""
call :LOG   "Health-Check laeuft..."

set VERSUCHE=0
set MAX_VERSUCHE=60

:WARTE_SCHLEIFE
set /a VERSUCHE+=1
set /a BALKEN_VOLL=VERSUCHE*20/MAX_VERSUCHE
set /a BALKEN_LEER=20-BALKEN_VOLL
set /a PROZENT=VERSUCHE*100/MAX_VERSUCHE

set "BAR="
for /l %%i in (1,1,%BALKEN_VOLL%) do set "BAR=!BAR!#"
for /l %%i in (1,1,%BALKEN_LEER%) do set "BAR=!BAR!."

<nul set /p "=  [!BAR!] !PROZENT!%%  (Versuch !VERSUCHE!/%MAX_VERSUCHE%)   "
echo.

curl -s --max-time 3 http://localhost/api/v1/health >nul 2>&1
if %errorlevel% equ 0 goto BEREIT

if %VERSUCHE% geq %MAX_VERSUCHE% (
    call :LOG "WARNUNG: Timeout nach %MAX_VERSUCHE% Versuchen"
    docker compose --project-directory . -f infrastructure\docker-compose.yml logs --tail=30 >> "%LOG_AKTUELL%" 2>&1
    call :ECHO  ""
    call :ECHO  "[WARNUNG] Timeout -- App antwortet noch nicht."
    call :ECHO  "Datenbank-Migration laeuft evtl. noch."
    call :ECHO  "Bitte http://localhost in 1-2 Minuten manuell oeffnen."
    call :ECHO  ""
    call :ECHO_LOGHINWEIS
    goto OEFFNE_BROWSER
)

timeout /t 3 >nul 2>&1
goto WARTE_SCHLEIFE

:BEREIT
call :LOG "Health-Check erfolgreich nach %VERSUCHE% Versuchen"
call :ECHO  ""
call :ECHO  "[OK] Anwendung ist bereit!"
call :ECHO  ""

:OEFFNE_BROWSER
call :LOG "Oeffne http://localhost"
timeout /t 1 >nul 2>&1
start "" "http://localhost"
docker compose --project-directory . -f infrastructure\docker-compose.yml ps >> "%LOG_AKTUELL%" 2>&1

:: =============================================================================
:: FERTIG
:: =============================================================================
call :LOG "Startvorgang abgeschlossen"
echo.
color 0B
call :ECHO  "============================================================"
call :ECHO  ""
call :ECHO  " Gutachten-Manager laeuft!"
call :ECHO  ""
call :ECHO  "  Adresse:  http://localhost"
call :ECHO  "  API:      http://localhost/api/v1"
call :ECHO  ""
call :ECHO  "  STOPPEN:  Doppelklick auf BEENDEN.bat"
call :ECHO  "  STATUS:   Doppelklick auf STATUS.bat"
call :ECHO  ""
call :ECHO_LOGHINWEIS
call :ECHO  "============================================================"
echo.
echo  Dieses Fenster kann offengelassen oder geschlossen werden.
echo  Die Anwendung laeuft im Hintergrund weiter.
echo.
pause
goto :EOF

:: =============================================================================
:: HILFSFUNKTIONEN
:: =============================================================================

:LOG
    echo [%TIME%] %~1 >> "%LOG_AKTUELL%"
    goto :EOF

:ECHO
    echo  %~1
    echo [%TIME%] %~1 >> "%LOG_AKTUELL%"
    goto :EOF

:ECHO_LOGHINWEIS
    echo.
    echo  -------------------------------------------------------
    echo  Logdatei (bei Fehler bitte mitsenden):
    echo    %CD%\%LOG_AKTUELL%
    echo  -------------------------------------------------------
    echo.
    goto :EOF
