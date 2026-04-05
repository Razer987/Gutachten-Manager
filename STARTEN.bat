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

:: Ins Projektverzeichnis wechseln
cd /d "%~dp0"

:: =============================================================================
:: LOG-DATEI einrichten
:: Speichert alle Ausgaben nach logs\starten-DATUM-UHRZEIT.log
:: =============================================================================

if not exist "logs" mkdir logs

:: Zeitstempel fuer Dateiname (YYYY-MM-DD_HH-MM-SS)
for /f "tokens=1-3 delims=." %%a in ("%DATE%") do (
    set LOG_DATUM=%%c-%%b-%%a
)
for /f "tokens=1-3 delims=:," %%a in ("%TIME: =0%") do (
    set LOG_ZEIT=%%a-%%b-%%c
)
set LOG_ZEIT=%LOG_ZEIT:~0,8%
set LOG_DATEI=logs\starten-%LOG_DATUM%_%LOG_ZEIT%.log

:: Letzte Log-Datei auch immer als "starten-aktuell.log" speichern (leicht zu finden)
set LOG_AKTUELL=logs\starten-aktuell.log

:: Log-Header schreiben
call :LOG_INIT

:: =============================================================================
:: HEADER
:: =============================================================================
cls
color 0A
call :ECHO  "============================================================"
call :ECHO  " GUTACHTEN-MANAGER  |  Version 2026.03.1"
call :ECHO  "============================================================"
call :ECHO  ""
call :LOG   "Startvorgang begonnen"
call :LOG   "Betriebssystem: %OS%"
call :LOG   "Verzeichnis:    %CD%"

:: =============================================================================
:: SCHRITT 1: Docker pruefen
:: =============================================================================
call :ECHO  "[SCHRITT 1/5]  Docker pruefen..."
call :ECHO  "-------------------------------------------------------"

set DOCKER_OK=0

where docker >nul 2>&1
if %errorlevel% equ 0 set DOCKER_OK=1

if %DOCKER_OK% equ 0 (
    if exist "C:\Program Files\Docker\Docker\resources\bin\docker.exe" (
        set "PATH=%PATH%;C:\Program Files\Docker\Docker\resources\bin"
        set DOCKER_OK=1
        call :LOG "Docker gefunden: C:\Program Files\Docker\Docker\resources\bin"
    )
)

if %DOCKER_OK% equ 0 (
    call :LOG "FEHLER: Docker nicht gefunden"
    color 0C
    echo.
    call :ECHO  "[FEHLER] Docker wurde nicht gefunden!"
    call :ECHO  ""
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
    call :ECHO  "Docker ist installiert, aber noch nicht gestartet."
    call :ECHO  "Starte Docker Desktop automatisch..."
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" >nul 2>&1
    call :ECHO  ""
    call :ECHO  "Bitte warten Sie bis das Wal-Symbol in der Taskleiste"
    call :ECHO  "erscheint (ca. 30 Sekunden), dann starten Sie STARTEN.bat erneut."
    call :ECHO  ""
    call :ECHO_LOGHINWEIS
    pause >nul
    exit /b 1
)

:: Docker-Version ins Log schreiben
for /f "tokens=*" %%v in ('docker --version 2^>^&1') do call :LOG "Docker-Version: %%v"
for /f "tokens=*" %%v in ('docker compose version 2^>^&1') do call :LOG "Compose-Version: %%v"

call :ECHO  "[OK] Docker laeuft."
call :ECHO  ""

