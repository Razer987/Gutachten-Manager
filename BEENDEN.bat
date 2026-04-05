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
color 0C
echo.
echo  ============================================================
echo   GUTACHTEN-MANAGER  ^|  Wird gestoppt...
echo  ============================================================
echo.
echo  Stoppe alle Container...
echo.

docker compose -f infrastructure\docker-compose.yml down

if %errorlevel% equ 0 (
    color 0A
    echo.
    echo  [OK] Gutachten-Manager wurde gestoppt.
    echo  Ihre Daten sind sicher gespeichert.
) else (
    echo.
    echo  Hinweis: Anwendung lief moeglicherweise nicht.
)

echo.
echo  Druecken Sie eine beliebige Taste zum Schliessen.
pause >nul
