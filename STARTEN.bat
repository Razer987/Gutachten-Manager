@echo off
setlocal EnableDelayedExpansion

:: Fenster offen halten bei Doppelklick
echo %CMDCMDLINE% | findstr /i "/c " >nul 2>&1
if %errorlevel% equ 0 ( cmd /K ""%~f0"" & exit /b )

cd /d "%~dp0"
if not exist "logs" mkdir logs
set LOG=logs\starten-aktuell.log
echo === Gutachten-Manager Start %DATE% %TIME% === > "%LOG%"

cls
color 0A
echo.
echo  ============================================================
echo   GUTACHTEN-MANAGER  ^|  Wird gestartet...
echo  ============================================================
echo.

:: ── 1. Verzeichnis pruefen ────────────────────────────────────────────────────
if not exist "docker-compose.yml" (
    color 0C
    echo  [!!] docker-compose.yml nicht gefunden.
    echo       Bitte STARTEN.bat aus dem Gutachten-Manager-Ordner ausfuehren.
    pause & exit /b 1
)

:: ── 2. Docker pruefen ─────────────────────────────────────────────────────────
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Docker Engine nicht bereit. Starte Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" >nul 2>&1

    echo  [!] Warte auf Docker Engine (bis zu 120 Sekunden)...
    set /a DOCKER_WAIT=0
    :WARTE_DOCKER
    timeout /t 5 /nobreak >nul
    set /a DOCKER_WAIT+=5
    docker info >nul 2>&1
    if %errorlevel% equ 0 goto DOCKER_OK
    if %DOCKER_WAIT% geq 120 (
        color 0C
        echo  [!!] Docker Engine nach 120 Sekunden nicht bereit.
        echo       Bitte Docker Desktop manuell starten und nochmals ausfuehren.
        pause & exit /b 1
    )
    goto WARTE_DOCKER
)
:DOCKER_OK
echo  [OK] Docker Engine laeuft.
echo [OK] Docker bereit >> "%LOG%"

:: ── 3. .env sicherstellen ─────────────────────────────────────────────────────
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo  [OK] .env aus .env.example erstellt.
    )
)

:: ── 4. Images bauen (Ausgabe sichtbar!) ──────────────────────────────────────
echo.
echo  ┌─────────────────────────────────────────────────────────┐
echo  │  Schritt 1/2: Docker-Images bauen                       │
echo  │  Erster Start: 5-15 Minuten  /  Folgestarts: ~1 Minute  │
echo  └─────────────────────────────────────────────────────────┘
echo.
echo [%TIME%] Starte docker compose build... >> "%LOG%"

docker compose build
set BUILD_ERR=%errorlevel%
echo [%TIME%] docker compose build beendet (Exit: %BUILD_ERR%) >> "%LOG%"

if %BUILD_ERR% neq 0 (
    color 0C
    echo.
    echo  [!!] Build fehlgeschlagen (Exit-Code: %BUILD_ERR%)
    echo       Fehlermeldungen stehen oben im Fenster.
    echo       Log: %CD%\%LOG%
    echo [FEHLER] Build fehlgeschlagen >> "%LOG%"
    docker compose logs --tail=30 >> "%LOG%" 2>&1
    pause & exit /b 1
)
echo  [OK] Images gebaut.
echo.

:: ── 5. Container starten ─────────────────────────────────────────────────────
echo  ┌─────────────────────────────────────────────────────────┐
echo  │  Schritt 2/2: Container starten                         │
echo  └─────────────────────────────────────────────────────────┘
echo.
echo [%TIME%] Starte Container... >> "%LOG%"

docker compose up -d
set UP_ERR=%errorlevel%
echo [%TIME%] docker compose up beendet (Exit: %UP_ERR%) >> "%LOG%"

if %UP_ERR% neq 0 (
    color 0C
    echo  [!!] Container konnten nicht gestartet werden (Exit: %UP_ERR%).
    docker compose logs --tail=30
    docker compose logs --tail=30 >> "%LOG%" 2>&1
    pause & exit /b 1
)
echo  [OK] Container gestartet.

:: ── 6. Auf Bereitschaft warten ────────────────────────────────────────────────
echo.
echo  [..] Warte auf Anwendung (max. 4 Minuten)...
set VERSUCHE=0
:HEALTH_CHECK
set /a VERSUCHE+=1
powershell -NonInteractive -Command "try{$r=(Invoke-WebRequest 'http://localhost/api/v1/health' -UseBasicParsing -TimeoutSec 3 -EA Stop).StatusCode;exit ($r -ne 200)}catch{exit 1}" >nul 2>&1
if %errorlevel% equ 0 goto BEREIT
if %VERSUCHE% geq 80 goto TIMEOUT
<nul set /p "=  Versuch !VERSUCHE!/80  "
echo.
timeout /t 3 /nobreak >nul
goto HEALTH_CHECK

:TIMEOUT
echo  [!] Timeout -- App braucht laenger. Bitte http://localhost in 2 Min oeffnen.
echo [WARN] Health-Check Timeout nach %VERSUCHE% Versuchen >> "%LOG%"
docker compose logs --tail=20 >> "%LOG%" 2>&1
goto BROWSER

:BEREIT
echo  [OK] Anwendung bereit nach %VERSUCHE% Versuchen!
echo [OK] Bereit nach %VERSUCHE% Versuchen (%TIME%) >> "%LOG%"

:BROWSER
timeout /t 1 /nobreak >nul
start "" "http://localhost"
docker compose ps >> "%LOG%" 2>&1

color 0B
echo.
echo  ============================================================
echo   Gutachten-Manager laeuft!
echo.
echo   Adresse:  http://localhost
echo   Stoppen:  BEENDEN.bat
echo   Status:   STATUS.bat
echo   Log:      %CD%\%LOG%
echo  ============================================================
echo.
pause
