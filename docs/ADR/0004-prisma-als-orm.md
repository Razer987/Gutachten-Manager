# ADR 0004 — Prisma als ORM

**Status:** Akzeptiert
**Datum:** 2026-03-23

## Kontext

Für den Datenbankzugriff wird ein ORM (Object-Relational Mapper) benötigt.
Anforderungen:
- TypeScript-native (automatisch generierte Typen)
- Migrations-System
- Gute Performance
- Gut dokumentiert

## Entscheidung

**Prisma ORM.**

## Begründung

- **Typsicherheit:** Prisma generiert TypeScript-Typen automatisch aus dem Schema.
  Datenbankabfragen sind vollständig typsicher — Fehler werden schon im Editor erkannt.
- **Schema-First:** Das `schema.prisma` ist die einzige Quelle der Wahrheit für
  die Datenbankstruktur. Sehr gut lesbar und verständlich.
- **Migrations:** `prisma migrate` erstellt automatisch SQL-Migrationsdateien die
  in Git versioniert werden.
- **Prisma Studio:** Browser-GUI für die Datenbank — ideal für Debugging.
- **Multi-Schema-Support:** Unterstützt `?schema=` für unsere Tenant-Architektur.

## Konsequenzen

**Positiv:**
- Keine SQL-Injection möglich (parametrisierte Abfragen)
- Typ-Fehler bei Datenbankabfragen werden beim Kompilieren erkannt
- Schema ist lesbar für Nicht-SQL-Experten

**Negativ:**
- Für komplexe SQL-Abfragen (z.B. Volltextsuche) muss Raw SQL verwendet werden
- Leichter Overhead verglichen mit direktem pg-Client

## Alternativen die abgelehnt wurden

| Alternative  | Warum abgelehnt                                               |
|--------------|---------------------------------------------------------------|
| Drizzle ORM  | Jünger, weniger Ökosystem, kein Prisma Studio                |
| TypeORM      | Dekorator-basiert, mehr Boilerplate, Migrations weniger stabil|
| Raw SQL (pg) | Keine Typsicherheit, mehr manueller Aufwand                   |
| Knex.js      | Kein vollständiger ORM, keine automatischen Typen             |
