#Requires -Version 5.1
<#
.SYNOPSIS
    Gutachten-Manager CLI — Wartung und Verwaltung
.DESCRIPTION
    Verwaltungs-Tool fuer den Gutachten-Manager.

    Verwendung:
      .\gm.ps1 status          — Container-Status und Erreichbarkeit
      .\gm.ps1 logs [dienst]   — Live-Logs (Dienst: api, web, db, nginx)
      .\gm.ps1 start           — Anwendung starten
      .\gm.ps1 stop            — Anwendung stoppen
      .\gm.ps1 restart         — Neustart
      .\gm.ps1 rebuild         — Images neu bauen und starten
      .\gm.ps1 backup          — Datenbank sichern
      .\gm.ps1 restore [datei] — Datenbank wiederherstellen
      .\gm.ps1 update          — Auf neue Version aktualisieren
      .\gm.ps1 reset-db        — Datenbank zuruecksetzen (ACHTUNG: loescht alle Daten)
      .\gm.ps1 shell [dienst]  — Shell in Container (Standard: api)
      .\gm.ps1 help            — Diese Hilfe
#>

param(
    [Parameter(Position=0)] [string]$Befehl = 'help',
    [Parameter(Position=1)] [string]$Arg1   = ''
)

$ErrorActionPreference = 'Continue'
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

function Write-H($t)   { Write-Host "`n  $t" -ForegroundColor Cyan }
function Write-OK($t)  { Write-Host "  [OK] $t" -ForegroundColor Green }
function Write-ERR($t) { Write-Host "  [!!] $t" -ForegroundColor Red }
function Write-INF($t) { Write-Host "       $t" -ForegroundColor Gray }

function Assert-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-ERR "Docker nicht gefunden. Bitte Docker Desktop starten."
        exit 1
    }
    $null = docker ps 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-ERR "Docker laeuft nicht. Bitte Docker Desktop starten."
        exit 1
    }
}

