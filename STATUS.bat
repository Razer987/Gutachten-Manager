@echo off
setlocal

:: Fenster offen halten wenn per Doppelklick gestartet
echo %CMDCMDLINE% | findstr /i "/c " >nul 2>&1
if %errorlevel% equ 0 (
    cmd /K ""%~f0""
    exit /b
)

cd /d "%~dp0"
if not exist "logs" mkdir logs
set LOG_STATUS=logs\status-aktuell.log

(
    echo ================================================================
    echo  GUTACHTEN-MANAGER -- Status-Protokoll
    echo  Datum: %DATE%   Zeit: %TIME%
    echo ================================================================
    echo.
) > "%LOG_STATUS%"

cls
color 0B
echo.
echo  ============================================================
echo   GUTACHTEN-MANAGER  ^|  Status-Uebersicht
echo  ============================================================
echo.

echo  Container-Status:
echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
docker compose --project-directory . -f infrastructure\docker-compose.yml ps
docker compose --project-directory . -f infrastructure\docker-compose.yml ps >> "%LOG_STATUS%" 2>&1
echo.

echo  Erreichbarkeit:
echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
curl -s --max-time 5 http://localhost/api/v1/health >nul 2>&1
if %errorlevel% equ 0 (
    color 0A
    echo   [OK]  http://localhost          ERREICHBAR
    echo   [OK]  ERREICHBAR >> "%LOG_STATUS%"
) else (
    color 0C
    echo   [!!]  http://localhost          NICHT ERREICHBAR
    echo   [!!]  NICHT ERREICHBAR >> "%LOG_STATUS%"
)
color 0B
echo.

echo  Ressourcen-Verbrauch:
echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
docker stats --no-stream --format "  {{.Name}}: CPU {{.CPUPerc}}  RAM {{.MemUsage}}" 2>&1
docker stats --no-stream --format "  {{.Name}}: CPU {{.CPUPerc}}  RAM {{.MemUsage}}" >> "%LOG_STATUS%" 2>&1
echo.

echo  Letzte Log-Eintraege (30 Zeilen):
echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
docker compose --project-directory . -f infrastructure\docker-compose.yml logs --tail=30 2>&1
docker compose --project-directory . -f infrastructure\docker-compose.yml logs --tail=30 >> "%LOG_STATUS%" 2>&1
echo.

echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
echo.
echo  Logdatei:  %CD%\%LOG_STATUS%
echo.
echo  Druecken Sie eine beliebige Taste zum Schliessen.
pause >nul
