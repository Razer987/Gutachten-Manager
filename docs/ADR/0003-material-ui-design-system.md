# ADR 0003 — Material UI als Design-System

**Status:** Akzeptiert
**Datum:** 2026-03-23

## Kontext

Für das Frontend wird ein UI-Komponentensystem benötigt das:
- Professionell und konsistent aussieht
- Dark/Light Mode unterstützt
- Responsive (Mobile-first) ist
- Für Business-Anwendungen geeignet ist
- Von der Community gut unterstützt wird

## Entscheidung

**Material UI (MUI) v6.**

## Begründung

- **Vollständigkeit:** MUI bietet alle benötigten Komponenten out-of-the-box
  (Tabellen, Formulare, Dialoge, Drawer, Charts via MUI X)
- **Theming:** Ausgereifte Theme-API mit Dark/Light Mode in wenigen Zeilen
- **TypeScript:** Erstklassige TypeScript-Unterstützung
- **Bekanntheitsgrad:** Sehr viele Entwickler kennen MUI — erleichtert Einarbeitung
- **Dokumentation:** Exzellente Dokumentation mit Live-Beispielen
- **Accessibility:** WCAG-konforme Komponenten

## Konsequenzen

**Positiv:**
- Schnelle Entwicklung durch fertige Komponenten
- Konsistentes Erscheinungsbild ohne viel CSS-Arbeit

**Negativ:**
- Bundle-Größe ist größer als bei reinem Tailwind CSS
- MUI-Design ist erkennbar — für ein "einzigartiges" Aussehen braucht man Anpassungen

## Alternativen die abgelehnt wurden

| Alternative          | Warum abgelehnt                                           |
|----------------------|-----------------------------------------------------------|
| Tailwind + shadcn/ui | Mehr eigene Implementierung nötig, kein vollständiges MUI X |
| Ant Design           | Stärker auf chinesischen Markt ausgerichtet               |
| Chakra UI            | Weniger Komponenten als MUI für Business-Anwendungen      |