switch ($Befehl.ToLower()) {

    # -------------------------------------------------------------------------
    'status' {
        Assert-Docker
        Write-H "Container-Status"
        docker compose ps
        Write-H "Erreichbarkeit"
        try {
            $r = Invoke-WebRequest "http://localhost/api/v1/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            $data = $r.Content | ConvertFrom-Json
            Write-OK "API erreichbar — Status: $($data.data.status)  Version: $($data.data.version)"
        } catch {
            Write-ERR "API nicht erreichbar (http://localhost/api/v1/health)"
        }
        try {
            $null = Invoke-WebRequest "http://localhost" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            Write-OK "Web erreichbar — http://localhost"
        } catch {
            Write-ERR "Web nicht erreichbar (http://localhost)"
        }
        Write-H "Ressourcen"
        docker stats --no-stream --format "  {{.Name}}: CPU {{.CPUPerc}}  RAM {{.MemUsage}}"
    }

    # -------------------------------------------------------------------------
    'logs' {
        Assert-Docker
        $svc = if ($Arg1) { $Arg1 } else { '' }
        Write-H "Logs$(if($svc){" — $svc"})"
        Write-INF "Ctrl+C zum Beenden"
        if ($svc) { docker compose logs -f --tail=50 $svc }
        else       { docker compose logs -f --tail=50 }
    }

    # -------------------------------------------------------------------------
    'start' {
        Assert-Docker
        Write-H "Starte Gutachten-Manager..."
        docker compose up -d
        if ($LASTEXITCODE -eq 0) { Write-OK "Gestartet. http://localhost" }
        else { Write-ERR "Fehler beim Starten. Logs: .\gm.ps1 logs" }
    }

    # -------------------------------------------------------------------------
    'stop' {
        Assert-Docker
        Write-H "Stoppe Gutachten-Manager..."
        docker compose down
        Write-OK "Gestoppt. Daten bleiben erhalten."
    }

    # -------------------------------------------------------------------------
    'restart' {
        Assert-Docker
        Write-H "Neustart..."
        docker compose restart
        Write-OK "Neugestartet."
    }

    # -------------------------------------------------------------------------
    'rebuild' {
        Assert-Docker
        Write-H "Baue Images neu und starte..."
        Write-INF "Kann 5-15 Minuten dauern."
        docker compose up --build -d
        if ($LASTEXITCODE -eq 0) { Write-OK "Fertig. http://localhost" }
        else { Write-ERR "Fehler. Logs: .\gm.ps1 logs" }
    }

    # -------------------------------------------------------------------------
    'backup' {
        Assert-Docker
        $ts      = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
        $backDir = "$Root\backups"
        New-Item -ItemType Directory -Path $backDir -Force | Out-Null
        $file = "$backDir\gutachten_backup_$ts.sql.gz"

        Write-H "Datenbank-Backup"
        Write-INF "Ziel: $file"

        docker compose exec -T db sh -c `
            "pg_dump -U `${POSTGRES_USER:-gutachten_user} `${POSTGRES_DB:-gutachten_manager} | gzip" `
            > $file

        if ($LASTEXITCODE -eq 0 -and (Test-Path $file)) {
            $size = [math]::Round((Get-Item $file).Length / 1KB, 1)
            Write-OK "Backup erstellt: $file ($size KB)"
        } else {
            Write-ERR "Backup fehlgeschlagen."
            Remove-Item $file -Force -ErrorAction SilentlyContinue
        }
    }

    # -------------------------------------------------------------------------
    'restore' {
        Assert-Docker
        $file = if ($Arg1) { $Arg1 } else {
            # Neueste Backup-Datei verwenden
            $latest = Get-ChildItem "$Root\backups\*.sql.gz" -ErrorAction SilentlyContinue |
                      Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($latest) { $latest.FullName } else { $null }
        }

        if (-not $file -or -not (Test-Path $file)) {
            Write-ERR "Keine Backup-Datei gefunden."
            Write-INF "Verwendung: .\gm.ps1 restore pfad\zur\datei.sql.gz"
            Write-INF "Oder: .\gm.ps1 backup um ein Backup zu erstellen."
            exit 1
        }

        Write-H "Datenbank-Wiederherstellung"
        Write-INF "Quelle: $file"
        Write-Host ""
        $confirm = Read-Host "  ACHTUNG: Aktuelle Daten werden ueberschrieben. Weiter? (ja/nein)"
        if ($confirm -ne 'ja') { Write-INF "Abgebrochen."; exit 0 }

        Get-Content $file -AsByteStream -Raw |
            docker compose exec -T db sh -c `
            "gunzip | psql -U `${POSTGRES_USER:-gutachten_user} `${POSTGRES_DB:-gutachten_manager}"

        if ($LASTEXITCODE -eq 0) { Write-OK "Wiederherstellung erfolgreich." }
        else { Write-ERR "Wiederherstellung fehlgeschlagen." }
    }

    # -------------------------------------------------------------------------
    'update' {
        Assert-Docker
        Write-H "Update Gutachten-Manager"

        $updateZip = "$Root\update.zip"
        if (-not (Test-Path $updateZip)) {
            Write-ERR "Keine update.zip gefunden."
            Write-INF "Legen Sie die neue Version als '$Root\update.zip' ab und fuehren Sie"
            Write-INF "diesen Befehl erneut aus."
            exit 1
        }

        # Backup vor Update
        Write-INF "Erstelle automatisches Backup vor dem Update..."
        & "$PSScriptRoot\gm.ps1" backup

        # Container stoppen
        Write-INF "Stoppe Container..."
        docker compose down

        # Alte Dateien sichern
        $bakDir = "$Root-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Write-INF "Sichere aktuelle Installation nach $bakDir..."
        Copy-Item $Root $bakDir -Recurse -Force

        # Neue Version entpacken
        Write-INF "Entpacke neue Version..."
        Add-Type -Assembly System.IO.Compression.FileSystem
        $zip = [IO.Compression.ZipFile]::OpenRead($updateZip)
        $top = ($zip.Entries[0].FullName -split '/')[0]
        $zip.Dispose()

        $tmpEx = "$env:TEMP\gm_update_$(Get-Random)"
        Expand-Archive -Path $updateZip -DestinationPath $tmpEx -Force
        Get-ChildItem (Join-Path $tmpEx $top) | Copy-Item -Destination $Root -Recurse -Force

        Remove-Item $tmpEx -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item $updateZip -Force

        # Neu bauen
        Write-INF "Baue neue Version..."
        docker compose up --build -d

        if ($LASTEXITCODE -eq 0) { Write-OK "Update erfolgreich. http://localhost" }
        else { Write-ERR "Update-Build fehlgeschlagen. Logs: .\gm.ps1 logs" }
    }

    # -------------------------------------------------------------------------
    'reset-db' {
        Assert-Docker
        Write-H "Datenbank zuruecksetzen"
        Write-ERR "ACHTUNG: Alle Daten werden unwiderruflich geloescht!"
        Write-Host ""
        $c1 = Read-Host "  Sind Sie sicher? (ja/nein)"
        if ($c1 -ne 'ja') { Write-INF "Abgebrochen."; exit 0 }
        $c2 = Read-Host "  Wirklich alle Daten loeschen? (LOESCHEN/nein)"
        if ($c2 -ne 'LOESCHEN') { Write-INF "Abgebrochen."; exit 0 }

        Write-INF "Stoppe Container und loesche Datenbank-Volume..."
        docker compose down -v
        Write-INF "Starte neu..."
        docker compose up -d
        Write-OK "Datenbank zurueckgesetzt. Tabellen werden beim Neustart neu angelegt."
    }

    # -------------------------------------------------------------------------
    'shell' {
        Assert-Docker
        $svc = if ($Arg1) { $Arg1 } else { 'api' }
        Write-H "Shell in Container: $svc"
        Write-INF "Tippen Sie 'exit' zum Beenden."
        docker compose exec $svc sh
    }

    # -------------------------------------------------------------------------
    default {
        Write-Host ""
        Write-Host "  GUTACHTEN-MANAGER CLI" -ForegroundColor Cyan
        Write-Host "  ─────────────────────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "  Verwendung: .\maintenance\gm.ps1 <befehl> [option]" -ForegroundColor White
        Write-Host ""
        Write-Host "  Betrieb:" -ForegroundColor Yellow
        Write-Host "    status              Container-Status und Erreichbarkeit"
        Write-Host "    start               Anwendung starten"
        Write-Host "    stop                Anwendung stoppen"
        Write-Host "    restart             Container neu starten"
        Write-Host "    rebuild             Images neu bauen (nach Updates)"
        Write-Host "    logs [dienst]       Live-Logs (api / web / db / nginx)"
        Write-Host "    shell [dienst]      Shell in Container (Standard: api)"
        Write-Host ""
        Write-Host "  Daten:" -ForegroundColor Yellow
        Write-Host "    backup              Datenbank sichern  -> .\backups\"
        Write-Host "    restore [datei]     Datenbank wiederherstellen"
        Write-Host "    reset-db            Datenbank loeschen (ALLE Daten weg!)"
        Write-Host ""
        Write-Host "  Updates:" -ForegroundColor Yellow
        Write-Host "    update              Neue Version einspielen (update.zip)"
        Write-Host ""
    }
}
