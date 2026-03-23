/**
 * @file packages/database/seeds/index.ts
 * @description Datenbank-Seed für Entwicklung und Tests.
 *
 * Befüllt die Datenbank mit realistischen Testdaten.
 * NIEMALS in der Produktion ausführen!
 *
 * Ausführen:
 *   pnpm db:seed
 */

import { PrismaClient, GutachtenStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Starte Datenbank-Seed...');

  // Bestehende Testdaten löschen (Reihenfolge beachten wegen Foreign Keys)
  await prisma.auditLog.deleteMany();
  await prisma.aufgabe.deleteMany();
  await prisma.notiz.deleteMany();
  await prisma.termin.deleteMany();
  await prisma.schadensposten.deleteMany();
  await prisma.datei.deleteMany();
  await prisma.person.deleteMany();
  await prisma.fahrzeug.deleteMany();
  await prisma.unfall.deleteMany();
  await prisma.gutachten.deleteMany();
  await prisma.kontaktHistorie.deleteMany();
  await prisma.kunde.deleteMany();
  await prisma.gutachter.deleteMany();
  await prisma.featureFlag.deleteMany();

  console.log('  ✓ Bestehende Testdaten gelöscht');

  // Feature-Flags anlegen
  await prisma.featureFlag.createMany({
    data: [
      { name: 'FEATURE_KALENDER',       beschreibung: 'Kalenderansicht für Termine',          aktiv: true },
      { name: 'FEATURE_FOTO_EDITOR',    beschreibung: 'Foto-Annotierungs-Editor',              aktiv: true },
      { name: 'FEATURE_SKIZZEN',        beschreibung: 'Unfallskizzen-Zeichentool',             aktiv: true },
      { name: 'FEATURE_PDF_EXPORT',     beschreibung: 'PDF-Export mit Vorlage',                aktiv: true },
      { name: 'FEATURE_VOLLTEXTSUCHE',  beschreibung: 'Volltextsuche über alle Felder',        aktiv: true },
      { name: 'FEATURE_MULTI_TENANCY',  beschreibung: 'Mehrere Büros (SaaS-Modus)',            aktiv: false },
    ],
  });
  console.log('  ✓ Feature-Flags angelegt');

  // Gutachter anlegen
  const gutachter1 = await prisma.gutachter.create({
    data: {
      vorname: 'Dr. Klaus',
      nachname: 'Müller',
      email: 'k.mueller@gutachten-buero.de',
      telefon: '+49 89 12345-100',
      fachgebiet: 'Unfallanalyse, Spurensicherung',
    },
  });

  const gutachter2 = await prisma.gutachter.create({
    data: {
      vorname: 'Sabine',
      nachname: 'Weber',
      email: 's.weber@gutachten-buero.de',
      telefon: '+49 89 12345-101',
      fachgebiet: 'KFZ-Bewertung, Unfallrekonstruktion',
    },
  });
  console.log('  ✓ Gutachter angelegt');

  // Kunden anlegen
  const kunde1 = await prisma.kunde.create({
    data: {
      vorname: 'Hans',
      nachname: 'Schneider',
      email: 'h.schneider@example.de',
      telefon: '+49 30 99887766',
      strasse: 'Hauptstraße 42',
      plz: '10115',
      stadt: 'Berlin',
    },
  });

  const kunde2 = await prisma.kunde.create({
    data: {
      firma: 'Mustermann GmbH',
      nachname: 'Mustermann GmbH',
      email: 'kontakt@mustermann-gmbh.de',
      telefon: '+49 89 55443322',
      strasse: 'Gewerbestraße 7',
      plz: '80331',
      stadt: 'München',
    },
  });
  console.log('  ✓ Kunden angelegt');

  // Gutachten 1: In Bearbeitung (Entwurf)
  const gutachten1 = await prisma.gutachten.create({
    data: {
      aktenzeichen: 'GA-2026-001',
      titel: 'Auffahrunfall A8 München-Augsburg',
      beschreibung: '<p>Unfallanalytisches Gutachten zur Rekonstruktion des Auffahrunfalls auf der A8.</p>',
      status: GutachtenStatus.ENTWURF,
      frist: new Date('2026-04-15'),
      auftragsdatum: new Date('2026-03-10'),
      kundeId: kunde1.id,
      gutachterId: gutachter1.id,
    },
  });

  // Unfall zu Gutachten 1
  await prisma.unfall.create({
    data: {
      gutachtenId: gutachten1.id,
      unfallZeit: new Date('2026-03-05T14:30:00'),
      strasse: 'Autobahn A8',
      stadt: 'München',
      breitengrad: 48.1351,
      laengengrad: 11.5820,
      strassentyp: 'Autobahn',
      wetterlage: 'REGEN',
      temperatur: 8.5,
      sichtverhaeltnis: 'MITTEL',
      strassenzustand: 'NASS',
      polizeiAktenzeichen: 'POL-2026-00845',
      polizeiDienststelle: 'PI München-Mitte',
    },
  });

  // Fahrzeuge zu Gutachten 1
  const fahrzeug1 = await prisma.fahrzeug.create({
    data: {
      gutachtenId: gutachten1.id,
      kennzeichen: 'M-AB 1234',
      marke: 'BMW',
      modell: '3er (G20)',
      baujahr: 2022,
      farbe: 'Weiß',
      versicherung: 'Allianz KFZ',
    },
  });

  await prisma.fahrzeug.create({
    data: {
      gutachtenId: gutachten1.id,
      kennzeichen: 'M-CD 5678',
      marke: 'Volkswagen',
      modell: 'Passat (B8)',
      baujahr: 2019,
      farbe: 'Silber',
      versicherung: 'HUK-Coburg',
    },
  });

  // Beteiligte Person
  await prisma.person.create({
    data: {
      gutachtenId: gutachten1.id,
      fahrzeugId: fahrzeug1.id,
      typ: 'FAHRER',
      vorname: 'Hans',
      nachname: 'Schneider',
      telefon: '+49 30 99887766',
      fuehrerscheinklasse: 'B',
    },
  });

  // Schadensposten
  await prisma.schadensposten.createMany({
    data: [
      {
        gutachtenId: gutachten1.id,
        position: 1,
        bezeichnung: 'Reparaturkosten Stoßstange hinten',
        betragCents: 285000, // 2.850,00 €
        kategorie: 'Reparatur',
      },
      {
        gutachtenId: gutachten1.id,
        position: 2,
        bezeichnung: 'Merkantile Wertminderung',
        betragCents: 80000, // 800,00 €
        kategorie: 'Wertminderung',
      },
      {
        gutachtenId: gutachten1.id,
        position: 3,
        bezeichnung: 'Nutzungsausfall (5 Tage)',
        betragCents: 22500, // 225,00 €
        kategorie: 'Nutzungsausfall',
      },
    ],
  });

  // Notiz
  await prisma.notiz.create({
    data: {
      gutachtenId: gutachten1.id,
      inhalt: 'Fahrer hat Fotos des Unfallorts bereits per E-Mail zugesandt.',
      autor: 'K. Müller',
    },
  });

  // Aufgabe
  await prisma.aufgabe.create({
    data: {
      gutachtenId: gutachten1.id,
      titel: 'Reparaturkostenberechnung von Werkstatt anfordern',
      prioritaet: 'HOCH',
      faelligAm: new Date('2026-03-30'),
    },
  });

  // Termin
  await prisma.termin.create({
    data: {
      gutachtenId: gutachten1.id,
      titel: 'Fahrzeugbesichtigung beim Kunden',
      start: new Date('2026-03-25T10:00:00'),
      ende: new Date('2026-03-25T12:00:00'),
      ort: 'Hauptstraße 42, 10115 Berlin',
      farbe: '#1976d2',
    },
  });

  // Audit-Log-Eintrag
  await prisma.auditLog.create({
    data: {
      gutachtenId: gutachten1.id,
      aktion: 'ERSTELLT',
      bearbeiter: 'System',
      beschreibung: 'Gutachten GA-2026-001 wurde angelegt',
    },
  });

  // Gutachten 2: Neu aufgenommen
  await prisma.gutachten.create({
    data: {
      aktenzeichen: 'GA-2026-002',
      titel: 'Kreuzungsunfall Schwabing',
      status: GutachtenStatus.AUFGENOMMEN,
      frist: new Date('2026-05-01'),
      kundeId: kunde2.id,
      gutachterId: gutachter2.id,
    },
  });

  // Gutachten 3: Fertig/Archiv
  await prisma.gutachten.create({
    data: {
      aktenzeichen: 'GA-2026-003',
      titel: 'Parkplatzunfall Pasing Arcaden',
      status: GutachtenStatus.FERTIG,
      auftragsdatum: new Date('2026-02-01'),
      abschlussdatum: new Date('2026-02-28'),
      kundeId: kunde1.id,
      gutachterId: gutachter1.id,
    },
  });

  console.log('  ✓ Gutachten mit allen Relationen angelegt');
  console.log('');
  console.log('✅ Seed erfolgreich abgeschlossen!');
  console.log('   Angelegt: 2 Gutachter, 2 Kunden, 3 Gutachten');
}

main()
  .catch((error) => {
    console.error('❌ Seed fehlgeschlagen:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