:: =============================================================================
:: SCHRITT 2: Konfiguration pruefen
:: =============================================================================
call :ECHO  "[SCHRITT 2/5]  Konfiguration pruefen..."
call :ECHO  "-------------------------------------------------------"

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul 2>&1
        call :ECHO  "[OK] .env wurde aus .env.example erstellt."
        call :LOG   ".env aus .env.example erstellt"
    ) else (
        call :LOG "FEHLER: Keine .env und keine .env.example gefunden"
        color 0C
        call :ECHO  ""
        call :ECHO  "[FEHLER] Keine .env Datei gefunden!"
        call :ECHO  "Bitte stellen Sie sicher, dass Sie das Archiv"
        call :ECHO  "vollstaendig entpackt haben."
        call :ECHO  ""
        call :ECHO_LOGHINWEIS
        pause >nul
        exit /b 1
    )
) else (
    call :ECHO  "[OK] .env vorhanden."
    call :LOG   ".env vorhanden"
)

:: Wichtige .env Werte ins Log schreiben (ohne Passwoerter)
for /f "tokens=1 delims==" %%k in (.env) do (
    echo %%k | findstr /i "PORT HOST NODE_ENV" >nul 2>&1
    if !errorlevel! equ 0 (
        for /f "tokens=1,2 delims==" %%a in (.env) do (
            if "%%a"=="%%k" call :LOG "  Konfiguration: %%a=%%b"
        )
    )
)
call :ECHO  ""

:: =============================================================================
:: SCHRITT 3: Alte Container bereinigen
:: =============================================================================
call :ECHO  "[SCHRITT 3/5]  Alte Container bereinigen..."
call :ECHO  "-------------------------------------------------------"
call :LOG   "Starte: docker compose down"
docker compose -f infrastructure\docker-compose.yml down --remove-orphans >> "%LOG_AKTUELL%" 2>&1
docker compose -f infrastructure\docker-compose.yml down --remove-orphans >nul 2>&1
call :ECHO  "[OK] Bereinigt."
call :ECHO  ""

:: =============================================================================
:: SCHRITT 4: Container bauen und starten
:: =============================================================================
call :ECHO  "[SCHRITT 4/5]  Container starten..."
call :ECHO  "-------------------------------------------------------"
call :ECHO  ""

docker image inspect gutachten-manager-api >nul 2>&1
if %errorlevel% equ 0 (
    call :ECHO  "   Bekannte Images gefunden -- schneller Start (~30s)"
    call :LOG   "Images vorhanden: Folgestart"
) else (
    call :ECHO  "   Erster Start -- Images werden gebaut (~5-15 Minuten)"
    call :ECHO  "   Bitte haben Sie Geduld..."
    call :LOG   "Images fehlen: Erststart, Build noetig"
)
call :ECHO  ""
call :ECHO  "   Docker-Ausgabe (wird auch in Logdatei gespeichert):"
call :ECHO  "   - - - - - - - - - - - - - - - - - - - - - - - - -"

call :LOG   "Starte: docker compose up --build -d"

:: Docker-Output gleichzeitig auf Konsole UND in Logdatei (via PowerShell Tee)
powershell -Command "& { $p = Start-Process -FilePath 'docker' -ArgumentList 'compose','-f','infrastructure\docker-compose.yml','up','--build','-d' -NoNewWindow -Wait -PassThru -RedirectStandardOutput '%TEMP%\gm_out.txt' -RedirectStandardError '%TEMP%\gm_err.txt'; Get-Content '%TEMP%\gm_out.txt','%TEMP%\gm_err.txt' | Tee-Object -FilePath '%LOG_AKTUELL%' -Append; exit $p.ExitCode }"
set BUILD_EXIT=%errorlevel%

:: Output nochmal auf Konsole zeigen (war wegen Redirect nicht sichtbar)
if exist "%TEMP%\gm_out.txt" type "%TEMP%\gm_out.txt"
if exist "%TEMP%\gm_err.txt" type "%TEMP%\gm_err.txt"

call :ECHO  "   - - - - - - - - - - - - - - - - - - - - - - - - -"

