# ADR 0002 — PostgreSQL Schema-per-Tenant für Multi-Tenancy

**Status:** Akzeptiert
**Datum:** 2026-03-23

## Kontext

Die langfristige Vision ist ein SaaS-System für mehrere Gutachterbüros.
Jedes Büro (Tenant/Mandant) soll vollständige Datenisolation haben.

Es gibt drei gängige Ansätze für Multi-Tenancy in SQL-Datenbanken:
1. **Database-per-Tenant:** Jeder Mandant bekommt eine eigene Datenbank
2. **Schema-per-Tenant:** Jeder Mandant bekommt ein eigenes Schema in einer DB
3. **Row-Level-Tenancy:** Alle Mandanten teilen dieselben Tabellen, mit `tenant_id` Spalte

## Entscheidung

**Schema-per-Tenant mit PostgreSQL.**

```
PostgreSQL Datenbank: gutachten_manager
├── Schema: public         → System (Tenants, Feature-Flags)
├── Schema: tenant_001     → Büro 1
├── Schema: tenant_002     → Büro 2
└── Schema: tenant_003     → Büro 3
```

## Begründung

### Warum nicht Database-per-Tenant?

- Jede neue Datenbank braucht eigene PostgreSQL-Verbindungen
- Prisma unterstützt keine dynamischen Datenbankverbindungen gut
- Sehr hohe Ressourcenkosten bei vielen kleinen Mandanten

### Warum nicht Row-Level-Tenancy?

- Risiko: Ein falscher Query ohne `WHERE tenant_id = ?` gibt Daten aller Mandanten zurück
- Schwerer zu testen und zu debuggen
- DSGVO-Compliance ist schwieriger zu garantieren

### Warum Schema-per-Tenant?

- **Starke Isolation:** Ein Fehler in Schema `tenant_001` betrifft nicht `tenant_002`
- **DSGVO-Compliance:** Mandanten-Daten sind physisch getrennt, einfach zu exportieren/löschen
- **Skalierbar:** PostgreSQL kann tausende Schemas in einer Datenbank verwalten
- **Prisma-Kompatibel:** Prisma unterstützt dynamische Schemas via `?schema=<tenant_id>`

## Implementierung (Phase 1)

In Phase 1 gibt es nur ein einziges Schema (`public` oder `default`).
Die Architektur ist jedoch so gestaltet dass die Mandantentrennung später
aktiviert werden kann ohne den Code grundlegend umzuschreiben.

**Schlüssel-Konzept:** Überall wo die Datenbank angesprochen wird, geht es
durch eine zentrale Funktion die das Schema setzt. Diese Funktion wird later
mit dem Tenant-Context befüllt.

## Konsequenzen

**Positiv:**
- Solide Grundlage für SaaS-Erweiterung
- Klare Datenisolation
- Keine Code-Änderungen an Business-Logik beim Aktivieren

**Negativ:**
- Migrations müssen für jedes Schema separat ausgeführt werden
- Komplexerer Prisma-Setup

## Alternativen die abgelehnt wurden

| Alternative        | Warum abgelehnt                           |
|--------------------|-------------------------------------------|
| Database-per-Tenant| Zu ressourcenintensiv, Prisma-Einschränkungen |
| Row-Level-Tenancy  | Sicherheitsrisiko, DSGVO-Probleme         |
