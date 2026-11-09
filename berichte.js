'use strict';
// PDF: Formulare und Berichte mit Firmenkopf Hartmann Dächer.

let LOGO = null;
const C = {schwarz: [26, 26, 26], rot: [227, 6, 19], grau: [110, 110, 110], linie: [215, 215, 215], hell: [245, 245, 243], text: [29, 29, 29], gruen: [47, 125, 50]};
async function logoLaden() { if (!LOGO) try { LOGO = await dataUrl(await (await fetch('logo.png')).blob()); } catch (e) { LOGO = null; } }

class Pdf {
  constructor(titelText) {
    this.d = new jspdf.jsPDF({unit: 'pt', format: 'a4', compress: true});
    this.d.setProperties({title: titelText || '', author: CFG.firma.name, creator: CFG.firma.name, subject: '', keywords: ''});
    this.L = 42; this.R = 553; this.kopf();
  }
  schrift(stil, gr, c = C.text) { this.d.setFont('helvetica', stil); this.d.setFontSize(gr); this.d.setTextColor(...c); }
  kopf() {
    const d = this.d, F = CFG.firma;
    if (LOGO) d.addImage(LOGO, 'PNG', this.L, 24, 150, 45.6);
    this.schrift('bold', 8.5, C.schwarz); d.text(F.name, this.R, 30, {align: 'right'});
    this.schrift('normal', 7.5, C.grau);
    [[F.inhaber, F.titel].filter(Boolean).join(', '), [F.strasse, F.ort].filter(Boolean).join(', '), F.tel ? 'Tel. ' + F.tel : '', F.mail, F.web].filter(Boolean)
      .forEach((t, i) => d.text(t, this.R, 42 + i * 10.5, {align: 'right'}));
    d.setDrawColor(...C.rot); d.setLineWidth(2); d.line(this.L, 92, this.R, 92);
    this.y = 110;
  }
  seite() { this.d.addPage(); this.kopf(); }
  platz(h) { if (this.y + h > 790) this.seite(); }
  h1(t, unter, rechts) {
    this.platz(60); this.schrift('bold', 16, C.schwarz); this.d.text(t, this.L, this.y + 14);
    let y = this.y + 14;
    if (unter) { this.schrift('normal', 9, C.grau); this.d.text(unter, this.L, y + 14); y += 14; }
    if (rechts) { this.schrift('normal', 8, C.grau); this.d.text(rechts, this.R, this.y + 14, {align: 'right'}); }
    this.y = y + 16;
  }
  balken(t, min = 60) {
    this.platz(min); this.d.setFillColor(...C.schwarz); this.d.rect(this.L, this.y, this.R - this.L, 18, 'F');
    this.d.setFillColor(...C.rot); this.d.rect(this.L, this.y, 4, 18, 'F');
    this.schrift('bold', 9, [255, 255, 255]); this.d.text(t, this.L + 12, this.y + 12.5); this.y += 24;
  }
  felder(paare) { // [[Label, Wert, halb?]]
    let i = 0;
    while (i < paare.length) {
      const reihe = paare[i][2] && paare[i + 1] && paare[i + 1][2] ? [paare[i], paare[i + 1]] : [paare[i]];
      i += reihe.length;
      const breit = (this.R - this.L) / reihe.length;
      this.schrift('normal', 9.5);
      const werte = reihe.map(p => this.d.splitTextToSize(String(p[1] ?? '') || '–', breit - 12));
      const h = Math.max(...werte.map(w => w.length)) * 11.5 + 14;
      this.platz(h);
      reihe.forEach((p, k) => {
        const x = this.L + k * breit;
        this.schrift('normal', 7, C.grau); this.d.text(p[0], x, this.y + 7);
        this.schrift('normal', 9.5); this.d.text(werte[k], x, this.y + 17.5);
        this.d.setDrawColor(...C.linie); this.d.setLineWidth(0.5); this.d.line(x, this.y + h - 3, x + breit - 10, this.y + h - 3);
      });
      this.y += h + 1;
    }
    this.y += 3;
  }
  tabelle(spalten, zeilen, fussText) { // spalten [{t, w}]
    const ges = spalten.reduce((s, x) => s + x.w, 0), f = (this.R - this.L) / ges;
    const sp = spalten.map(s => ({...s, w: s.w * f}));
    const kopf = () => {
      this.d.setFillColor(...C.hell); this.d.rect(this.L, this.y, this.R - this.L, 16, 'F');
      this.schrift('bold', 7.5, C.grau); let x = this.L + 4; sp.forEach(s => { this.d.text(s.t, x, this.y + 11); x += s.w; }); this.y += 16;
    };
    this.platz(40); kopf();
    zeilen.forEach(z => {
      this.schrift('normal', 8.5);
      const teile = z.map((v, i) => this.d.splitTextToSize(String(v ?? ''), sp[i].w - 8));
      const h = Math.max(...teile.map(t => t.length || 1)) * 10.5 + 7;
      if (this.y + h > 790) { this.seite(); kopf(); this.schrift('normal', 8.5); }
      let x = this.L + 4; teile.forEach((t, i) => { this.d.text(t, x, this.y + 11); x += sp[i].w; });
      this.d.setDrawColor(...C.linie); this.d.setLineWidth(0.5); this.d.line(this.L, this.y + h, this.R, this.y + h);
      this.y += h;
    });
    if (fussText) { this.platz(16); this.schrift('bold', 8.5); this.d.text(fussText, this.R - 4, this.y + 11, {align: 'right'}); this.y += 16; }
    this.y += 8;
  }
  absatz(text, gr = 9.5, farbe = C.text, stil = 'normal') {
    if (!text) return;
    this.schrift(stil, gr, farbe);
    for (const z of this.d.splitTextToSize(String(text), this.R - this.L)) { this.platz(gr + 4); this.d.text(z, this.L, this.y + gr); this.y += gr + 4; }
    this.y += 6;
  }
  async fotos(dateien, beschrift = () => '') { // zwei Bilder je Reihe
    const bilder = dateien.filter(istBild); if (!bilder.length) return;
    const bw = (this.R - this.L - 12) / 2, maxH = 190;
    for (let i = 0; i < bilder.length; i += 2) {
      const reihe = bilder.slice(i, i + 2);
      const hs = reihe.map(b => Math.min(maxH, bw * (b.h || 3) / (b.w || 4)));
      const h = Math.max(...hs) + 22; this.platz(h);
      for (let k = 0; k < reihe.length; k++) {
        const b = reihe[k], w = Math.min(bw, hs[k] * (b.w || 4) / (b.h || 3));
        try { this.d.addImage(await dataUrl(b.blob), 'JPEG', this.L + k * (bw + 12), this.y, w, hs[k]); } catch (e) { /* Bild übersprungen */ }
        this.schrift('normal', 7.5, C.grau); this.d.text(this.d.splitTextToSize(beschrift(b, i + k), bw)[0] || '', this.L + k * (bw + 12), this.y + hs[k] + 10);
      }
      this.y += h;
    }
    this.y += 4;
  }
  unterschriften(liste) { // [[Label, dataUrl]], zwei nebeneinander
    if (!liste.length) return;
    const bw = (this.R - this.L - 20) / 2;
    for (let i = 0; i < liste.length; i += 2) {
      this.platz(66);
      liste.slice(i, i + 2).forEach((u, k) => {
        const x = this.L + k * (bw + 20);
        if (u[1]) try { this.d.addImage(u[1], 'PNG', x, this.y, 135, 45); } catch (e) { /* leer */ }
        this.d.setDrawColor(...C.schwarz); this.d.setLineWidth(0.6); this.d.line(x, this.y + 48, x + bw, this.y + 48);
        this.schrift('normal', 7.5, C.grau); this.d.text(u[0], x, this.y + 57);
      });
      this.y += 66;
    }
  }
  blob() {
    const n = this.d.getNumberOfPages(), F = CFG.firma;
    for (let i = 1; i <= n; i++) {
      this.d.setPage(i); this.schrift('normal', 7, C.grau);
      this.d.text([F.name, F.strasse, F.ort, F.web].filter(Boolean).join('  ·  '), this.L, 820);
      this.d.text(`Seite ${i} von ${n}`, this.R, 820, {align: 'right'});
    }
    return this.d.output('blob');
  }
}

