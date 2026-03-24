@echo off
title Gutachten-Manager - Status

echo.
echo  +----------------------------------------------------------+
echo  ^|       GUTACHTEN-MANAGER - STATUS                        ^|
echo  +----------------------------------------------------------+
echo.

cd /d "%~dp0"

echo  Container-Status:
echo  ----------------------------------------------------------
docker compose -f infrastructure\docker-compose.yml ps
echo.

echo  Erreichbarkeit:
echo  ----------------------------------------------------------
curl -s --max-time 5 http://localhost/api/v1/health >nul 2>&1
if %errorlevel% equ 0 (
    echo   Anwendung: http://localhost  [ERREICHBAR]
) else (
    echo   Anwendung: http://localhost  [NICHT ERREICHBAR]
)
echo.

echo  Live-Logs (letzte 20 Zeilen):
echo  ----------------------------------------------------------
docker compose -f infrastructure\docker-compose.yml logs --tail=20
echo.
pause
