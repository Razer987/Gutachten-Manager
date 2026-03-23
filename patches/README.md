# patches/ — Update-Patch-System

Dieser Ordner enthält alle **nummerierten Update-Patches** für den Gutachten-Manager.

## Was ist ein Patch?

Ein Patch ist eine Datei die Code-Änderungen in einem standardisierten Format
(Git Patch Format) enthält. Wenn eine neue Version des Gutachten-Managers
veröffentlicht wird, werden die Änderungen als Patch-Datei ausgeliefert.

## Dateistruktur

```
patches/
├── 0001-monorepo-grundstruktur.patch    # Patch 1: Grundstruktur
├── 0002-shared-packages.patch          # Patch 2: Gemeinsame Pakete
├── 0003-docker-infrastructure.patch    # Patch 3: Docker-Setup
├── ...
├── applied.log                         # Welche Patches wurden angewendet (LOKAL)
└── README.md                           # Diese Datei
```

**Wichtig:** `applied.log` wird NICHT in Git gespeichert — sie ist lokal
und speichert welche Patches auf DIESEM System bereits angewendet wurden.

## Patches anwenden

```bash
# Alle neuen Patches anwenden (empfohlen)
./scripts/apply-patches.sh

# Ausgabe-Beispiel:
# ✓ Patch 0001-monorepo-grundstruktur: bereits angewendet (übersprungen)
# ✓ Patch 0002-shared-packages: bereits angewendet (übersprungen)
# → Patch 0003-docker-infrastructure: wird angewendet...
#   OK
# ✓ Alle Patches angewendet. System ist aktuell.
```

## Patch-Nummerierung

Patches werden fortlaufend nummeriert: `0001`, `0002`, `0003`, ...

Das Format eines Patch-Dateinamens ist:
```
<NUMMER>-<beschreibung-mit-bindestrichen>.patch
```

Beispiele:
- `0001-monorepo-grundstruktur.patch`
- `0015-pdf-export-vorlage.patch`
- `0023-bugfix-aktenzeichen-duplikat.patch`

## Was passiert wenn ein Patch fehlschlägt?

1. Das Skript stoppt sofort und zeigt den Fehler an
2. Der Patch wird NICHT als "angewendet" markiert
3. Die Fehlerursache beheben
4. `./scripts/apply-patches.sh` erneut ausführen

## Patches erstellen (für Entwickler)

Nach dem Entwickeln neuer Features:
```bash
# Patch aus den letzten N Commits erstellen
git format-patch HEAD~N --stdout > patches/000X-feature-name.patch
```