const pdfName = (art, projekt, datum) => `${kompakt(datum)} ${art} ${dateiname(projekt.name)}.pdf`;

// ---------- Formular als PDF ----------
async function formularPdf(memo, projekt) {
  await logoLaden();
  const f = formular(memo.formular.vorlage), w = memo.formular.werte;
  const p = new Pdf(f.titel);
  p.h1(f.titel, f.unter, f.rechts);
  for (const a of f.abschnitte) {
    const sigs = [];
    p.balken(a.t, a.felder.some(x => x.t === 'unterschrift') ? 110 : 60);
    let paare = [];
    const flush = () => { if (paare.length) { p.felder(paare); paare = []; } };
    for (const x of a.felder) {
      const v = w[x.k];
      if (x.t === 'unterschrift') { sigs.push([x.l, v]); continue; }
      if (x.t === 'pruefliste') {
        flush();
        const kurz = {io: 'i. O.', m: 'Mangel', b: 'behoben', e: 'entfällt'};
        const kurzJN = {io: 'erfüllt', m: 'nicht erfüllt', e: 'entfällt'};
        const namen = x.stufen ? Object.fromEntries(x.stufen) : x.nurJaNein ? kurzJN : kurz;
        if (x.stufen && (v || []).every(z => z.s === 'e')) { p.absatz('Nicht relevant für diese Baustelle.', 8.5, C.grau); continue; }
        p.tabelle([{t: 'Nr.', w: 25}, {t: x.stufen ? 'Gefährdung und Maßnahme' : 'Prüfpunkt', w: 290}, {t: x.stufen ? 'Maßnahme' : 'Ergebnis', w: 70}, {t: 'Bemerkung / Foto', w: 130}],
          (v || []).map((z, i) => [i + 1, x.punkte[i], namen[z.s] || '', z.bem]));
        continue;
      }
      if (x.t === 'tabelle') {
        flush();
        const zeilen = (v || []).filter(z => x.spalten.some(s => z[s.k]));
        if (x.l) p.absatz(x.l, 8, C.grau, 'bold');
        p.tabelle(x.spalten.map(s => ({t: s.l, w: s.w})), zeilen.map(z => x.spalten.map(s => s.t === 'berechnet' ? fmt(aufmassMenge(z), 2) : s.t === 'date' ? dat(z[s.k]) : z[s.k])), tabSumme(x, zeilen));
        continue;
      }
      const wert = x.t === 'date' ? dat(v) : x.t === 'mehrfach' ? (v || []).join(', ') : x.t === 'number' && zahl(v) != null ? fmt(zahl(v), x.k === 'kosten' ? 2 : (String(v).includes(',') || String(v).includes('.') ? 2 : 0)) : v;
      const lang = x.t === 'textarea';
      if (lang) { flush(); p.felder([[x.l, wert]]); } else paare.push([x.l, wert, !!x.halb]);
    }
    flush();
    p.unterschriften(sigs);
  }
  if (f.fuss) p.absatz(f.fuss, 8, C.grau);
  const fotos = await dateienVon(memo.id);
  if (fotos.some(istBild)) { p.balken('Fotos', 220); await p.fotos(fotos, (b, i) => `Foto ${i + 1}`); }
  return {blob: p.blob(), name: pdfName(f.titel, projekt, w.datum || memo.datum)};
}

