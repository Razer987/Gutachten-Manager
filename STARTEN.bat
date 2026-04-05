@echo off
setlocal EnableDelayedExpansion

:: =============================================================================
:: GUTACHTEN-MANAGER — STARTER
:: =============================================================================
:: Wenn per Doppelklick gestartet (cmd /C), Fenster sofort wieder zu.
:: Trick: Neu starten mit /K — dann bleibt das Fenster IMMER offen.
:: =============================================================================
echo %CMDCMDLINE% | findstr /i "/c " >nul 2>&1
if %errorlevel% equ 0 (
    cmd /K ""%~f0""
    exit /b
)

cd /d "%~dp0"

:: Log-Verzeichnis und Datei
if not exist "logs" mkdir logs
set LOG=logs\starten-aktuell.log

(
    echo ================================================================
    echo  GUTACHTEN-MANAGER Startprotokoll
    echo  Datum: %DATE%  Zeit: %TIME%
    echo  Pfad:  %CD%
    echo ================================================================
    echo.
) > "%LOG%"

:: =============================================================================
cls
color 0A
echo.
echo  ============================================================
echo   GUTACHTEN-MANAGER  ^|  Version 2026.03.1
echo  ============================================================
echo.

:: =============================================================================
:: SCHRITT 1: Verzeichnis pruefen
:: =============================================================================
call :H1 "[1/5] Verzeichnis pruefen..."

if not exist "docker-compose.yml" (
    call :ERR "docker-compose.yml nicht gefunden!"
    call :ERR "Stellen Sie sicher, dass STARTEN.bat im Gutachten-Manager"
    call :ERR "Hauptordner liegt (neben docker-compose.yml)."
    goto FEHLER_ENDE
)
if not exist "infrastructure\docker\api.Dockerfile" (
    call :ERR "infrastructure\docker\api.Dockerfile nicht gefunden!"
    call :ERR "Bitte das ZIP-Archiv vollstaendig entpacken."
    goto FEHLER_ENDE
)
call :OK "Verzeichnisstruktur vollstaendig."

:: =============================================================================
:: SCHRITT 2: Docker pruefen
:: =============================================================================
call :H1 "[2/5] Docker pruefen..."

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
    call :ERR "Docker nicht gefunden!"
    call :ERR "Bitte Docker Desktop installieren:"
    call :ERR "  https://www.docker.com/products/docker-desktop"
    goto FEHLER_ENDE
)

docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Docker Desktop laeuft noch nicht. Starte automatisch...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" >nul 2>&1
    echo.
    echo  Bitte warten bis das Wal-Symbol in der Taskleiste erscheint
    echo  (ca. 30 Sekunden), dann STARTEN.bat erneut ausfuehren.
    echo.
    goto FEHLER_ENDE
)

for /f "tokens=*" %%v in ('docker --version 2^>^&1')         do echo [%TIME%] %%v >> "%LOG%"
for /f "tokens=*" %%v in ('docker compose version 2^>^&1')    do echo [%TIME%] %%v >> "%LOG%"
call :OK "Docker laeuft."

:: =============================================================================
:: SCHRITT 3: .env pruefen / erstellen
:: =============================================================================
call :H1 "[3/5] Konfiguration pruefen..."

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul 2>&1
        call :OK ".env wurde aus .env.example erstellt."
    ) else (
        call :ERR "Keine .env Datei gefunden!"
        call :ERR "Benennen Sie .env.example in .env um."
        goto FEHLER_ENDE
    )
) else (
    call :OK ".env vorhanden."
)

:: Sicherstellen dass keine Platzhalter-Werte mehr drin sind
findstr /c:"<" .env >nul 2>&1
if %errorlevel% equ 0 (
    echo  [!] Platzhalter in .env gefunden — wird durch .env.example ersetzt...
    copy ".env.example" ".env" >nul 2>&1
    call :OK ".env mit Standard-Werten neu erstellt."
)

:: =============================================================================
:: SCHRITT 4: Container bauen und starten
:: =============================================================================
call :H1 "[4/5] Container starten..."
echo.

docker image inspect gutachten_api >nul 2>&1
if %errorlevel% equ 0 (
    echo   Bekannte Images vorhanden -- Folgestart (~30-60s)
    echo [%TIME%] Folgestart >> "%LOG%"
) else (
    echo   Erster Start -- Images werden gebaut (5-15 Minuten)
    echo   Bitte haben Sie Geduld...
    echo [%TIME%] Erststart: Build erforderlich >> "%LOG%"
)
echo.
echo   Docker-Ausgabe (auch in Logdatei):
echo   - - - - - - - - - - - - - - - - - - - - - - - -

