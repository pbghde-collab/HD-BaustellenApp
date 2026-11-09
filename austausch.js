'use strict';
// Austausch ohne Server: Projektpaket (ZIP) per WhatsApp, Mail oder Drive weitergeben und auf dem anderen Gerät einlesen.
// Zusammenführen: Neuere Fassung gewinnt (updatedAt), Kommentare werden vereinigt, Löschungen werden übernommen.

const ENDUNG = {'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a'};

async function paketErstellen(projektIds) {
  const zip = new JSZip(), daten = {format: 'hd-projektakte', version: 1, exportiert: stempel(), von: CFG.benutzer, projects: [], memos: [], files: []};
  for (const id of projektIds) {
    const p = await get('projects', id); if (!p) continue;
    daten.projects.push(p);
    for (const m of await byIdx('memos', 'projectId', id)) daten.memos.push(m);
    for (const f of await byIdx('files', 'projectId', id)) {
      const pfad = `dateien/${f.id}.${ENDUNG[(f.typ || '').split(';')[0]] || 'bin'}`;
      zip.file(pfad, f.blob);
      const {blob, ...rest} = f; daten.files.push({...rest, pfad});
    }
  }
  zip.file('akte.json', JSON.stringify(daten));
  return zip.generateAsync({type: 'blob', mimeType: 'application/zip'});
}

function kommentareVereinen(a = [], b = []) {
  const m = new Map(); [...a, ...b].forEach(k => m.set(k.id, k));
  return [...m.values()].sort((x, y) => (x.datum || '').localeCompare(y.datum || ''));
}

async function paketEinlesen(file) {
  const zip = await JSZip.loadAsync(file);
  const j = zip.file('akte.json'); if (!j) throw new Error('Keine Projektakte (akte.json fehlt)');
  const d = JSON.parse(await j.async('string'));
  if (d.format !== 'hd-projektakte') throw new Error('Unbekanntes Format');
  const z = {neu: 0, aktuell: 0, dateien: 0};
  const neuer = (alt, neu) => !alt || (neu.updatedAt || '') > (alt.updatedAt || '');
  for (const p of d.projects) {
    const alt = await get('projects', p.id);
    if (neuer(alt, p)) { await put('projects', p); alt ? z.aktuell++ : z.neu++; }
  }
  const geloescht = new Set();
  for (const m of d.memos) {
    const alt = await get('memos', m.id);
    const altAnzahl = alt?.kommentare?.length || 0;
    let ziel = alt, aendern = false;
    if (neuer(alt, m)) { ziel = {...m}; aendern = true; alt ? z.aktuell++ : z.neu++; }
    if (alt && (altAnzahl || m.kommentare?.length)) {
      ziel.kommentare = kommentareVereinen(alt.kommentare, m.kommentare);
      if (ziel.kommentare.length !== altAnzahl) aendern = true;
    }
    if (aendern) await put('memos', ziel);
    if (ziel.deleted) geloescht.add(ziel.id);
  }
  for (const f of d.files) {
    if (geloescht.has(f.memoId)) continue;
    const alt = await get('files', f.id);
    if (neuer(alt, f)) {
      const inhalt = zip.file(f.pfad); if (!inhalt) continue;
      const {pfad, ...rest} = f;
      await put('files', {...rest, blob: new Blob([await inhalt.async('arraybuffer')], {type: f.typ || ''})}); z.dateien++;
    }
  }
  for (const id of geloescht) for (const f of await byIdx('files', 'memoId', id)) await del('files', f.id);
  if (d.einstellungen && !CFG.benutzer) { // Sicherung auf neuem Gerät: Einstellungen übernehmen
    Object.assign(CFG, {...d.einstellungen, key: 'cfg'}); await cfgSpeichern();
  }
  return z;
}

async function sicherungErstellen() {
  const ids = (await all('projects')).map(p => p.id);
  const blob = await paketErstellen(ids);
  const zip = await JSZip.loadAsync(blob);
  const d = JSON.parse(await zip.file('akte.json').async('string'));
  d.einstellungen = {...CFG, benutzer: ''};
  zip.file('akte.json', JSON.stringify(d));
  return zip.generateAsync({type: 'blob', mimeType: 'application/zip'});
}
