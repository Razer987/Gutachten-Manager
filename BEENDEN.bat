@echo off
chcp 65001 >nul 2>&1
title Gutachten-Manager — Wird gestoppt...
color 0C

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║          GUTACHTEN-MANAGER — STOPPEN                    ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo  Stoppe alle Gutachten-Manager Container...
echo.
docker compose -f infrastructure/docker-compose.yml down

if %errorlevel% equ 0 (
    echo.
    echo  ╔══════════════════════════════════════════════════════════╗
    echo  ║  Gutachten-Manager wurde erfolgreich gestoppt.          ║
    echo  ║  Ihre Daten sind sicher gespeichert.                    ║
    echo  ╚══════════════════════════════════════════════════════════╝
) else (
    echo.
    echo  Konnte nicht stoppen — moeglicherweise lief die Anwendung
    echo  nicht. Das ist kein Fehler.
)

echo.
pause
