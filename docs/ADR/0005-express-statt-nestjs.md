# ADR 0005 — Express.js statt NestJS

**Status:** Akzeptiert
**Datum:** 2026-03-23

## Kontext

Für das Backend war die Wahl zwischen mehreren Node.js-Frameworks offen.
Der Auftraggeber hat "Node.js + Express" gewählt — dies ist die Begründung.

## Entscheidung

**Express.js mit TypeScript und modularer Struktur.**

## Begründung

- **Einfachheit:** Express hat keine "magischen" Konzepte (keine Decorators,
  kein DI-Container). Ein neuer Entwickler versteht den Code sofort.
- **Flexibilität:** Jede Middleware-Bibliothek ist kompatibel.
- **Reife:** Express ist seit 2010 in Produktion — extrem stabil.
- **Verbreitung:** Express ist das meistgenutzte Node.js-Framework. Fast jeder
  Node.js-Entwickler kennt es.

## Unsere Modulstruktur macht NestJS-Vorteile unnötig

NestJS bietet Struktur durch sein Modul-System. Wir implementieren eine
ähnliche Struktur selbst:

```
src/modules/gutachten/
├── gutachten.routes.ts
├── gutachten.controller.ts
├── gutachten.service.ts
└── gutachten.validators.ts
```

Diese Struktur ist äquivalent zu einem NestJS-Modul — aber ohne die
Komplexität des Dependency-Injection-Containers.

## Konsequenzen

**Positiv:**
- Einfach zu verstehen und zu debuggen
- Schneller Einstieg für neue Entwickler

**Negativ:**
- Mehr manuelle Struktur-Disziplin nötig (wird durch unsere Konventionen gelöst)
- Kein eingebauter DI-Container (nicht benötigt für diesen Umfang)

## Alternativen die abgelehnt wurden

| Alternative | Warum abgelehnt                                             |
|-------------|-------------------------------------------------------------|
| NestJS      | Zu viel Komplexität für diesen Umfang, steilere Lernkurve  |
| Fastify     | Weniger verbreitet, kleineres Ökosystem                     |
| Hono        | Zu neu, noch kein stabiles Ökosystem für Enterprise-Features|
