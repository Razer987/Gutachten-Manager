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

:: 1. Verzeichnis pruefen
if not exist "docker-compose.yml" (
    color 0C
    echo  [!!] docker-compose.yml nicht gefunden.
    echo       Bitte STARTEN.bat aus dem Gutachten-Manager-Ordner ausfuehren.
    pause & exit /b 1
)

:: 2. Docker pruefen
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Docker startet noch. Warte...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" >nul 2>&1
    :WARTE_DOCKER
    timeout /t 5 /nobreak >nul
    docker ps >nul 2>&1
    if %errorlevel% neq 0 goto WARTE_DOCKER
)
echo  [OK] Docker laeuft.

:: 3. .env sicherstellen
if not exist ".env" (
    if exist ".env.example" ( copy ".env.example" ".env" >nul )
)

:: 4. Container starten
echo.
echo  [..] Starte Container...
docker compose up --build -d > "%TEMP%\gm_start.txt" 2>&1
set BUILD_ERR=%errorlevel%
type "%TEMP%\gm_start.txt" >> "%LOG%"

if %BUILD_ERR% neq 0 (
    color 0C
    echo  [!!] Fehler beim Starten (Exit: %BUILD_ERR%)
    echo       Details: %CD%\%LOG%
    docker compose logs --tail=20 >> "%LOG%" 2>&1
    pause & exit /b 1
)
echo  [OK] Container gestartet.

:: 5. Auf Bereitschaft warten (PowerShell statt curl)
echo.
echo  [..] Warte auf Anwendung...
set VERSUCHE=0
:HEALTH_CHECK
set /a VERSUCHE+=1
powershell -NonInteractive -Command "try{$r=(Invoke-WebRequest 'http://localhost/api/v1/health' -UseBasicParsing -TimeoutSec 3 -EA Stop).StatusCode;exit ($r -ne 200)}catch{exit 1}" >nul 2>&1
if %errorlevel% equ 0 goto BEREIT
if %VERSUCHE% geq 80 goto TIMEOUT
<nul set /p "=  Versuch !VERSUCHE!/80..."
echo.
timeout /t 3 /nobreak >nul
goto HEALTH_CHECK

:TIMEOUT
echo  [!] Timeout -- App startet noch. Bitte http://localhost in 2 Min oeffnen.
goto BROWSER

:BEREIT
echo  [OK] Anwendung bereit!
echo %TIME% OK nach %VERSUCHE% Versuchen >> "%LOG%"

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
