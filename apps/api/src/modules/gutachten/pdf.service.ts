/**
 * @file apps/api/src/modules/gutachten/pdf.service.ts
 * @description PDF-Generierung für Gutachten mit pdfkit.
 */

import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import { prisma } from '@gutachten/database';
import { notFound } from '@/middleware/error.middleware';
import { logger } from '@/config/logger';

const STATUS_LABELS: Record<string, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiv',
};

const fmt = (n: number) =>
  n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const fmtDate = (d: Date | string | null): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('de-DE');
};

/** Erstellt und streamt ein Gutachten-PDF als HTTP-Response */
export async function erstelleGutachtenPdf(
  id: string,
  res: Response,
): Promise<void> {
  // Alle Daten laden
  const gutachten = await prisma.gutachten.findUnique({
    where: { id },
    include: {
      kunde: true,
      gutachter: true,
      fahrzeuge: true,
      personen: true,
      schadensposten: { orderBy: { position: 'asc' } },
      notizen: { orderBy: { createdAt: 'desc' }, take: 10 },
      aufgaben: { orderBy: { createdAt: 'asc' } },
      unfall: true,             // korrekt: unfall (nicht unfalldaten)
    },
  });

  if (!gutachten) throw notFound('Gutachten', id);

  logger.info(`PDF wird erstellt: ${gutachten.aktenzeichen}`);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 60, right: 60 },
    info: {
      Title: `Gutachten ${gutachten.aktenzeichen}`,
      Author: 'Gutachten-Manager',
    },
  });

  // HTTP-Header
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="GA-${gutachten.aktenzeichen}.pdf"`,
  );
  doc.pipe(res);

  const W = 495; // Nutzbare Breite
  const GRAU = '#666666';
  const DUNKEL = '#1a1a1a';
  const BLAU = '#1565C0';
  const HELL = '#f5f5f5';

  // ─── Hilfsfunktionen ────────────────────────────────────────────────────────

  const sectionTitle = (text: string) => {
    doc.moveDown(0.5);
    doc
      .fillColor(BLAU)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(text);
    doc
      .moveTo(doc.page.margins.left, doc.y + 2)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
      .strokeColor(BLAU)
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.4);
    doc.fillColor(DUNKEL).fontSize(10).font('Helvetica');
  };

  const labelValue = (label: string, value: string, x = doc.page.margins.left, width = W) => {
    const labelW = 140;
    doc
      .fillColor(GRAU)
      .fontSize(9)
      .font('Helvetica')
      .text(label, x, doc.y, { width: labelW, continued: true });
    doc
      .fillColor(DUNKEL)
      .fontSize(10)
      .font('Helvetica')
      .text(value, { width: width - labelW });
  };

  // ─── Kopfzeile ───────────────────────────────────────────────────────────────

  doc
    .fillColor(BLAU)
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('GUTACHTEN', { align: 'right' });

  doc
    .fillColor(DUNKEL)
    .fontSize(14)
    .font('Helvetica')
    .text(gutachten.aktenzeichen, { align: 'right' });

  doc
    .fillColor(GRAU)
    .fontSize(9)
    .text(`Erstellt am ${new Date().toLocaleDateString('de-DE')} · Gutachten-Manager v2026.03.1`, { align: 'right' });

  doc.moveDown(1);

  // Titelzeile
  doc
    .fillColor(DUNKEL)
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(gutachten.titel);

  doc
    .fillColor(GRAU)
    .fontSize(10)
    .font('Helvetica')
    .text(`Status: ${STATUS_LABELS[gutachten.status] ?? gutachten.status}`);

  doc.moveDown(1);
  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#dddddd').lineWidth(1).stroke();

  // ─── Stammdaten ──────────────────────────────────────────────────────────────

  sectionTitle('1. Stammdaten');
  labelValue('Aktenzeichen:', gutachten.aktenzeichen);
  labelValue('Titel:', gutachten.titel);
  labelValue('Status:', STATUS_LABELS[gutachten.status] ?? gutachten.status);
  labelValue('Auftragsdatum:', fmtDate(gutachten.auftragsdatum));
  labelValue('Frist:', fmtDate(gutachten.frist));
  labelValue('Abschlussdatum:', fmtDate(gutachten.abschlussdatum));
  if (gutachten.beschreibung) {
    labelValue('Beschreibung:', gutachten.beschreibung);
  }

  // ─── Auftraggeber ─────────────────────────────────────────────────────────────

  sectionTitle('2. Auftraggeber');
  if (gutachten.kunde) {
    const k = gutachten.kunde;
    const name = [k.vorname, k.nachname].filter(Boolean).join(' ');
    labelValue('Name:', name);
    if (k.email) labelValue('E-Mail:', k.email);
    if (k.telefon) labelValue('Telefon:', k.telefon);
    const adresse = [k.strasse, k.plz, k.stadt].filter(Boolean).join(', ');
    if (adresse) labelValue('Adresse:', adresse);
  } else {
    doc.fillColor(GRAU).text('Kein Auftraggeber zugewiesen.');
  }

  // ─── Gutachter ────────────────────────────────────────────────────────────────

  sectionTitle('3. Zuständiger Gutachter');
  if (gutachten.gutachter) {
    const g = gutachten.gutachter;
    labelValue('Name:', `${g.vorname} ${g.nachname}`);
    if (g.email) labelValue('E-Mail:', g.email);
    if (g.telefon) labelValue('Telefon:', g.telefon);
  } else {
    doc.fillColor(GRAU).text('Kein Gutachter zugewiesen.');
  }

  // ─── Unfalldaten ─────────────────────────────────────────────────────────────

  sectionTitle('4. Unfalldaten');
  const ud = gutachten.unfall;   // korrekt: unfall (nicht unfalldaten)
  if (ud) {
    const ort = [ud.strasse, ud.hausnummer, ud.plz, ud.stadt].filter(Boolean).join(' ');
    if (ort) labelValue('Unfallort:', ort);
    if (ud.unfallZeit) labelValue('Unfallzeit:', fmtDate(ud.unfallZeit));
    if (ud.polizeiAktenzeichen) labelValue('Polizei-Az.:', ud.polizeiAktenzeichen);
    if (ud.strassenzustand) labelValue('Straßenzustand:', ud.strassenzustand);   // korrekt: strassenzustand
    if (ud.wetterlage) labelValue('Wetterlage:', ud.wetterlage);                 // korrekt: wetterlage
    if (ud.lichtverhaeltnis) labelValue('Lichtverhältnis:', ud.lichtverhaeltnis); // korrekt: lichtverhaeltnis
    if (ud.unfallHergang) {
      doc.moveDown(0.3);
      doc.fillColor(GRAU).fontSize(9).text('Unfallhergang:');
      doc.fillColor(DUNKEL).fontSize(10).text(ud.unfallHergang, { width: W });
    }
  } else {
    doc.fillColor(GRAU).text('Keine Unfalldaten erfasst.');
  }

  // ─── Fahrzeuge ────────────────────────────────────────────────────────────────

  sectionTitle('5. Beteiligte Fahrzeuge');
  if (gutachten.fahrzeuge.length === 0) {
    doc.fillColor(GRAU).text('Keine Fahrzeuge erfasst.');
  } else {
    gutachten.fahrzeuge.forEach((f, i) => {
      doc.fillColor(DUNKEL).font('Helvetica-Bold').fontSize(10).text(`Fahrzeug ${i + 1}:`);
      doc.font('Helvetica');
      const info = [
        f.kennzeichen && `Kennzeichen: ${f.kennzeichen}`,
        (f.marke || f.modell) && `Marke/Modell: ${[f.marke, f.modell].filter(Boolean).join(' ')}`,
        f.baujahr && `Baujahr: ${f.baujahr}`,
        f.farbe && `Farbe: ${f.farbe}`,
        f.fahrgestell && `FIN: ${f.fahrgestell}`,  // korrekt: fahrgestell (nicht fahrgestellnummer)
      ].filter(Boolean).join(' · ');
      doc.fillColor(DUNKEL).fontSize(10).text(info || '—');
      doc.moveDown(0.2);
    });
  }

  // ─── Personen ─────────────────────────────────────────────────────────────────

  sectionTitle('6. Beteiligte Personen');
  if (gutachten.personen.length === 0) {
    doc.fillColor(GRAU).text('Keine Personen erfasst.');
  } else {
    gutachten.personen.forEach((p) => {
      const name = [p.vorname, p.nachname].filter(Boolean).join(' ');
      const info = [
        p.telefon && `Tel: ${p.telefon}`,
        p.email && `E-Mail: ${p.email}`,
      ].filter(Boolean).join(' · ');
      doc
        .fillColor(DUNKEL)
        .font('Helvetica')
        .fontSize(10)
        .text(`${p.typ}: ${name}${info ? ' — ' + info : ''}`);
    });
  }

  // ─── Schadensposten ──────────────────────────────────────────────────────────

  sectionTitle('7. Schadensposten');
  if (gutachten.schadensposten.length === 0) {
    doc.fillColor(GRAU).text('Keine Schadensposten erfasst.');
  } else {
    const colX = [doc.page.margins.left, doc.page.margins.left + 30, doc.page.margins.left + 280, doc.page.margins.left + 380];

    // Tabellenkopf
    doc
      .rect(doc.page.margins.left, doc.y, W, 18)
      .fill(HELL);
    const headY = doc.y + 4;
    doc.fillColor(DUNKEL).font('Helvetica-Bold').fontSize(9);
    doc.text('#', colX[0], headY, { width: 25, align: 'right' });
    doc.text('Bezeichnung', colX[1] + 5, headY, { width: 250 });
    doc.text('Kategorie', colX[2], headY, { width: 95 });
    doc.text('Betrag', colX[3], headY, { width: 115, align: 'right' });
    doc.moveDown(0.1);

    // betragCents ist in Cent gespeichert — Division durch 100 für Euro-Anzeige
    let gesamtCents = 0;
    gutachten.schadensposten.forEach((sp) => {
      gesamtCents += sp.betragCents;                   // korrekt: betragCents
      const y = doc.y + 3;
      doc.fillColor(DUNKEL).font('Helvetica').fontSize(9);
      doc.text(String(sp.position), colX[0], y, { width: 25, align: 'right' });
      doc.text(sp.bezeichnung, colX[1] + 5, y, { width: 250 });  // korrekt: bezeichnung
      doc.text(sp.kategorie ?? '—', colX[2], y, { width: 95 }); // korrekt: kategorie
      doc.text(fmt(sp.betragCents / 100), colX[3], y, { width: 115, align: 'right' }); // Cents → Euro
    });

    doc.moveDown(0.3);
    doc
      .moveTo(colX[2], doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor('#aaaaaa').lineWidth(0.5).stroke();
    doc.moveDown(0.2);

    const totalY = doc.y + 3;
    doc.fillColor(DUNKEL).font('Helvetica-Bold').fontSize(10);
    doc.text('GESAMTSCHADEN:', colX[2], totalY, { width: 95 });
    doc.text(fmt(gesamtCents / 100), colX[3], totalY, { width: 115, align: 'right' }); // Cents → Euro
    doc.moveDown(0.5);
  }

  // ─── Notizen ─────────────────────────────────────────────────────────────────

  if (gutachten.notizen.length > 0) {
    sectionTitle('8. Notizen');
    gutachten.notizen.forEach((n) => {
      doc
        .fillColor(GRAU)
        .fontSize(8)
        .text(`${fmtDate(n.createdAt)}${n.autor ? ' · ' + n.autor : ''}:`);
      doc
        .fillColor(DUNKEL)
        .fontSize(9)
        .text(n.inhalt, { width: W });
      doc.moveDown(0.3);
    });
  }

  // ─── Aufgaben ─────────────────────────────────────────────────────────────────

  if (gutachten.aufgaben.length > 0) {
    sectionTitle('9. Aufgaben');
    gutachten.aufgaben.forEach((a) => {
      const status = a.erledigt ? '[X]' : '[ ]';
      const frist = a.faelligAm ? ` (Fällig: ${fmtDate(a.faelligAm)})` : '';
      doc
        .fillColor(a.erledigt ? GRAU : DUNKEL)
        .fontSize(10)
        .text(`${status} ${a.titel}${frist}`, { width: W });
    });
  }

  // ─── Fußzeile ─────────────────────────────────────────────────────────────────

  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc
      .fillColor(GRAU)
      .fontSize(8)
      .text(
        `Gutachten-Manager · ${gutachten.aktenzeichen} · Seite ${i + 1}/${totalPages}`,
        doc.page.margins.left,
        doc.page.height - 40,
        { align: 'center', width: W },
      );
  }

  doc.end();
  logger.info(`PDF erstellt: ${gutachten.aktenzeichen}`);
}
