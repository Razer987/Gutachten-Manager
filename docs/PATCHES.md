# Patch-System — Gutachten-Manager

> Das Patch-System ermöglicht es, Updates sauber und nachvollziehbar
> auf bestehende Installationen anzuwenden — ohne alles neu zu installieren.

---

## Konzept

Jede neue Version oder Verbesserung wird als nummerierte **Patch-Datei**
ausgeliefert. Patches werden fortlaufend nummeriert und bauen aufeinander auf.

```
patches/
├── 0001-monorepo-grundstruktur.patch     ← Patch 1 (Basis)
├── 0002-shared-packages.patch            ← Patch 2 (baut auf 1 auf)
├── 0003-docker-infrastructure.patch      ← Patch 3
├── ...
└── applied.log                           ← Lokales Protokoll (nicht in Git)
```

---

## Patches anwenden

### Alle ausstehenden Patches anwenden (Standard)

```bash
./scripts/apply-patches.sh
```

**Ausgabe-Beispiel:**
```
Gutachten-Manager — Patch-System
================================
✓ 0001-monorepo-grundstruktur: bereits angewendet
✓ 0002-shared-packages: bereits angewendet
→ 0003-docker-infrastructure: wird angewendet...
  OK
→ 0004-patch-system-scripts: wird angewendet...
  OK
================================
✓ 2 neue Patches angewendet. System ist aktuell.
```

### System komplett updaten (empfohlen)

```bash
./scripts/update.sh
```

Führt nacheinander aus:
1. `git pull` — neueste Version holen
2. `pnpm install` — neue Abhängigkeiten installieren
3. `./scripts/apply-patches.sh` — Patches anwenden
4. `pnpm db:migrate` — Datenbankmigrationen
5. `docker compose restart api web` — Server neu starten

---

## Patch-Dateinamen

Format: `<NUMMER>-<beschreibung>.patch`

| Teil          | Beschreibung                              | Beispiel                    |
|---------------|-------------------------------------------|-----------------------------|
| `<NUMMER>`    | 4-stellig, führende Nullen                | `0001`, `0042`, `0100`      |
| `<beschreibung>` | Kurze Beschreibung, Bindestriche      | `pdf-export-vorlage`        |

Vollständige Beispiele:
- `0001-monorepo-grundstruktur.patch`
- `0015-pdf-export-vorlage.patch`
- `0023-bugfix-aktenzeichen-duplikat.patch`

---

## applied.log

Die Datei `patches/applied.log` wird automatisch vom Patch-Skript verwaltet.
Sie speichert welche Patches bereits auf diesem System angewendet wurden.

**Format:**
```
0001-monorepo-grundstruktur 2026-03-23T14:30:00
0002-shared-packages 2026-03-23T14:31:15
0003-docker-infrastructure 2026-03-23T14:32:00
```

**Wichtig:**
- Diese Datei ist in `.gitignore` — sie ist lokal und wird nicht geteilt
- Nicht manuell bearbeiten
- Falls sie gelöscht wird: Patches werden erneut angewendet (unkritisch)

---

## Was passiert bei einem Fehler?

Wenn ein Patch fehlschlägt:

1. Das Skript stoppt sofort
2. Der fehlgeschlagene Patch wird **nicht** in `applied.log` eingetragen
3. Fehlermeldung wird angezeigt

**Typische Ursachen:**
- Lokale Änderungen an versionierten Dateien
- Dateikonflikt

**Lösung:**
```bash
# Lokale Änderungen temporär sichern
git stash

# Patches anwenden
./scripts/apply-patches.sh

# Gesicherte Änderungen wiederherstellen
git stash pop
```

---

## Für Entwickler: Patches erstellen

Nach Abschluss eines Features:

```bash
# Alle Commits seit dem letzten Tag als Patch exportieren
git format-patch v<letzte-version> --stdout > patches/000X-feature-name.patch

# Beispiel: Patch 0015 für PDF-Export-Feature
git format-patch HEAD~3 --stdout > patches/0015-pdf-export-vorlage.patch
```

**Checkliste vor dem Erstellen eines Patches:**
- [ ] Alle Tests bestanden (`./scripts/test-all.sh`)
- [ ] Lint fehlerfrei (`pnpm lint`)
- [ ] TypeScript-Check fehlerfrei (`pnpm typecheck`)
- [ ] MASTER_LOG.md aktualisiert
- [ ] Patch-Dateiname korrekt nummeriert

---

## Patch-Index

| Patch | Datei                                  | Beschreibung                        |
|-------|----------------------------------------|-------------------------------------|
| 0001  | `0001-monorepo-grundstruktur.patch`    | Monorepo-Grundstruktur              |
| 0002  | `0002-shared-packages.patch`           | Shared Packages (DB, Types, Config) |
| 0003  | `0003-docker-infrastructure.patch`     | Docker & Infrastructure             |
| 0004  | `0004-patch-system-scripts.patch`      | Patch-System & Shell-Skripte        |
| 0005  | `0005-api-grundgeruest.patch`          | Express API Grundgerüst             |
| 0006  | `0006-frontend-grundgeruest.patch`     | Next.js Frontend Grundgerüst        |
| 0007  | `0007-gutachten-api-db.patch`          | Gutachten-Modul (API + Datenbank)   |
| 0008  | `0008-gutachten-frontend.patch`        | Gutachten-Modul (Frontend)          |
| 0009  | `0009-crm-kundenverwaltung.patch`      | CRM Kundenverwaltung                |
| 0010  | `0010-unfalldaten.patch`               | Unfalldaten-Modul                   |
| 0011  | `0011-datei-upload-editor.patch`       | Datei-Upload & Foto-Editor          |
| 0012  | `0012-schadensberechnung.patch`        | Schadensberechnung (Einzelposten)   |
| 0013  | `0013-dashboard-charts.patch`          | Dashboard mit Charts & KPIs         |
| 0014  | `0014-kalender.patch`                  | Kalender & Terminverwaltung         |
| 0015  | `0015-pdf-export.patch`                | PDF-Export mit Vorlage              |
| 0016  | `0016-notizen-aufgaben-audit.patch`    | Notizen, Aufgaben, Audit-Log        |
| 0017  | `0017-volltextsuche.patch`             | Volltextsuche                       |
| 0018  | `0018-admin-panel.patch`               | Admin-Panel                         |
| 0019  | `0019-backup-system.patch`             | Automatisches Backup-System         |
| 0020  | `0020-tests-vollstaendig.patch`        | Vollständige Test-Suite             |