// ---------- Berichte aus Memos ----------
const BERICHTE = [
  {id: 'foto', titel: 'Fotodokumentation', text: ''},
  {id: 'fortschritt', titel: 'Baufortschritt', text: 'Sehr geehrte Damen und Herren,\nanbei der aktuelle Stand der Arbeiten an Ihrem Bauvorhaben.'},
  {id: 'schaden', titel: 'Schadensbericht', text: 'Bei der Besichtigung wurden die folgenden Schäden festgestellt und fotografisch dokumentiert.'},
  {id: 'zusatz', titel: 'Nachweis Zusatzleistungen', text: 'Die folgenden Leistungen waren nicht Bestandteil des Auftrags und wurden auf Anordnung bzw. nach Rücksprache zusätzlich ausgeführt (§ 2 Abs. 5 und 6 VOB/B bzw. § 650b BGB).'},
  {id: 'abnahme', titel: 'Fotodokumentation zur Abnahme', text: 'Dokumentation des Zustands der Leistung bei Fertigstellung.'},
  {id: 'aufgaben', titel: 'Aufgaben und Mängel', text: ''}
];
async function berichtPdf(projekt, memos, art, einleitung) {
  await logoLaden();
  const b = BERICHTE.find(x => x.id === art) || BERICHTE[0];
  const p = new Pdf(b.titel);
  p.h1(b.titel, `${projekt.name}${projekt.adresse ? ', ' + projekt.adresse : ''}`, 'Stand ' + dat(heute()));
  p.felder([['Auftraggeber', projekt.kunde, 1], ['Auftrags-Nr.', projekt.auftragsnr, 1]]);
  p.absatz(einleitung);
  if (art === 'aufgaben') {
    const z = memos.filter(m => m.aufgabe).map((m, i) => [i + 1, (m.text || m.titel || '').slice(0, 300), m.aufgabe.an, dat(m.aufgabe.frist), m.aufgabe.status === 'erledigt' ? 'erledigt ' + dat(m.aufgabe.erledigt) : 'offen']);
    p.tabelle([{t: 'Nr.', w: 25}, {t: 'Beschreibung', w: 260}, {t: 'Zuständig', w: 90}, {t: 'Frist', w: 60}, {t: 'Status', w: 80}], z);
  }
  let n = 0;
  for (const m of memos.sort((a, c) => (a.datum || '').localeCompare(c.datum || ''))) {
    n++;
    const kopf = [`${n}.  ${datZeit(m.datum)}`, m.ordner, m.autor].filter(Boolean).join('   ·   ');
    p.platz(60); p.schrift('bold', 10, C.schwarz); p.d.text(kopf, p.L, p.y + 10);
    p.d.setDrawColor(...C.rot); p.d.setLineWidth(1); p.d.line(p.L, p.y + 15, p.L + 40, p.y + 15); p.y += 22;
    if (m.tags?.length) p.absatz('Schlagworte: ' + m.tags.join(', '), 8, C.grau);
    if (m.titel) p.absatz(m.titel, 10, C.text, 'bold');
    p.absatz(m.text);
    if (m.aufgabe && ['foto', 'schaden', 'aufgaben'].includes(art)) p.absatz(`Aufgabe: ${m.aufgabe.an || 'nicht zugewiesen'}${m.aufgabe.frist ? ', Frist ' + dat(m.aufgabe.frist) : ''}, ${m.aufgabe.status === 'erledigt' ? 'erledigt am ' + dat(m.aufgabe.erledigt) : 'offen'}`, 8.5, m.aufgabe.status === 'erledigt' ? C.gruen : C.rot);
    if (m.typ === 'formular') p.absatz(`Formular: ${formular(m.formular.vorlage)?.titel || ''} (eigenes PDF)`, 8.5, C.grau);
    await p.fotos(await dateienVon(m.id), (f, i) => `Bild ${n}.${i + 1}`);
    p.y += 6;
  }
  return {blob: p.blob(), name: pdfName(b.titel, projekt, heute())};
}

// ---------- Scan als PDF ----------
async function scanPdf(memo, projekt) {
  const seiten = (await dateienVon(memo.id)).filter(istBild);
  const d = new jspdf.jsPDF({unit: 'pt', format: 'a4', compress: true});
  d.setProperties({title: memo.titel || 'Scan', author: CFG.firma.name, creator: CFG.firma.name});
  for (let i = 0; i < seiten.length; i++) {
    if (i) d.addPage();
    const s = seiten[i], f = Math.min(595 / s.w, 842 / s.h), w = s.w * f, h = s.h * f;
    d.addImage(await dataUrl(s.blob), 'JPEG', (595 - w) / 2, (842 - h) / 2, w, h);
  }
  return {blob: d.output('blob'), name: `${kompakt(memo.datum)} ${dateiname(memo.titel || 'Scan')} ${dateiname(projekt.name)}.pdf`};
}
