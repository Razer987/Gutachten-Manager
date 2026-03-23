# docs/ — Dokumentation

Vollständige technische und fachliche Dokumentation des Gutachten-Managers.

## Dokumente

| Datei                  | Beschreibung                                              |
|------------------------|-----------------------------------------------------------|
| `SETUP.md`             | Schritt-für-Schritt Installationsanleitung (Einstieg)    |
| `ARCHITECTURE.md`      | Systemarchitektur, Diagramme, Technologie-Entscheidungen |
| `API.md`               | Vollständige REST API Referenz                            |
| `PATCHES.md`           | Dokumentation des Patch-Systems                          |
| `ADR/`                 | Architecture Decision Records (Entscheidungsprotokoll)   |

## Architecture Decision Records (ADR)

ADRs dokumentieren **warum** eine technische Entscheidung getroffen wurde —
nicht nur was entschieden wurde. Das ist für neue Entwickler extrem wertvoll.

```
docs/ADR/
├── 0001-monorepo-mit-turborepo.md
├── 0002-postgresql-schema-per-tenant.md
├── 0003-material-ui-fuer-design-system.md
├── 0004-prisma-als-orm.md
└── ...
```

Jedes ADR enthält:
- **Status:** Akzeptiert / Abgelehnt / Überholt
- **Kontext:** Was war die Situation?
- **Entscheidung:** Was wurde entschieden?
- **Begründung:** Warum?
- **Konsequenzen:** Was sind die Auswirkungen?

## Für wen ist diese Dokumentation?

- **Entwickler die neu einsteigen:** Beginnt mit `SETUP.md`
- **Architektur verstehen:** `ARCHITECTURE.md`
- **API integrieren:** `API.md`
- **Warum-Fragen:** `ADR/`
- **Updates verstehen:** `PATCHES.md`
