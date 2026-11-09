'use strict';
// Formularvorlagen für Dachdecker- und Klempnerarbeiten. Ausfüllen am Handy, PDF mit Firmenkopf.
// Rechtsbezüge: VOB/B Fassung 2016, BGB, VOB/C ATV DIN 18338 und DIN 18339, Arbeitsschutz. Formulare ersetzen keine Rechtsberatung.

const MASSNAHME = ['', 'sofort', 'später', 'Angebot'];
const JN = ['', 'ja', 'nein', 'entfällt'];
const kopfObjekt = [
  {k: 'auftraggeber', l: 'Auftraggeber', t: 'text', vor: 'kunde'},
  {k: 'objekt', l: 'Objekt / Baustelle', t: 'text', vor: 'objekt'},
  {k: 'datum', l: 'Datum', t: 'date', vor: 'heute', halb: 1},
  {k: 'auftragsnr', l: 'Auftrags-Nr.', t: 'text', vor: 'auftragsnr', halb: 1}
];
const unterschriften = (a = 'Hartmann Dächer', b = 'Auftraggeber') => ({t: 'Bestätigung', felder: [
  {k: 'ortdatum', l: 'Ort, Datum', t: 'text', vor: 'ortdatum'},
  {k: 'sigAN', l: 'Unterschrift ' + a, t: 'unterschrift'},
  {k: 'nameAG', l: 'Name ' + b + ' (Druckschrift)', t: 'text'},
  {k: 'sigAG', l: 'Unterschrift ' + b, t: 'unterschrift'}]});

const PRUEF_STEIL = ['Deckung: verschobene, gebrochene oder fehlende Ziegel/Platten', 'Befestigung und Sturmsicherung der Deckung',
  'Moos, Laub, Verschmutzung auf der Dachfläche entfernt', 'First, Ortgang, Traufe, Dachrand', 'Blechanschlüsse, Abdeckungen, Kanten',
  'Dachrinne gereinigt, Rinnenhalter fest', 'Fallrohr / Ablauf frei, Anschluss an Entwässerung', 'Lichtplatten / Dachverglasung (falls vorhanden): Risse, Befestigung',
  'Untersicht: Feuchte- und Wasserflecken, Tropfstellen', 'Tragkonstruktion, Pfetten, Sparren, Befestigungen (Sicht)',
  'Anbauten am Dach (Beleuchtung, Schilder, Werbeträger): Befestigung (Sicht)'];
const PRUEF_FLACH = ['Abdichtung: Blasen, Risse, Falten, offene Nähte, Beschädigungen', 'Stehendes Wasser / Pfützenbildung',
  'Laub, Moos, Bewuchs, Verschmutzung entfernt', 'Auflast (Kies, Platten) gleichmäßig, Windsogsicherung', 'Dachrand, Attika, Randabschlussprofile, Abdeckungen',
  'Wand- und Türanschlüsse, Kappleisten, Durchdringungen', 'Dachabläufe / Rinnen gereinigt, Kiesfangkörbe vorhanden', 'Notüberläufe, Speier, Fallrohre frei',
  'Lichtkuppeln / Lichtplatten: Risse, Befestigung, Anschluss', 'Untersicht: Feuchte- und Wasserflecken, Tropfstellen',
  'Aufbauten (PV, Beleuchtung, Schilder, Werbeträger): Befestigung (Sicht)'];
const wartungsMaengel = {t: 'Mängel und durchgeführte Arbeiten', felder: [{k: 'maengel', t: 'tabelle', spalten: [
  {k: 'arbeit', l: 'Mangel / Arbeit', w: 250}, {k: 'material', l: 'Material / Zeit', w: 140}, {k: 'massnahme', l: 'Maßnahme', w: 125, t: 'select', o: MASSNAHME}]},
  {k: 'sicherung', l: 'Absturzsicherung / Leiter / Hubarbeitsbühne geeignet', t: 'select', o: JN, halb: 1},
  {k: 'naechste', l: 'Nächste Wartung', t: 'date', halb: 1}]};

