# logs/ — Protokolle & Entscheidungslog

Dieser Ordner enthält das **Entwicklungs-Entscheidungslog** und dient als
Ablageort für Anwendungs-Logs.

## Inhalt

| Datei            | In Git? | Beschreibung                                      |
|------------------|---------|---------------------------------------------------|
| `MASTER_LOG.md`  | ✅ Ja   | Entscheidungs-Tagebuch (alle Entwicklungsphasen)  |
| `*.log`          | ❌ Nein | Anwendungs-Logs (werden lokal generiert)          |

## MASTER_LOG.md

Das `MASTER_LOG.md` ist das **zentrale Entwicklungs-Tagebuch** des Projekts.
Jeder Entwicklungsschritt wird dort dokumentiert:

```markdown
## [2026.03.1] Patch 0001 — Monorepo-Grundstruktur
**Datum:** 2026-03-23
**Patch-Nummer:** 0001

### Was wurde gemacht?
...

### Warum so und nicht anders?
...

### Offene Punkte
...
```

Dieses Log ist besonders wertvoll wenn:
- Ein neuer Entwickler ins Projekt einsteigt
- Ein Bug auftaucht und man verstehen will warum etwas so gebaut wurde
- Entscheidungen rückgängig gemacht oder überarbeitet werden müssen

## Anwendungs-Logs (automatisch generiert)

Die laufende Anwendung schreibt Log-Dateien in diesen Ordner:
- `api-error.log` — nur Fehler
- `api-combined.log` — alle Log-Einträge
- `api-exceptions.log` — unbehandelte Ausnahmen

Diese Dateien sind in `.gitignore` eingetragen und werden NICHT in Git gespeichert.
