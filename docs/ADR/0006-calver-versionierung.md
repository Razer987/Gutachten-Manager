# ADR 0006 — CalVer (Kalenderdatum-basierte Versionierung)

**Status:** Akzeptiert
**Datum:** 2026-03-23

## Kontext

Die App benötigt eine Versionierungsstrategie. Zwei Hauptansätze:
- **SemVer (Semantic Versioning):** MAJOR.MINOR.PATCH (z.B. 2.4.1)
- **CalVer (Calendar Versioning):** JJJJ.MM.PATCH (z.B. 2026.03.1)

## Entscheidung

**CalVer: `JJJJ.MM.PATCH`**

Beispiele:
- `2026.03.1` — März 2026, erster Release
- `2026.03.2` — März 2026, zweite Veröffentlichung
- `2026.04.1` — April 2026, erster Release

## Begründung

- **Zeitlich verständlich:** Auf einen Blick erkennbar aus welchem Monat eine Version stammt
- **Für nicht-technische Nutzer:** "Ich nutze die März-Version" ist verständlicher als "Ich nutze Version 2.4.1"
- **Natürlicher Rhythmus:** Releases werden regelmäßig (monatlich) gemacht statt auf Breaking-Change-Basis
- **Kein SemVer-Druck:** Bei SemVer müsste man genau definieren was eine "MAJOR" vs. "MINOR" Änderung ist. Das ist bei Inhouse-Software oft unklar.

## Implementierung

In `package.json` (Root):
```json
{
  "version": "2026.03.1"
}
```

Git-Tags:
```bash
git tag v2026.03.1
git push origin v2026.03.1
```

CHANGELOG.md Eintrag:
```markdown
## [2026.03.1] — 2026-03-23
### Neu
- Gutachten-Modul: 7-stufiger Workflow
### Verbessert
- ...
```

## Konsequenzen

**Positiv:**
- Leicht verständlich für alle Beteiligten

**Negativ:**
- Keine semantische Bedeutung (Breaking Change vs. Bugfix nicht erkennbar)
  → Wird durch CHANGELOG.md und PATCHES.md kompensiert