// Gefährdungsbeurteilung: Stufen je Gefährdung (Maßnahme umgesetzt, offen, nicht relevant)
const GB_STUFEN = [['io', 'umgesetzt'], ['m', 'offen'], ['e', 'nicht relevant']];
const gb = (t, punkte) => ({t, felder: [{k: 'gb_' + t.toLowerCase().replace(/[^a-zäöüß]+/g, '_'), t: 'pruefliste', stufen: GB_STUFEN, punkte}]});
const GEFAEHRDUNG = [
  gb('Absturz und Durchsturz', [
    'Absturz an Traufe, Ortgang, Dachrand, Attika: Seitenschutz, Dachfanggerüst oder Auffangnetz; PSAgA nur, wenn kollektiver Schutz nicht möglich (ASR A2.1, DGUV Vorschrift 38)',
    'Durchsturz durch nicht durchtrittsichere Flächen (Lichtplatten, Lichtkuppeln, Faserzement, Dämmung, Schalung): Abdeckung, Umwehrung, lastverteilende Beläge, Netze',
    'Öffnungen im Dach (Dachfenster, Gaubenöffnung, Treppenauge, Kaminöffnung): tragfähig und unverschiebbar abgedeckt und gekennzeichnet oder umwehrt',
    'PSAgA: geeignete und geprüfte Anschlageinrichtung, Ausrüstung geprüft, Rettung aus dem Gurt geplant und geübt',
    'Gerüst: vom Ersteller geprüft, gekennzeichnet und freigegeben, Sichtprüfung durch Benutzer vor Arbeitsbeginn (TRBS 2121-1)',
    'Leiter: nur kurzzeitige Arbeiten geringen Umfangs, geprüft, gegen Wegrutschen gesichert, 1 m über Austritt (TRBS 2121-2)',
    'Hubarbeitsbühne: Bediener unterwiesen und schriftlich beauftragt, PSAgA im Korb, tragfähiger Untergrund',
    'Zimmerer: Montage von Dachstuhl, Wänden, Decken mit Montagegerüst, Montageplan und Anschlagpunkten; Lagesicherung der Bauteile']),
  gb('Herabfallende Gegenstände und Transport', [
    'Gefahrenbereich unten abgesperrt und gekennzeichnet, Schutzdach über Zugängen, Schuttrutsche statt Werfen',
    'Material auf dem Dach gegen Abrutschen und Windsog gesichert, zulässige Dachlast beachtet',
    'Dachdecker- oder Schrägaufzug: nach Betriebsanleitung aufgestellt, geprüft, keine Personenbeförderung',
    'Kran: Anschläger unterwiesen, geeignete und geprüfte Anschlagmittel, keine Lasten über Personen, Einweiser',
    'Bauteiltransport von Hand auf Dach und Gerüst: Lasten gesichert, freie Verkehrswege']),
  gb('Elektrische Gefährdungen', [
    'Freileitungen und Dachständer in Arbeitsnähe: Schutzabstand, Abschaltung oder Abdeckung mit dem Netzbetreiber',
    'PV-Anlage auf dem Dach: Gleichspannung auch bei Abschaltung, Module nicht betreten, Arbeiten an der Anlage nur durch Elektrofachkraft',
    'Elektrische Betriebsmittel und Leitungen geprüft, Baustromverteiler mit Fehlerstromschutz']),
  gb('Gefahrstoffe', [
    'Asbest (Faserzement vor 1993, Wellplatten, Fensterbänke, Kaminverkleidung): Erkundung vor Beginn; Arbeiten nur mit Sachkunde, Anzeige und Schutzmaßnahmen nach TRGS 519',
    'Alte Mineralwolle (vor 2000): staubarm ausbauen, verpacken, Schutzanzug und Atemschutz (TRGS 521)',
    'Teerhaltige Bahnen, PAK, alte Holzschutzmittel: Erkundung, Schutzmaßnahmen nach TRGS 551 bzw. Sicherheitsdatenblatt',
    'Quarzstaub beim Schneiden von Dachsteinen, Ziegeln, Faserzement: Nassschnitt oder Absaugung, Atemschutz (TRGS 559)',
    'Zimmerer: Holzstaub beim Sägen und Schleifen, Absaugung; Eichen- und Buchenholzstaub krebserzeugend (TRGS 553)',
    'Bitumen, Kleber, PU-Schaum, Lösemittel, Holzschutzmittel: Sicherheitsdatenblatt, Betriebsanweisung, Hautschutzplan, Lüftung',
    'Klempner/Spengler: Löt- und Schweißrauch, Flussmittel: Lüftung oder Absaugung, Atemschutz bei Bedarf']),
  gb('Brand und Explosion', [
    'Heißarbeiten (Schweißbahn, Löten, Flämmen): Erlaubnisschein, brennbare Stoffe entfernt oder abgedeckt, Feuerlöscher, Brandwache und Nachkontrolle',
    'Flüssiggasflaschen: aufrecht und gesichert, Schläuche und Druckregler geprüft, nicht in Kellern oder Gruben, Flaschen nach Arbeitsende vom Dach']),
  gb('Umgebung, Witterung, Lärm', [
    'Natürliche UV-Strahlung und Hitze: Schatten, Pausen, Trinkwasser, Kopf- und Nackenschutz, Sonnenschutzmittel; Angebotsvorsorge nach ArbMedVV und AMR 13.3',
    'Witterung: bei Sturm, Gewitter, Glätte durch Nässe, Reif oder Eis Arbeiten einstellen',
    'Lärm (Trennschleifer, Kreissäge, Nagler, Kompressor): Gehörschutz, Vorsorge nach ArbMedVV',
    'Hand-Arm-Vibrationen: vibrationsarme Geräte, Einwirkzeit begrenzen',
    'Schnitt- und Stichverletzungen (Bleche, Nagler, Sägen, Kettensäge): Schutzeinrichtungen, Schnittschutzhandschuhe, Schutzbrille',
    'Biologische Gefährdungen (Taubenkot, Insekten- und Wespennester, Schimmel): Atemschutz, Schutzanzug, ggf. Fachfirma']),
  gb('Körperliche Belastung', [
    'Heben und Tragen (Ziegelpakete, Bahnenrollen, Balken, Bleche): Hebezeuge und Transporthilfen, zu zweit tragen',
    'Zwangshaltungen und Knien auf dem Dach: Kniepolster, Tätigkeitswechsel, Pausen']),
  gb('Organisation', [
    'Unterweisung vor Arbeitsbeginn und mindestens jährlich, dokumentiert (§ 12 ArbSchG)',
    'Persönliche Schutzausrüstung vollständig: Helm, Sicherheitsschuhe, Handschuhe, Schutzbrille, Gehörschutz, Warnkleidung',
    'Erste Hilfe: Ersthelfer vor Ort, Verbandkasten, Notrufnummer und Rettungsweg bekannt, Rettung vom Dach geplant',
    'Alleinarbeit vermieden oder Überwachung und Notruf sichergestellt',
    'Baustellenverordnung: Vorankündigung und SiGe-Koordinator bei mehreren Arbeitgebern geprüft',
    'Fremdfirmen und andere Gewerke abgestimmt (§ 8 ArbSchG), Aufsichtführender benannt'])
];

