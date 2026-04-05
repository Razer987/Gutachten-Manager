@echo off
setlocal

:: Fenster offen halten wenn per Doppelklick gestartet
echo %CMDCMDLINE% | findstr /i "/c " >nul 2>&1
if %errorlevel% equ 0 (
    cmd /K ""%~f0""
    exit /b
)

cd /d "%~dp0"
cls
color 0B
echo.
echo  ============================================================
echo   GUTACHTEN-MANAGER  ^|  Status-Uebersicht
echo  ============================================================
echo.

echo  Container-Status:
echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
docker compose -f infrastructure\docker-compose.yml ps
echo.

echo  Erreichbarkeit:
echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
curl -s --max-time 5 http://localhost/api/v1/health >nul 2>&1
if %errorlevel% equ 0 (
    color 0A
    echo   [OK]     http://localhost          ERREICHBAR
    echo   [OK]     http://localhost/api/v1   ERREICHBAR
) else (
    color 0C
    echo   [--]     http://localhost          NICHT ERREICHBAR
)
color 0B
echo.

echo  Live-Logs (letzte 30 Zeilen):
echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
docker compose -f infrastructure\docker-compose.yml logs --tail=30
echo.
echo  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
echo  Druecken Sie eine beliebige Taste zum Schliessen.
pause >nul
