# scripts/ — Verwaltungs-Skripte

Dieser Ordner enthält **Shell-Skripte** für Installation, Updates, Backups
und andere Verwaltungsaufgaben.

## Verfügbare Skripte

| Skript              | Beschreibung                                              |
|---------------------|-----------------------------------------------------------|
| `install.sh`        | **Erstinstallation** — einmalig auf neuem System ausführen |
| `apply-patches.sh`  | **Updates anwenden** — alle neuen Patches installieren    |
| `update.sh`         | **System updaten** — Git Pull + Patches + Neustart        |
| `backup.sh`         | **Backup erstellen** — Daten sichern (manuell)           |
| `restore.sh`        | **Backup wiederherstellen** — aus Backup-Datei           |
| `test-all.sh`       | **Alle Tests ausführen** — Unit, Integration, E2E        |

## Verwendung

### Erstinstallation (einmalig)
```bash
./scripts/install.sh
```
Prüft Systemvoraussetzungen (Docker, Node.js, pnpm), richtet Umgebungsvariablen
ein und führt den ersten Start durch.

### System auf neuesten Stand bringen
```bash
./scripts/update.sh
```
Zieht neue Version aus Git, wendet alle ausstehenden Patches an und startet
den Server neu.

### Nur Patches anwenden (ohne Git Pull)
```bash
./scripts/apply-patches.sh
```

### Manuelles Backup
```bash
./scripts/backup.sh
# Erstellt: backups/backup-2026-03-23-14-30-00.tar.gz
```

### Backup wiederherstellen
```bash
./scripts/restore.sh backups/backup-2026-03-23-14-30-00.tar.gz
```

### Alle Tests ausführen
```bash
./scripts/test-all.sh
```

## Systemvoraussetzungen

| Software       | Mindestversion | Prüfbefehl          |
|----------------|----------------|---------------------|
| Docker         | 24.0           | `docker --version`  |
| Docker Compose | 2.20           | `docker compose version` |
| Node.js        | 20.0           | `node --version`    |
| pnpm           | 9.0            | `pnpm --version`    |
| Git            | 2.40           | `git --version`     |