if %BUILD_EXIT% neq 0 (
    call :LOG "FEHLER: docker compose up fehlgeschlagen (Exit %BUILD_EXIT%)"
    color 0C
    call :ECHO  ""
    call :ECHO  "[FEHLER] Docker Compose ist fehlgeschlagen!"
    call :ECHO  ""
    call :ECHO  "Container-Logs werden in Logdatei geschrieben..."
    docker compose -f infrastructure\docker-compose.yml logs --tail=50 >> "%LOG_AKTUELL%" 2>&1
    call :ECHO  ""
    call :ECHO  "Tipps zur Fehlerbehebung:"
    call :ECHO  "  - Port 80 belegt?   Andere App auf Port 80 beenden."
    call :ECHO  "  - Port 5432 belegt? Lokales PostgreSQL beenden."
    call :ECHO  "  - Antivirus?        Projektordner als Ausnahme hinzufuegen."
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
:: SCHRITT 5: Warten bis App bereit ist
:: =============================================================================
call :ECHO  "[SCHRITT 5/5]  Warte bis Anwendung bereit ist..."
call :ECHO  "-------------------------------------------------------"
call :ECHO  ""
call :LOG   "Warte auf Health-Check http://localhost/api/v1/health"

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
    call :ECHO  ""
    call :ECHO  "[WARNUNG] Timeout -- App antwortet noch nicht."
    call :ECHO  "Moegliche Ursache: Datenbank-Migration laeuft noch."
    call :ECHO  "Bitte http://localhost in 1-2 Minuten manuell oeffnen."
    call :ECHO  ""
    docker compose -f infrastructure\docker-compose.yml logs --tail=30 >> "%LOG_AKTUELL%" 2>&1
    goto OEFFNE_BROWSER
)

timeout /t 3 >nul 2>&1
goto WARTE_SCHLEIFE

:BEREIT
call :LOG "Health-Check erfolgreich nach %VERSUCHE% Versuchen"
call :ECHO  ""
call :ECHO  ""
call :ECHO  "[OK] Anwendung ist bereit! (nach %VERSUCHE% Versuchen)"
call :ECHO  ""

:OEFFNE_BROWSER
call :ECHO  "Browser wird geoeffnet..."
call :LOG   "Oeffne http://localhost im Browser"
timeout /t 1 >nul 2>&1
start "" "http://localhost"

:: Container-Status ins Log schreiben
docker compose -f infrastructure\docker-compose.yml ps >> "%LOG_AKTUELL%" 2>&1

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
call :ECHO  "  Adresse:   http://localhost"
call :ECHO  "  API:       http://localhost/api/v1"
call :ECHO  ""
call :ECHO  "  STOPPEN:   Doppelklick auf  BEENDEN.bat"
call :ECHO  "  STATUS:    Doppelklick auf  STATUS.bat"
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

:LOG_INIT
    (
        echo ================================================================
        echo  GUTACHTEN-MANAGER — Startprotokoll
        echo  Datum:  %DATE%
        echo  Zeit:   %TIME%
        echo  Datei:  %~f0
        echo ================================================================
        echo.
    ) > "%LOG_AKTUELL%"
    copy "%LOG_AKTUELL%" "%LOG_DATEI%" >nul 2>&1
    goto :EOF

:LOG
    :: Schreibt eine Zeile mit Zeitstempel in die Logdatei
    echo [%TIME%] %~1 >> "%LOG_AKTUELL%"
    copy "%LOG_AKTUELL%" "%LOG_DATEI%" >nul 2>&1
    goto :EOF

:ECHO
    :: Gibt eine Zeile auf Konsole aus UND schreibt sie ins Log
    echo  %~1
    echo [%TIME%] %~1 >> "%LOG_AKTUELL%"
    copy "%LOG_AKTUELL%" "%LOG_DATEI%" >nul 2>&1
    goto :EOF

:ECHO_LOGHINWEIS
    echo.
    echo  -------------------------------------------------------
    echo  Logdatei fuer Fehleranalyse:
    echo    %CD%\%LOG_AKTUELL%
    echo  -------------------------------------------------------
    echo.
    goto :EOF