echo [%TIME%] docker compose up --build -d gestartet >> "%LOG%"

:: Docker-Output in temp-Datei, dann anzeigen UND ins Log
docker compose up --build -d > "%TEMP%\gm_build.txt" 2>&1
set BUILD_EXIT=%errorlevel%

type "%TEMP%\gm_build.txt"
type "%TEMP%\gm_build.txt" >> "%LOG%"

echo   - - - - - - - - - - - - - - - - - - - - - - - -

if %BUILD_EXIT% neq 0 (
    echo [%TIME%] FEHLER: Exit-Code %BUILD_EXIT% >> "%LOG%"
    echo.
    call :ERR "Docker Compose fehlgeschlagen (Exit: %BUILD_EXIT%)"
    echo.
    echo   Container-Logs (auch in Logdatei):
    echo   - - - - - - - - - - - - - - - - - - - - - - - -
    docker compose logs --tail=50 2>&1
    docker compose logs --tail=50 >> "%LOG%" 2>&1
    echo   - - - - - - - - - - - - - - - - - - - - - - - -
    echo.
    echo   Haeufige Ursachen:
    echo     Port 80 belegt?    Anderen Webserver beenden.
    echo     Port 5432 belegt?  Lokales PostgreSQL beenden.
    echo     Build-Fehler?      Vollstaendige Ausgabe oben pruefen.
    goto FEHLER_ENDE
)

call :OK "Container gestartet."

:: =============================================================================
:: SCHRITT 5: Auf Bereitschaft warten
:: =============================================================================
call :H1 "[5/5] Warte auf Anwendung..."
echo.
echo [%TIME%] Health-Check laeuft... >> "%LOG%"

set VERSUCHE=0
set MAX=80

:WARTE
set /a VERSUCHE+=1
set /a VOLL=VERSUCHE*20/MAX
set /a LEER=20-VOLL
set /a PROZ=VERSUCHE*100/MAX

set "BAR="
for /l %%i in (1,1,%VOLL%) do set "BAR=!BAR!#"
for /l %%i in (1,1,%LEER%) do set "BAR=!BAR!."

<nul set /p "=  [!BAR!] !PROZ!%%  (Versuch !VERSUCHE!/%MAX%)   "
echo.

curl -s --max-time 3 http://localhost/api/v1/health >nul 2>&1
if %errorlevel% equ 0 goto BEREIT

if %VERSUCHE% geq %MAX% (
    echo.
    echo [%TIME%] WARNUNG: Timeout >> "%LOG%"
    docker compose logs --tail=30 >> "%LOG%" 2>&1
    echo.
    echo  [!] Timeout -- App antwortet noch nicht.
    echo      Datenbank-Migration laeuft evtl. noch.
    echo      Bitte http://localhost in 1-2 Minuten manuell oeffnen.
    goto BROWSER
)

timeout /t 3 >nul 2>&1
goto WARTE

:BEREIT
echo [%TIME%] Health-Check erfolgreich nach %VERSUCHE% Versuchen >> "%LOG%"
echo.
echo.
call :OK "Anwendung ist bereit!"

:BROWSER
timeout /t 1 >nul 2>&1
start "" "http://localhost"
docker compose ps >> "%LOG%" 2>&1

:: =============================================================================
color 0B
echo.
echo  ============================================================
echo.
echo   Gutachten-Manager laeuft!
echo.
echo   Adresse:  http://localhost
echo.
echo   STOPPEN:  BEENDEN.bat
echo   STATUS:   STATUS.bat
echo   LOG:      %CD%\%LOG%
echo.
echo  ============================================================
echo.
echo  Dieses Fenster kann geschlossen werden.
echo  Die Anwendung laeuft im Hintergrund weiter.
echo.
pause
goto :EOF

:FEHLER_ENDE
echo.
echo  ============================================================
echo   FEHLER -- Start nicht erfolgreich
echo.
echo   Logdatei: %CD%\%LOG%
echo   Bitte die Logdatei bei der Fehleranalyse mitsenden.
echo  ============================================================
echo.
pause
goto :EOF

:: =============================================================================
:: Hilfsfunktionen
:: =============================================================================
:H1
    echo.
    echo  %~1
    echo  -------------------------------------------------------
    echo [%TIME%] %~1 >> "%LOG%"
    goto :EOF
:OK
    echo  [OK] %~1
    echo [%TIME%] OK: %~1 >> "%LOG%"
    goto :EOF
:ERR
    echo  [!!] %~1
    echo [%TIME%] FEHLER: %~1 >> "%LOG%"
    goto :EOF