const FORMULARE = [
  {id: 'rapport', titel: 'Rapportzettel', unter: 'Stundenlohnarbeiten / Regiebericht', ordner: 'Rapportzettel', rechts: '§ 15 Abs. 3 VOB/B',
    hinweis: 'Bei VOB/B-Verträgen Stundenlohnzettel je nach Verkehrssitte werktäglich oder wöchentlich einreichen. Nicht fristgerecht (6 Werktage) zurückgegebene Zettel gelten als anerkannt (§ 15 Abs. 3 Satz 5 VOB/B). Stundenlohnarbeiten vor Beginn ankündigen.',
    abschnitte: [
      {t: 'Angaben', felder: [...kopfObjekt, {k: 'von', l: 'Arbeitszeit von', t: 'time', halb: 1}, {k: 'bis', l: 'bis', t: 'time', halb: 1},
        {k: 'art', l: 'Art', t: 'select', o: ['', 'Stundenlohnarbeit (beauftragt)', 'Zusatzleistung, Nachtrag folgt', 'Reparatur', 'Wartung', 'Notsicherung']}]},
      {t: 'Mitarbeiter', felder: [{k: 'personal', t: 'tabelle', summe: 'std', spalten: [{k: 'name', l: 'Name', w: 230, t: 'mitarbeiter'}, {k: 'quali', l: 'Funktion', w: 160, t: 'select', o: ['', 'Meister', 'Geselle', 'Helfer', 'Auszubildender']}, {k: 'std', l: 'Stunden', w: 125, t: 'number'}]}]},
      {t: 'Ausgeführte Arbeiten', felder: [{k: 'arbeiten', l: 'Beschreibung', t: 'textarea'}]},
      {t: 'Material', felder: [{k: 'material', t: 'tabelle', spalten: [{k: 'menge', l: 'Menge', w: 70, t: 'number'}, {k: 'einheit', l: 'Einheit', w: 70, t: 'select', o: ['', 'Stk', 'm', 'm²', 'kg', 'l', 'Rolle', 'Paket', 'pauschal']}, {k: 'bez', l: 'Bezeichnung', w: 375}]}]},
      {t: 'Geräte und Fahrzeuge', felder: [{k: 'geraete', t: 'tabelle', spalten: [{k: 'geraet', l: 'Gerät', w: 330, t: 'select', o: ['', 'Gerüst', 'Dachdeckeraufzug', 'Hubarbeitsbühne', 'Kran', 'Container / Entsorgung', 'Fahrzeug', 'Schweißgerät']}, {k: 'dauer', l: 'Stunden / Tage', w: 185}]}]},
      unterschriften('Mitarbeiter')]},
  {id: 'bautagesbericht', titel: 'Bautagesbericht', ordner: 'Fotos',
    abschnitte: [
      {t: 'Angaben', felder: [...kopfObjekt, {k: 'wetter', l: 'Wetter', t: 'select', o: ['', 'sonnig', 'bewölkt', 'Regen', 'Schnee', 'Frost', 'Sturm'], halb: 1}, {k: 'temp', l: 'Temperatur °C', t: 'number', halb: 1}]},
      {t: 'Personal', felder: [{k: 'personal', t: 'tabelle', summe: 'std', spalten: [{k: 'name', l: 'Name', w: 330, t: 'mitarbeiter'}, {k: 'std', l: 'Stunden', w: 185, t: 'number'}]}]},
      {t: 'Tagesverlauf', felder: [{k: 'arbeiten', l: 'Ausgeführte Arbeiten', t: 'textarea'}, {k: 'lieferungen', l: 'Lieferungen / Material', t: 'textarea'},
        {k: 'vorkommnisse', l: 'Besondere Vorkommnisse, Behinderungen', t: 'textarea'}, {k: 'anordnungen', l: 'Anordnungen des Auftraggebers', t: 'textarea'}]},
      {t: 'Unterschrift', felder: [{k: 'sigAN', l: 'Unterschrift Bauleitung / Vorarbeiter', t: 'unterschrift'}]}]},
  {id: 'wartung-steil', titel: 'Wartungsprotokoll Steildach', unter: 'Fachregeln des Deutschen Dachdeckerhandwerks', ordner: 'Wartung',
    fuss: 'Dokumentiert wird der bei der Begehung sichtbare Zustand; verdeckte Bauteile wurden nicht geöffnet.',
    abschnitte: [
      {t: 'Objekt', felder: [...kopfObjekt, {k: 'ausfuehrende', l: 'Ausführende', t: 'text', vor: 'benutzer'},
        {k: 'witterung', l: 'Witterung', t: 'mehrfach', o: ['trocken', 'nass', 'Wind']}, {k: 'deckung', l: 'Deckung', t: 'mehrfach', o: ['Ziegel', 'Dachstein', 'Schiefer', 'Metall', 'Faserzement', 'Bitumenschindel']},
        {k: 'flaeche', l: 'Dachfläche ca. m²', t: 'number'}]},
      {t: 'Prüfung und Wartung', felder: [{k: 'pruefung', t: 'pruefliste', punkte: PRUEF_STEIL}]},
      wartungsMaengel, unterschriften()]},
  {id: 'wartung-flach', titel: 'Wartungsprotokoll Flachdach', unter: 'DIN 18531-4, Flachdachrichtlinie (ZVDH)', ordner: 'Wartung',
    fuss: 'Dokumentiert wird der bei der Begehung sichtbare Zustand; verdeckte Bauteile wurden nicht geöffnet.',
    abschnitte: [
      {t: 'Objekt', felder: [...kopfObjekt, {k: 'ausfuehrende', l: 'Ausführende', t: 'text', vor: 'benutzer'},
        {k: 'witterung', l: 'Witterung', t: 'mehrfach', o: ['trocken', 'nass', 'Wind']}, {k: 'abdichtung', l: 'Abdichtung', t: 'mehrfach', o: ['Bitumen', 'Kunststoff', 'EPDM', 'Flüssig', 'Metall']},
        {k: 'oberflaeche', l: 'Oberfläche', t: 'mehrfach', o: ['frei bewittert', 'Kies', 'Begrünung', 'Platten']},
        {k: 'flaeche', l: 'Dachfläche ca. m²', t: 'number', halb: 1}, {k: 'ablaeufe', l: 'Abläufe / Notüberläufe', t: 'text', halb: 1}]},
      {t: 'Prüfung und Wartung', felder: [{k: 'pruefung', t: 'pruefliste', punkte: PRUEF_FLACH}]},
      wartungsMaengel, unterschriften()]},
  {id: 'aufmass', titel: 'Aufmaß', unter: 'Abrechnung nach VOB/C ATV DIN 18338 bzw. DIN 18339, jeweils Abschnitt 5', ordner: 'Aufmaß',
    hinweis: 'Menge = Anzahl × Länge × Breite. Leere Maße zählen nicht. Abzüge mit negativer Anzahl. Übermessungsgrenzen nach Abschnitt 5 der ATV beachten.',
    abschnitte: [
      {t: 'Angaben', felder: [...kopfObjekt, {k: 'gemeinsam', l: 'Gemeinsames Aufmaß mit Auftraggeber (§ 14 Abs. 2 VOB/B)', t: 'select', o: JN}]},
      {t: 'Positionen', felder: [{k: 'pos', t: 'tabelle', rechnen: 'aufmass', spalten: [{k: 'nr', l: 'Pos.', w: 40}, {k: 'bez', l: 'Bezeichnung', w: 175},
        {k: 'anz', l: 'Anz.', w: 45, t: 'number'}, {k: 'l', l: 'Länge m', w: 60, t: 'number'}, {k: 'b', l: 'Breite m', w: 60, t: 'number'},
        {k: 'einheit', l: 'Einh.', w: 50, t: 'select', o: ['m²', 'm', 'Stk', 'psch']}, {k: 'menge', l: 'Menge', w: 85, t: 'berechnet'}]}]},
      unterschriften()]},
  {id: 'abnahme', titel: 'Abnahmeprotokoll', ordner: 'Abnahme', rechts: '§ 640 BGB, § 12 VOB/B',
    abschnitte: [
      {t: 'Angaben', felder: [...kopfObjekt, {k: 'leistung', l: 'Abgenommene Leistung', t: 'textarea'}, {k: 'anwesend', l: 'Anwesende', t: 'textarea'}]},
      {t: 'Ergebnis', felder: [
        {k: 'ergebnis', l: 'Ergebnis', t: 'select', o: ['', 'Abnahme erteilt, keine Mängel', 'Abnahme erteilt unter Vorbehalt der aufgeführten Mängel', 'Abnahme verweigert wegen wesentlicher Mängel (§ 12 Abs. 3 VOB/B)']},
        {k: 'maengel', t: 'tabelle', spalten: [{k: 'mangel', l: 'Mangel / Ort', w: 330}, {k: 'frist', l: 'Frist Beseitigung', w: 95, t: 'date'}, {k: 'bem', l: 'Bemerkung', w: 90}]},
        {k: 'vertragsstrafe', l: 'Vorbehalt Vertragsstrafe erklärt (§ 11 Abs. 4 VOB/B, § 341 Abs. 3 BGB)', t: 'select', o: JN},
        {k: 'gewaehr', l: 'Beginn der Verjährung der Mängelansprüche', t: 'date', halb: 1}, {k: 'dauer', l: 'Verjährungsfrist laut Vertrag', t: 'text', halb: 1},
        {k: 'bem', l: 'Bemerkungen', t: 'textarea'}]},
      unterschriften()]},
  {id: 'schaden', titel: 'Schadensaufnahme', unter: 'Sturm, Hagel, Wasser, für Versicherung und Kunde', ordner: 'Mängel und Schäden',
    hinweis: 'Sturm im Sinne der üblichen Wohngebäudeversicherung (VGB) ab Windstärke 8 Beaufort; Nachweis über Wetterdienst. Schaden vor Reparatur fotografieren, Notsicherung dokumentieren.',
    abschnitte: [
      {t: 'Angaben', felder: [...kopfObjekt, {k: 'schadentag', l: 'Schadentag', t: 'date', halb: 1}, {k: 'besichtigt', l: 'Besichtigt am', t: 'date', vor: 'heute', halb: 1},
        {k: 'versicherung', l: 'Versicherung', t: 'text', halb: 1}, {k: 'schadennr', l: 'Schaden-Nr.', t: 'text', halb: 1}]},
      {t: 'Schaden', felder: [
        {k: 'ursache', l: 'Ursache (Einschätzung)', t: 'mehrfach', o: ['Sturm', 'Hagel', 'Starkregen', 'Schneelast', 'Blitz', 'Baum / Fremdeinwirkung', 'Alterung / Verschleiß', 'unbekannt']},
        {k: 'bauteile', l: 'Betroffene Bauteile', t: 'mehrfach', o: ['Deckung', 'First / Grat', 'Ortgang', 'Unterdach', 'Abdichtung', 'Rinne / Fallrohr', 'Blechanschlüsse', 'Kamin', 'Gaube', 'Dachfenster', 'Fassade', 'Innenraum']},
        {k: 'beschreibung', l: 'Beschreibung', t: 'textarea'}, {k: 'flaeche', l: 'Schadensfläche ca.', t: 'text', halb: 1}, {k: 'folge', l: 'Folgeschäden innen', t: 'select', o: JN, halb: 1}]},
      {t: 'Maßnahmen', felder: [{k: 'notsicherung', l: 'Notsicherung durchgeführt', t: 'textarea'}, {k: 'empfehlung', l: 'Empfohlene Instandsetzung', t: 'textarea'},
        {k: 'kosten', l: 'Kosten geschätzt (netto) €', t: 'number'}]},
      {t: 'Unterschrift', felder: [{k: 'sigAN', l: 'Unterschrift Hartmann Dächer', t: 'unterschrift'}]}]},
  {id: 'behinderung', titel: 'Behinderungsanzeige', ordner: 'Mängel und Schäden', rechts: '§ 6 Abs. 1 VOB/B, § 642 BGB',
    hinweis: 'Unverzüglich schriftlich anzeigen. Ausführungsfristen verlängern sich um die Dauer der Behinderung zuzüglich Wiederaufnahme (§ 6 Abs. 2 und 4 VOB/B). Weiter leisten, soweit möglich (§ 6 Abs. 3).',
    abschnitte: [
      {t: 'Angaben', felder: [...kopfObjekt, {k: 'empfaenger', l: 'Empfänger (Auftraggeber / Bauleitung)', t: 'textarea'}]},
      {t: 'Behinderung', felder: [{k: 'seit', l: 'Behindert seit', t: 'date', halb: 1}, {k: 'dauer', l: 'Voraussichtliche Dauer', t: 'text', halb: 1},
        {k: 'ursache', l: 'Ursache', t: 'select', o: ['', 'Vorleistung anderer Gewerke fehlt oder mangelhaft', 'Fehlende Pläne / Angaben / Freigaben', 'Anordnung des Auftraggebers', 'Baustelle nicht zugänglich / Gerüst fehlt', 'Witterung über das übliche Maß', 'Sonstiges']},
        {k: 'beschreibung', l: 'Beschreibung', t: 'textarea'}, {k: 'auswirkung', l: 'Auswirkungen auf Termine und Kosten', t: 'textarea'},
        {k: 'forderung', l: 'Wir bitten um', t: 'textarea', v: 'Beseitigung der Behinderung und Mitteilung, wann die Arbeiten fortgesetzt werden können. Mehrkosten behalten wir uns vor.'}]},
      {t: 'Unterschrift', felder: [{k: 'sigAN', l: 'Unterschrift Hartmann Dächer', t: 'unterschrift'}]}]},
  {id: 'bedenken', titel: 'Bedenkenanmeldung', ordner: 'Mängel und Schäden', rechts: '§ 4 Abs. 3, § 13 Abs. 3 VOB/B',
    hinweis: 'Bedenken gegen Ausführungsart, Stoffe, Bauteile oder Vorleistungen anderer möglichst vor Beginn schriftlich mitteilen. Ohne Anmeldung haftet der Auftragnehmer für daraus entstehende Mängel.',
    abschnitte: [
      {t: 'Angaben', felder: [...kopfObjekt, {k: 'empfaenger', l: 'Empfänger (Auftraggeber / Bauleitung)', t: 'textarea'}]},
      {t: 'Bedenken', felder: [{k: 'gegen', l: 'Bedenken gegen', t: 'select', o: ['', 'die vorgesehene Art der Ausführung', 'gelieferte Stoffe oder Bauteile', 'Leistungen anderer Unternehmer (Vorleistung)', 'Anordnungen des Auftraggebers']},
        {k: 'beschreibung', l: 'Sachverhalt', t: 'textarea'}, {k: 'folgen', l: 'Mögliche Folgen', t: 'textarea'}, {k: 'vorschlag', l: 'Vorschlag', t: 'textarea'},
        {k: 'antwort', l: 'Entscheidung erbeten bis', t: 'date'}]},
      {t: 'Unterschrift', felder: [{k: 'sigAN', l: 'Unterschrift Hartmann Dächer', t: 'unterschrift'}]}]},
  {id: 'gefaehrdung', titel: 'Gefährdungsbeurteilung', unter: 'Dach-, Zimmerer-, Klempner- und Abdichtungsarbeiten, baustellenbezogen', ordner: 'Anleitung', rechts: '§§ 5, 6 ArbSchG',
    hinweis: 'Vorlage für die Beurteilung je Baustelle; ergänzt die betriebliche Gefährdungsbeurteilung, ersetzt nicht die Beratung durch Fachkraft für Arbeitssicherheit bzw. BG BAU. Rangfolge: technisch vor organisatorisch vor persönlich (§ 4 ArbSchG). Grundlagen: DGUV Vorschrift 38, DGUV Information 201-054 (Fassung 2015, in Überarbeitung), ASR A2.1, BetrSichV mit TRBS 2121, GefStoffV mit TRGS, ArbMedVV. Nicht zutreffende Gruppen mit „Alles nicht relevant“ abhaken.',
    abschnitte: [
      {t: 'Angaben', felder: [...kopfObjekt,
        {k: 'gewerke', l: 'Gewerke', t: 'mehrfach', o: ['Dachdecker', 'Zimmerer', 'Klempner / Spengler', 'Flachdachabdichtung', 'Fassade', 'Gerüstbau', 'Abbruch / Rückbau']},
        {k: 'taetigkeiten', l: 'Tätigkeiten', t: 'textarea'},
        {k: 'traufe', l: 'Traufhöhe ca. m', t: 'number', halb: 1}, {k: 'neigung', l: 'Dachneigung °', t: 'number', halb: 1},
        {k: 'verantwortlich', l: 'Aufsichtführender', t: 'text', vor: 'benutzer', halb: 1}, {k: 'beschaeftigte', l: 'Anzahl Beschäftigte', t: 'number', halb: 1}]},
      ...GEFAEHRDUNG,
      {t: 'Weitere Gefährdungen und offene Maßnahmen', felder: [{k: 'massnahmen', t: 'tabelle', spalten: [
        {k: 'gef', l: 'Gefährdung / Maßnahme', w: 285}, {k: 'wer', l: 'Verantwortlich', w: 100, t: 'mitarbeiter'}, {k: 'bis', l: 'bis', w: 70, t: 'date'}, {k: 'erl', l: 'erledigt', w: 60, t: 'select', o: ['', 'ja', 'nein']}]}]},
      {t: 'Unterweisung der Beschäftigten', felder: [{k: 'unterwiesen', t: 'tabelle', spalten: [{k: 'name', l: 'Name', w: 300, t: 'mitarbeiter'}, {k: 'datum', l: 'Datum', w: 215, t: 'date'}]},
        {k: 'wirksam', l: 'Wirksamkeit der Maßnahmen geprüft am', t: 'date', halb: 1}, {k: 'wirksamVon', l: 'durch', t: 'text', halb: 1}]},
      {t: 'Bestätigung', felder: [{k: 'ortdatum', l: 'Ort, Datum', t: 'text', vor: 'ortdatum'},
        {k: 'sigUN', l: 'Unterschrift Unternehmer', t: 'unterschrift'}, {k: 'sigAF', l: 'Unterschrift Aufsichtführender', t: 'unterschrift'}]}]},
  {id: 'arbeitsschutz', titel: 'Arbeitsschutz Dacharbeiten', unter: 'Tagescheck vor Arbeitsbeginn', ordner: 'Anleitung', rechts: '§ 5 ArbSchG, BetrSichV, DGUV Vorschrift 38, ASR A2.1',
    abschnitte: [
      {t: 'Angaben', felder: [...kopfObjekt, {k: 'verantwortlich', l: 'Aufsichtführender', t: 'text', vor: 'benutzer'}, {k: 'team', l: 'Mitarbeiter', t: 'textarea'}]},
      {t: 'Prüfung', felder: [{k: 'pruefung', t: 'pruefliste', nurJaNein: 1, punkte: [
        'Absturzsicherung vorhanden (Seitenschutz, Dachfanggerüst, Auffangnetz oder PSAgA mit Anschlagpunkten)',
        'Durchsturzsicherung nicht begehbarer Flächen (Lichtplatten, Lichtkuppeln, Faserzement)',
        'Gerüst gekennzeichnet und zur Benutzung freigegeben', 'Leitern und Dachdeckeraufzug geprüft, sicher aufgestellt',
        'Witterung geeignet (Wind, Nässe, Eis, Gewitter)', 'Verdacht auf Asbest (Faserzement vor 1993) geklärt, TRGS 519 beachtet',
        'Verkehrssicherung unten (Absperrung, Schutzdach, Schuttrutsche)', 'Heißarbeiten: Feuerlöscher, Brandwache, Erlaubnisschein',
        'Erste Hilfe, Notrufnummer, Ersthelfer vor Ort', 'Persönliche Schutzausrüstung vollständig', 'Unterweisung der Mitarbeiter erfolgt']}]},
      {t: 'Bemerkungen', felder: [{k: 'bem', l: 'Bemerkungen / Maßnahmen', t: 'textarea'}, {k: 'sigAN', l: 'Unterschrift Aufsichtführender', t: 'unterschrift'}]}]},
  {id: 'arbeitsauftrag', titel: 'Arbeitsauftrag', unter: 'Einweisung für die Baustelle', ordner: 'Anleitung',
    abschnitte: [
      {t: 'Angaben', felder: [...kopfObjekt, {k: 'team', l: 'Kolonne', t: 'textarea'}, {k: 'beginn', l: 'Beginn', t: 'date', halb: 1}, {k: 'dauer', l: 'Dauer', t: 'text', halb: 1},
        {k: 'kontakt', l: 'Ansprechpartner vor Ort, Telefon', t: 'text'}]},
      {t: 'Leistung', felder: [{k: 'leistung', l: 'Auszuführende Arbeiten', t: 'textarea'}, {k: 'material', l: 'Material / Geräte mitnehmen', t: 'textarea'},
        {k: 'zugang', l: 'Zugang, Schlüssel, Parken, Strom, Wasser', t: 'textarea'}, {k: 'besonders', l: 'Besonderheiten, Gefahren', t: 'textarea'}]}]}
];
const formular = id => FORMULARE.find(f => f.id === id);

