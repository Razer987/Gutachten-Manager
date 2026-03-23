# Installationsanleitung — Gutachten-Manager

> **Für wen ist diese Anleitung?**
> Für jeden der den Gutachten-Manager zum ersten Mal auf einem neuen System
> installieren möchte — egal ob Entwickler oder Administrator.

---

## Inhaltsverzeichnis

1. [Systemvoraussetzungen](#1-systemvoraussetzungen)
2. [Schnellinstallation (empfohlen)](#2-schnellinstallation)
3. [Manuelle Installation (Schritt für Schritt)](#3-manuelle-installation)
4. [Konfiguration](#4-konfiguration)
5. [Erster Start](#5-erster-start)
6. [System updaten](#6-system-updaten)
7. [Häufige Probleme](#7-häufige-probleme)

---

## 1. Systemvoraussetzungen

Folgende Software muss **vor der Installation** vorhanden sein:

| Software       | Mindestversion | Download                              |
|----------------|----------------|---------------------------------------|
| Docker         | 24.0           | https://docs.docker.com/get-docker/   |
| Docker Compose | 2.20           | (Teil von Docker Desktop)             |
| Git            | 2.40           | https://git-scm.com/downloads         |
| Node.js        | 20.0 LTS       | https://nodejs.org/                   |
| pnpm           | 9.0            | `npm install -g pnpm`                 |

### Versionen prüfen

```bash
docker --version          # Docker version 24.x.x
docker compose version    # Docker Compose version v2.x.x
git --version             # git version 2.4x.x
node --version            # v20.x.x
pnpm --version            # 9.x.x
```

---

## 2. Schnellinstallation (empfohlen)

```bash
# 1. Repository klonen
git clone <repository-url> gutachten-manager
cd gutachten-manager

# 2. Automatische Installation ausführen
./scripts/install.sh
```

Das Skript erledigt alle folgenden Schritte automatisch.

---

## 3. Manuelle Installation (Schritt für Schritt)

Falls die automatische Installation fehlschlägt, hier die manuelle Variante:

### Schritt 1: Repository klonen

```bash
git clone <repository-url> gutachten-manager
cd gutachten-manager
```

### Schritt 2: Umgebungsvariablen einrichten

```bash
# Vorlage kopieren
cp .env.example .env

# Datei bearbeiten und alle Werte eintragen
nano .env    # oder: code .env, vim .env
```

**Mindestens diese Werte müssen gesetzt werden:**
- `DATABASE_USER` — Datenbankbenutzername (z.B. `gutachten_user`)
- `DATABASE_PASSWORD` — Sicheres Passwort (mind. 16 Zeichen)

### Schritt 3: Abhängigkeiten installieren

```bash
pnpm install
```

### Schritt 4: Docker-Container starten

```bash
# Nur die Datenbank starten (für Migrationen)
docker compose up -d db

# Warten bis PostgreSQL bereit ist (ca. 10 Sekunden)
sleep 10
```

### Schritt 5: Datenbankmigrationen ausführen

```bash
pnpm db:migrate
```

### Schritt 6: Alle Container starten

```bash
docker compose up -d
```

### Schritt 7: Patches anwenden

```bash
./scripts/apply-patches.sh
```

---

## 4. Konfiguration

Alle Konfigurationsoptionen sind in der `.env` Datei.
Die vollständige Beschreibung aller Variablen findet sich in `.env.example`.

### Wichtigste Einstellungen

```env
# Datenbankverbindung
DATABASE_USER=gutachten_user
DATABASE_PASSWORD=sicheres_passwort_hier

# API-Port (Standard: 4000)
API_PORT=4000

# Frontend-Port (Standard: 3000)
NEXT_PUBLIC_PORT=3000

# Log-Level (info = normal, debug = sehr ausführlich)
LOG_LEVEL=info
```

---

## 5. Erster Start

Nach erfolgreicher Installation:

```bash
docker compose up -d
```

Die Anwendung ist erreichbar unter:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:4000/api/v1/
- **API Health-Check:** http://localhost:4000/api/v1/health

### Status prüfen

```bash
docker compose ps
# Alle Container sollten "healthy" oder "running" sein
```

---

## 6. System updaten

```bash
./scripts/update.sh
```

Dieser Befehl:
1. Zieht die neueste Version aus Git
2. Wendet alle neuen Patches an
3. Führt Datenbankmigrationen aus
4. Startet die Container neu

---

## 7. Häufige Probleme

### Problem: Port bereits belegt

```
Error: bind: address already in use
```

**Lösung:** Port in `.env` ändern oder belassenden Prozess beenden:
```bash
lsof -i :3000    # Wer belegt Port 3000?
kill -9 <PID>    # Prozess beenden
```

### Problem: Datenbankverbindung fehlgeschlagen

```
Error: Can't reach database server
```

**Lösung:**
```bash
# Ist die Datenbank gestartet?
docker compose ps db

# Container-Logs prüfen
docker compose logs db
```

### Problem: Patch-Anwendung fehlgeschlagen

```
Error: patch does not apply
```

**Lösung:** Lokale Änderungen sichern, dann:
```bash
git stash
./scripts/apply-patches.sh
git stash pop
```

### Problem: pnpm install schlägt fehl

```bash
# Node.js Version prüfen (muss >= 20 sein)
node --version

# pnpm Cache leeren
pnpm store prune
pnpm install
```

---

## Entwicklungsumgebung (für Entwickler)

```bash
# Entwicklungsmodus mit Hot-Reload starten
docker compose -f docker-compose.dev.yml up

# Oder ohne Docker (schneller für Entwicklung):
pnpm dev
```

Empfohlene VS Code Extensions:
- Prisma
- ESLint
- Prettier
- Docker
- GitLens
