@echo off
title Gutachten-Manager - Wird gestoppt...

echo.
echo  +----------------------------------------------------------+
echo  ^|       GUTACHTEN-MANAGER - STOPPEN                       ^|
echo  +----------------------------------------------------------+
echo.

cd /d "%~dp0"

echo  Stoppe alle Gutachten-Manager Container...
echo.
docker compose -f infrastructure\docker-compose.yml down

if %errorlevel% equ 0 (
    echo.
    echo  Gutachten-Manager wurde erfolgreich gestoppt.
    echo  Ihre Daten sind sicher gespeichert.
) else (
    echo.
    echo  Hinweis: Moeglicherweise lief die Anwendung nicht.
)

echo.
pause