// ---------- Werte vorbelegen ----------
function vorbelegen(f, projekt) {
  const w = {};
  const quelle = {kunde: projekt.kunde, objekt: [projekt.name, projekt.adresse].filter(Boolean).join(', '), heute: heute(),
    auftragsnr: projekt.auftragsnr, benutzer: CFG.benutzer, ortdatum: (projekt.adresse ? projekt.adresse.split(',').pop().replace(/\d{5}/, '').trim() : '') + ', ' + dat(heute())};
  f.abschnitte.forEach(a => a.felder.forEach(x => {
    if (x.vor) w[x.k] = quelle[x.vor] || '';
    else if (x.v) w[x.k] = x.v;
    if (x.t === 'tabelle') w[x.k] = x.k === 'personal' && CFG.benutzer ? [{name: CFG.benutzer}] : [{}];
    if (x.t === 'pruefliste') w[x.k] = x.punkte.map(() => ({s: '', bem: ''}));
    if (x.t === 'mehrfach') w[x.k] = [];
  }));
  return w;
}

// ---------- Rechnen ----------
function aufmassMenge(z) {
  const a = zahl(z.anz), l = zahl(z.l), b = zahl(z.b);
  if (a == null && l == null && b == null) return null;
  return (a ?? 1) * (l ?? 1) * (b ?? 1);
}
function tabSumme(x, zeilen) {
  if (x.summe) { const s = zeilen.reduce((t, z) => t + (zahl(z[x.summe]) || 0), 0); return s ? `Summe: ${fmt(s, 2)}` : ''; }
  if (x.rechnen === 'aufmass') {
    const je = {}; zeilen.forEach(z => { const m = aufmassMenge(z); if (m != null) je[z.einheit || 'm²'] = (je[z.einheit || 'm²'] || 0) + m; });
    return Object.entries(je).map(([e, s]) => `Summe ${e}: ${fmt(s, 2)}`).join('   ');
  }
  return '';
}

