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

import { PrismaClient, GutachtenStatus } from '../generated/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Starte Datenbank-Seed...');

  // Bestehende Testdaten loeschen (Reihenfolge beachten wegen Foreign Keys)
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

  console.log('  Bestehende Testdaten geloescht');

  // Feature-Flags anlegen
  await prisma.featureFlag.createMany({
    data: [
      { name: 'FEATURE_KALENDER',       beschreibung: 'Kalenderansicht fuer Termine',          aktiv: true  },
      { name: 'FEATURE_FOTO_EDITOR',    beschreibung: 'Foto-Annotierungs-Editor',               aktiv: true  },
      { name: 'FEATURE_SKIZZEN',        beschreibung: 'Unfallskizzen-Zeichentool',              aktiv: true  },
      { name: 'FEATURE_PDF_EXPORT',     beschreibung: 'PDF-Export mit Vorlage',                 aktiv: true  },
      { name: 'FEATURE_VOLLTEXTSUCHE',  beschreibung: 'Volltextsuche ueber alle Felder',        aktiv: true  },
      { name: 'FEATURE_MULTI_TENANCY',  beschreibung: 'Mehrere Bueros (SaaS-Modus)',            aktiv: false },
    ],
  });
  console.log('  Feature-Flags angelegt');

  // -----------------------------------------------------------------------
  // Gutachter
  // -----------------------------------------------------------------------
  const gutachter1 = await prisma.gutachter.create({
    data: {
      vorname: 'Dr. Klaus',
      nachname: 'Mueller',
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

  const gutachter3 = await prisma.gutachter.create({
    data: {
      vorname: 'Dipl.-Ing. Thomas',
      nachname: 'Richter',
      email: 't.richter@gutachten-buero.de',
      telefon: '+49 89 12345-102',
      fachgebiet: 'Fahrzeugschaeden, Wertminderung',
    },
  });
  console.log('  Gutachter angelegt');

  // -----------------------------------------------------------------------
  // Kunden
  // -----------------------------------------------------------------------
  const kunde1 = await prisma.kunde.create({
    data: {
      vorname: 'Hans',
      nachname: 'Schneider',
      email: 'h.schneider@example.de',
      telefon: '+49 30 99887766',
      strasse: 'Hauptstrasse 42',
      plz: '10115',
      stadt: 'Berlin',
    },
  });

  const kunde2 = await prisma.kunde.create({
    data: {
      firma: 'Mustermann Transport GmbH',
      nachname: 'Mustermann Transport GmbH',
      email: 'kontakt@mustermann-transport.de',
      telefon: '+49 89 55443322',
      strasse: 'Gewerbestrasse 7',
      plz: '80331',
      stadt: 'Muenchen',
    },
  });

  const kunde3 = await prisma.kunde.create({
    data: {
      vorname: 'Maria',
      nachname: 'Fischer',
      email: 'm.fischer@example.de',
      telefon: '+49 40 77665544',
      mobil: '+49 160 12345678',
      strasse: 'Birkenweg 15',
      plz: '20095',
      stadt: 'Hamburg',
    },
  });

  const kunde4 = await prisma.kunde.create({
    data: {
      vorname: 'Peter',
      nachname: 'Hoffmann',
      email: 'p.hoffmann@example.de',
      telefon: '+49 711 33224411',
      strasse: 'Rosengasse 3',
      plz: '70173',
      stadt: 'Stuttgart',
    },
  });
  console.log('  Kunden angelegt');

  // -----------------------------------------------------------------------
  // Gutachten 1: Auffahrunfall A8 — Entwurf
  // -----------------------------------------------------------------------
  const gutachten1 = await prisma.gutachten.create({
    data: {
      aktenzeichen: 'GA-2026-001',
      titel: 'Auffahrunfall A8 Muenchen-Augsburg',
      beschreibung: '<p>Unfallanalytisches Gutachten zur Rekonstruktion des Auffahrunfalls auf der A8 bei Augsburg.</p><p>Beide Fahrzeuge wurden vor Ort besichtigt. Fotos und Messungen liegen vor.</p>',
      status: GutachtenStatus.ENTWURF,
      frist: new Date('2026-04-15'),
      auftragsdatum: new Date('2026-03-10'),
      kundeId: kunde1.id,
      gutachterId: gutachter1.id,
    },
  });

  await prisma.unfall.create({
    data: {
      gutachtenId: gutachten1.id,
      unfallZeit: new Date('2026-03-05T14:30:00'),
      strasse: 'Autobahn A8 Richtung Muenchen',
      plz: '86154',
      stadt: 'Augsburg',
      breitengrad: 48.3705,
      laengengrad: 10.8978,
      strassentyp: 'Autobahn',
      wetterlage: 'REGEN',
      temperatur: 8.5,
      sichtverhaeltnis: 'MITTEL',
      strassenzustand: 'NASS',
      polizeiAktenzeichen: 'POL-2026-00845',
      polizeiDienststelle: 'Autobahnpolizei Augsburg',
    },
  });

  const fz1a = await prisma.fahrzeug.create({
    data: {
      gutachtenId: gutachten1.id,
      kennzeichen: 'M-AB 1234',
      marke: 'BMW',
      modell: '3er (G20)',
      baujahr: 2022,
      farbe: 'Weiss',
      versicherung: 'Allianz KFZ',
      fahrgestell: 'WBA5A71010G123456',
    },
  });

  const fz1b = await prisma.fahrzeug.create({
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

  await prisma.person.create({
    data: {
      gutachtenId: gutachten1.id,
      fahrzeugId: fz1a.id,
      typ: 'FAHRER',
      vorname: 'Hans',
      nachname: 'Schneider',
      telefon: '+49 30 99887766',
      fuehrerscheinklasse: 'B',
    },
  });

  await prisma.person.create({
    data: {
      gutachtenId: gutachten1.id,
      fahrzeugId: fz1b.id,
      typ: 'FAHRER',
      vorname: 'Klaus',
      nachname: 'Becker',
      telefon: '+49 89 11223344',
      fuehrerscheinklasse: 'B, BE',
    },
  });

  await prisma.schadensposten.createMany({
    data: [
      { gutachtenId: gutachten1.id, position: 1, bezeichnung: 'Reparaturkosten Stossstange hinten', betragCents: 285000, kategorie: 'Reparatur' },
      { gutachtenId: gutachten1.id, position: 2, bezeichnung: 'Merkantile Wertminderung',           betragCents:  80000, kategorie: 'Wertminderung' },
      { gutachtenId: gutachten1.id, position: 3, bezeichnung: 'Nutzungsausfall (5 Tage)',           betragCents:  22500, kategorie: 'Nutzungsausfall' },
      { gutachtenId: gutachten1.id, position: 4, bezeichnung: 'Gutachterkosten',                   betragCents:  89000, kategorie: 'Gutachterkosten' },
    ],
  });

  await prisma.notiz.createMany({
    data: [
      { gutachtenId: gutachten1.id, inhalt: 'Fahrer hat Fotos des Unfallorts per E-Mail zugesandt.', autor: 'K. Mueller' },
      { gutachtenId: gutachten1.id, inhalt: 'Reparaturkostenangebot der BMW-Werkstatt Muenchen liegt vor.', autor: 'K. Mueller' },
    ],
  });

  await prisma.aufgabe.createMany({
    data: [
      { gutachtenId: gutachten1.id, titel: 'Reparaturkostenberechnung von Werkstatt anfordern', prioritaet: 'HOCH', faelligAm: new Date('2026-03-30'), erledigt: true },
      { gutachtenId: gutachten1.id, titel: 'Polizeibericht anfordern', prioritaet: 'MITTEL', faelligAm: new Date('2026-04-05'), erledigt: false },
      { gutachtenId: gutachten1.id, titel: 'Entwurf zur Freigabe versenden', prioritaet: 'HOCH', faelligAm: new Date('2026-04-10'), erledigt: false },
    ],
  });

  await prisma.termin.create({
    data: {
      gutachtenId: gutachten1.id,
      titel: 'Fahrzeugbesichtigung beim Kunden',
      start: new Date('2026-03-25T10:00:00'),
      ende: new Date('2026-03-25T12:00:00'),
      ort: 'Hauptstrasse 42, 10115 Berlin',
      farbe: '#1976d2',
    },
  });

  await prisma.auditLog.createMany({
    data: [
      { gutachtenId: gutachten1.id, aktion: 'ERSTELLT',    bearbeiter: 'System',    beschreibung: 'Gutachten GA-2026-001 wurde angelegt' },
      { gutachtenId: gutachten1.id, aktion: 'AKTUALISIERT', bearbeiter: 'K. Mueller', beschreibung: 'Unfalldaten erfasst' },
      { gutachtenId: gutachten1.id, aktion: 'AKTUALISIERT', bearbeiter: 'K. Mueller', beschreibung: 'Schadensposten hinzugefuegt' },
    ],
  });

  // -----------------------------------------------------------------------
  // Gutachten 2: Kreuzungsunfall — Beauftragt
  // -----------------------------------------------------------------------
  const gutachten2 = await prisma.gutachten.create({
    data: {
      aktenzeichen: 'GA-2026-002',
      titel: 'Kreuzungsunfall Schwabing',
      beschreibung: '<p>Kollision an einer Vorfahrtskreuzung in Muenchen-Schwabing.</p>',
      status: GutachtenStatus.BEAUFTRAGT,
      frist: new Date('2026-05-01'),
      auftragsdatum: new Date('2026-03-20'),
      kundeId: kunde2.id,
      gutachterId: gutachter2.id,
    },
  });

  await prisma.unfall.create({
    data: {
      gutachtenId: gutachten2.id,
      unfallZeit: new Date('2026-03-18T09:15:00'),
      strasse: 'Leopoldstrasse / Ecke Ainmillerstrasse',
      plz: '80802',
      stadt: 'Muenchen',
      strassentyp: 'Innerorts',
      wetterlage: 'TROCKEN',
      temperatur: 12.0,
      sichtverhaeltnis: 'GUT',
      strassenzustand: 'TROCKEN',
      polizeiAktenzeichen: 'POL-2026-01122',
      polizeiDienststelle: 'PI Schwabing',
    },
  });

  await prisma.fahrzeug.create({
    data: {
      gutachtenId: gutachten2.id,
      kennzeichen: 'M-LT 9900',
      marke: 'Mercedes-Benz',
      modell: 'Sprinter 316 CDI',
      baujahr: 2021,
      farbe: 'Weiss',
      versicherung: 'R+V Versicherung',
    },
  });

  await prisma.termin.create({
    data: {
      gutachtenId: gutachten2.id,
      titel: 'Besichtigung Unfallort Schwabing',
      start: new Date('2026-04-08T14:00:00'),
      ende: new Date('2026-04-08T16:00:00'),
      ort: 'Leopoldstrasse / Ainmillerstrasse, 80802 Muenchen',
      farbe: '#7b1fa2',
    },
  });

  await prisma.aufgabe.create({
    data: {
      gutachtenId: gutachten2.id,
      titel: 'Fahrzeugbesichtigung durchfuehren',
      prioritaet: 'HOCH',
      faelligAm: new Date('2026-04-08'),
      erledigt: false,
    },
  });

  // -----------------------------------------------------------------------
  // Gutachten 3: Parkplatzschaden — Fertig
  // -----------------------------------------------------------------------
  const gutachten3 = await prisma.gutachten.create({
    data: {
      aktenzeichen: 'GA-2026-003',
      titel: 'Parkplatzschaden Pasing Arcaden',
      status: GutachtenStatus.FERTIG,
      auftragsdatum: new Date('2026-02-01'),
      abschlussdatum: new Date('2026-02-28'),
      kundeId: kunde3.id,
      gutachterId: gutachter1.id,
    },
  });

  await prisma.schadensposten.createMany({
    data: [
      { gutachtenId: gutachten3.id, position: 1, bezeichnung: 'Delle Fahrertuer', betragCents: 45000, kategorie: 'Karosserie' },
      { gutachtenId: gutachten3.id, position: 2, bezeichnung: 'Lackierung Fahrertuer', betragCents: 38000, kategorie: 'Lack' },
    ],
  });

  // -----------------------------------------------------------------------
  // Gutachten 4: LKW-Unfall — In Bearbeitung (Besichtigung)
  // -----------------------------------------------------------------------
  const gutachten4 = await prisma.gutachten.create({
    data: {
      aktenzeichen: 'GA-2026-004',
      titel: 'LKW-Unfall B2 Dachau',
      beschreibung: '<p>Schwerer LKW-Unfall auf der B2 bei Dachau. Totalschaden am Auflieger.</p>',
      status: GutachtenStatus.BESICHTIGUNG,
      frist: new Date('2026-04-30'),
      auftragsdatum: new Date('2026-03-28'),
      kundeId: kunde4.id,
      gutachterId: gutachter3.id,
    },
  });

  await prisma.unfall.create({
    data: {
      gutachtenId: gutachten4.id,
      unfallZeit: new Date('2026-03-26T06:45:00'),
      strasse: 'Bundesstrasse B2',
      plz: '85221',
      stadt: 'Dachau',
      strassentyp: 'Ausserorts',
      wetterlage: 'NEBEL',
      temperatur: 3.5,
      sichtverhaeltnis: 'SCHLECHT',
      strassenzustand: 'NASS',
    },
  });

  await prisma.schadensposten.createMany({
    data: [
      { gutachtenId: gutachten4.id, position: 1, bezeichnung: 'Totalschaden Sattelauflieger', betragCents: 4500000, kategorie: 'Totalschaden' },
      { gutachtenId: gutachten4.id, position: 2, bezeichnung: 'Bergungskosten', betragCents: 350000, kategorie: 'Bergung' },
      { gutachtenId: gutachten4.id, position: 3, bezeichnung: 'Nutzungsausfall (14 Tage)', betragCents: 280000, kategorie: 'Nutzungsausfall' },
    ],
  });

  // -----------------------------------------------------------------------
  // Gutachten 5: Wildunfall — Aufgenommen (zurueckliegend — fuer Monatsuebersicht)
  // -----------------------------------------------------------------------
  await prisma.gutachten.create({
    data: {
      aktenzeichen: 'GA-2026-005',
      titel: 'Wildunfall B13 Freising',
      status: GutachtenStatus.AUFGENOMMEN,
      auftragsdatum: new Date('2026-01-15'),
      frist: new Date('2026-02-28'),
      kundeId: kunde1.id,
      gutachterId: gutachter2.id,
    },
  });

  // Gutachten aus Vormonaten fuer Monatsauswertung
  for (let i = 1; i <= 4; i++) {
    const monat = new Date();
    monat.setMonth(monat.getMonth() - i);
    monat.setDate(10);
    await prisma.gutachten.create({
      data: {
        aktenzeichen: `GA-2025-${100 + i}`,
        titel: `Archiv-Gutachten ${i}`,
        status: GutachtenStatus.FERTIG,
        auftragsdatum: monat,
        abschlussdatum: new Date(monat.getTime() + 20 * 24 * 60 * 60 * 1000),
        kundeId: i % 2 === 0 ? kunde2.id : kunde3.id,
        gutachterId: i % 3 === 0 ? gutachter3.id : gutachter1.id,
      },
    });
  }

  // -----------------------------------------------------------------------
  // Kontakthistorie
  // -----------------------------------------------------------------------
  await prisma.kontaktHistorie.createMany({
    data: [
      { kundeId: kunde1.id, art: 'TELEFON', inhalt: 'Erstgespräch, Unterlagen angefordert', bearbeiter: 'K. Mueller', kontaktDat: new Date('2026-03-10') },
      { kundeId: kunde1.id, art: 'EMAIL', inhalt: 'Auftragsbestaetigung per E-Mail versandt', bearbeiter: 'Sekretariat', kontaktDat: new Date('2026-03-11') },
      { kundeId: kunde2.id, art: 'TELEFON', inhalt: 'Besichtigungstermin vereinbart', bearbeiter: 'S. Weber', kontaktDat: new Date('2026-03-21') },
    ],
  });

  // Zusaetzlicher Termin ohne Gutachten (allgemeiner Buerotermin)
  await prisma.termin.create({
    data: {
      titel: 'Buerobesprechung',
      start: new Date('2026-04-07T09:00:00'),
      ende: new Date('2026-04-07T10:00:00'),
      ort: 'Konferenzraum 1',
      farbe: '#388e3c',
    },
  });

  console.log('  Gutachten mit allen Relationen angelegt');
  console.log('');
  console.log('Seed erfolgreich abgeschlossen!');
  console.log('  Angelegt: 3 Gutachter, 4 Kunden, 9 Gutachten, Schadensposten, Termine, Aufgaben, Notizen');
}

main()
  .catch((error) => {
    console.error('Seed fehlgeschlagen:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