// ---------- Formular am Handy ----------
const PSTAT = [['io', 'i. O.'], ['m', 'Mangel'], ['b', 'behoben'], ['e', 'entfällt']];
function feldHtml(x, w) {
  const v = w[x.k];
  const lab = x.l ? `<label>${esc(x.l)}</label>` : '';
  switch (x.t) {
    case 'textarea': return lab + `<textarea data-f="${x.k}">${esc(v)}</textarea>`;
    case 'select': return lab + `<select data-f="${x.k}">${x.o.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    case 'mehrfach': return lab + `<div>${x.o.map(o => `<span class="tag ${(v || []).includes(o) ? 'on' : ''}" data-mf="${x.k}" data-o="${esc(o)}">${esc(o)}</span>`).join('')}</div>`;
    case 'unterschrift': return lab + (v ? `<img src="${v}" alt="Unterschrift" style="max-width:100%;height:80px;background:#fff;border-radius:8px;display:block">` : '<div class="leer">Noch nicht unterschrieben</div>') +
      `<button class="btn sek klein" data-sig="${x.k}">${v ? 'Neu unterschreiben' : '✍ Unterschreiben'}</button>`;
    case 'pruefliste': return (x.stufen ? `<button class="btn sek klein" data-palle="${x.k}">Alles nicht relevant</button>` : '') + (v || []).map((p, i) => `<div class="pruef"><b>${i + 1}</b> ${esc(x.punkte[i])}
      <div class="seg">${(x.stufen || (x.nurJaNein ? [['io', 'erfüllt'], ['m', 'nicht erfüllt'], ['e', 'entfällt']] : PSTAT)).map(([k, l]) => `<button class="${k} ${p.s === k ? 'on' : ''}" data-ps="${x.k}" data-i="${i}" data-s="${k}">${l}</button>`).join('')}</div>
      <input placeholder="Bemerkung / Foto-Nr." value="${esc(p.bem)}" data-pb="${x.k}" data-i="${i}" style="margin-top:6px"></div>`).join('');
    case 'tabelle': return lab + (v || []).map((z, i) => `<div class="tabzeile"><div class="row" style="flex-wrap:wrap">${x.spalten.map(s => {
        const val = z[s.k] ?? '';
        const inp = s.t === 'select' ? `<select data-tz="${x.k}" data-i="${i}" data-s="${s.k}">${s.o.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
          : s.t === 'berechnet' ? `<input disabled value="${esc(fmt(aufmassMenge(z), 2))}" data-calc="${x.k}-${i}">`
          : s.t === 'mitarbeiter' ? `<input data-tz="${x.k}" data-i="${i}" data-s="${s.k}" value="${esc(val)}" list="dl-ma">`
          : `<input data-tz="${x.k}" data-i="${i}" data-s="${s.k}" value="${esc(val)}" ${s.t === 'number' ? 'inputmode="decimal"' : ''} ${s.t === 'date' ? 'type="date"' : ''}>`;
        return `<div style="flex:1 1 ${Math.max(70, s.w * 0.45)}px"><label style="margin-top:2px">${esc(s.l)}</label>${inp}</div>`;
      }).join('')}</div><button class="btn sek klein" data-tdel="${x.k}" data-i="${i}">Zeile entfernen</button></div>`).join('') +
      `<button class="btn sek klein" data-tadd="${x.k}">+ Zeile</button> <span class="hinweis" data-sum="${x.k}">${esc(tabSumme(x, v || []))}</span>`;
    default: return lab + `<input data-f="${x.k}" type="${x.t === 'number' ? 'text' : x.t || 'text'}" ${x.t === 'number' ? 'inputmode="decimal"' : ''} value="${esc(v)}">`;
  }
}
function formularHtml(f, w) {
  return `<datalist id="dl-ma">${CFG.mitarbeiter.map(m => `<option value="${esc(m)}">`).join('')}</datalist>` +
    (f.hinweis ? `<p class="hinweis">ℹ ${esc(f.hinweis)}</p>` : '') +
    f.abschnitte.map(a => `<h2>${esc(a.t)}</h2>` + (() => {
      let h = '', halb = [];
      const flush = () => { if (halb.length) { h += `<div class="row">${halb.map(x => `<div>${feldHtml(x, w)}</div>`).join('')}</div>`; halb = []; } };
      a.felder.forEach(x => { if (x.halb) { halb.push(x); if (halb.length === 2) flush(); } else { flush(); h += feldHtml(x, w); } });
      flush(); return h;
    })()).join('');
}
function feldDef(f, k) { for (const a of f.abschnitte) for (const x of a.felder) if (x.k === k) return x; return null; }

// Bindet die Eingaben an memo.formular.werte; speichern() wird verzögert aufgerufen.
function formularBinden(root, f, w, speichern, neuZeichnen) {
  let t; const spaeter = () => { clearTimeout(t); t = setTimeout(speichern, 500); };
  root.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.f) { w[el.dataset.f] = el.value; spaeter(); }
    if (el.dataset.pb) { w[el.dataset.pb][+el.dataset.i].bem = el.value; spaeter(); }
    if (el.dataset.tz) {
      const x = feldDef(f, el.dataset.tz), z = w[el.dataset.tz][+el.dataset.i]; z[el.dataset.s] = el.value;
      const c = root.querySelector(`[data-calc="${el.dataset.tz}-${el.dataset.i}"]`); if (c) c.value = fmt(aufmassMenge(z), 2);
      const s = root.querySelector(`[data-sum="${el.dataset.tz}"]`); if (s) s.textContent = tabSumme(x, w[el.dataset.tz]);
      spaeter();
    }
  });
  root.addEventListener('change', e => { if (e.target.tagName === 'SELECT') e.target.dispatchEvent(new Event('input', {bubbles: true})); });
  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-mf],[data-ps],[data-tadd],[data-tdel],[data-sig],[data-palle]'); if (!b) return;
    if (b.dataset.palle) { w[b.dataset.palle].forEach(p => { if (!p.s) p.s = 'e'; }); await speichern(); neuZeichnen(); return; }
    if (b.dataset.mf) { const a = w[b.dataset.mf] = w[b.dataset.mf] || []; const o = b.dataset.o; const i = a.indexOf(o); i < 0 ? a.push(o) : a.splice(i, 1); b.classList.toggle('on'); spaeter(); }
    if (b.dataset.ps) { const p = w[b.dataset.ps][+b.dataset.i]; p.s = p.s === b.dataset.s ? '' : b.dataset.s;
      b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.s === p.s)); spaeter(); }
    if (b.dataset.tadd) { w[b.dataset.tadd].push({}); await speichern(); neuZeichnen(); }
    if (b.dataset.tdel) { w[b.dataset.tdel].splice(+b.dataset.i, 1); if (!w[b.dataset.tdel].length) w[b.dataset.tdel].push({}); await speichern(); neuZeichnen(); }
    if (b.dataset.sig) {
      const s = fenster('<canvas class="sig"></canvas><div class="row"><button class="btn sek" data-l>Löschen</button><button class="btn" data-ok>Übernehmen</button></div>', {titel: 'Unterschrift'});
      const u = unterschriftFeld(s.el.querySelector('canvas'));
      s.el.querySelector('[data-l]').onclick = () => u.loeschen();
      s.el.querySelector('[data-ok]').onclick = async () => { w[b.dataset.sig] = u.leer() ? '' : await u.png(); s.zu(); await speichern(); neuZeichnen(); };
    }
  });
}
