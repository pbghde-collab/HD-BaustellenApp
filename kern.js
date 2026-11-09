'use strict';
// Kern: Hilfen, Datenbank, Dateien, Fenster, Teilen.

const VERSION = '1.1 (09.11.2026)';
const $ = s => document.querySelector(s);
const APP = $('#app');

// Öffentlicher Code ohne persönliche Daten: Inhaber, Anschrift, Telefon und Mail kommen per Startpaket (Einstellungen) aufs Gerät.
const FIRMA_STANDARD = {name: 'Hartmann Dächer', inhaber: '', titel: '', strasse: '', ort: '', tel: '', mail: '', web: ''};
const ORDNER_STANDARD = ['Fotos', 'Pläne', 'Aufmaß', 'Rapportzettel', 'Mängel und Schäden', 'Abnahme', 'Wartung', 'Abrechnung', 'Anleitung', 'Für den Kunden'];
const TAGS_STANDARD = ['Bestand', 'Vorher', 'Nachher', 'Zusatzleistung', 'Mangel', 'Schaden', 'Behinderung', 'Abnahme', 'Material',
  'Arbeitssicherheit', 'Sturm', 'Unterdach', 'Anschluss', 'Rinne', 'Kamin', 'Gaube', 'Flachdach', 'Fassade'];

// ---------- Hilfen ----------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const lokal = d => new Date(d - d.getTimezoneOffset() * 60000).toISOString();
const heute = () => lokal(new Date()).slice(0, 10);
const jetztIso = () => lokal(new Date()).slice(0, 16);
const stempel = () => new Date().toISOString();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const dat = iso => iso ? String(iso).slice(0, 10).split('-').reverse().join('.') : '';
const datZeit = iso => iso ? dat(iso) + (String(iso).length > 10 ? ', ' + String(iso).slice(11, 16) + ' Uhr' : '') : '';
const kompakt = iso => (iso || heute()).slice(0, 10).replace(/-/g, '');
const dateiname = s => String(s || 'Projekt').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
const zahl = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? null : n; };
const fmt = (n, s = 2) => n == null ? '' : n.toLocaleString('de-DE', {minimumFractionDigits: s, maximumFractionDigits: s});
const warte = ms => new Promise(r => setTimeout(r, ms));
function toast(t) { const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, 2800); }
function titel(t) { $('#title').textContent = t; document.title = t + ' · Hartmann Dächer'; }

// ---------- Datenbank ----------
// projects, memos (Fotos, Notizen, Sprache, Dateien, Formulare, Scans, Pläne), files (Blobs), settings
let db;
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('hd-projektakte', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('projects', {keyPath: 'id'});
      d.createObjectStore('memos', {keyPath: 'id'}).createIndex('projectId', 'projectId');
      const f = d.createObjectStore('files', {keyPath: 'id'});
      f.createIndex('memoId', 'memoId'); f.createIndex('projectId', 'projectId');
      d.createObjectStore('settings', {keyPath: 'key'});
    };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const st = (n, m = 'readonly') => db.transaction(n, m).objectStore(n);
const all = n => req(st(n).getAll());
const get = (n, k) => req(st(n).get(k));
const put = (n, v) => req(st(n, 'readwrite').put(v));
const del = (n, k) => req(st(n, 'readwrite').delete(k));
const byIdx = (n, i, v) => req(st(n).index(i).getAll(v));

let CFG = null;
async function cfg() {
  if (CFG) return CFG;
  CFG = (await get('settings', 'cfg')) || {key: 'cfg', benutzer: '', mitarbeiter: [], ordner: [...ORDNER_STANDARD], tags: [...TAGS_STANDARD], firma: {...FIRMA_STANDARD}, stundensatz: ''};
  CFG.firma = {...FIRMA_STANDARD, ...(CFG.firma || {})};
  return CFG;
}
async function cfgSpeichern() { await put('settings', CFG); }

// Gelöschtes wird als „deleted“ markiert, damit es beim Austausch auf anderen Geräten ebenfalls verschwindet.
const lebend = x => x && !x.deleted;
async function projekte() { return (await all('projects')).filter(lebend); }
async function memosVon(pid) { return (await byIdx('memos', 'projectId', pid)).filter(lebend); }
async function memoSpeichern(m) { m.updatedAt = stempel(); if (!m.autor) m.autor = CFG.benutzer || ''; await put('memos', m); return m; }
async function projektSpeichern(p) { p.updatedAt = stempel(); await put('projects', p); return p; }
async function memoLoeschen(m) {
  for (const f of await byIdx('files', 'memoId', m.id)) await del('files', f.id);
  m.deleted = true; await memoSpeichern(m);
}

// ---------- Bilder und Dateien ----------
async function bildLaden(blob) { return createImageBitmap(blob, {imageOrientation: 'from-image'}); }
const canvasBlob = (c, typ = 'image/jpeg', q = 0.82) => new Promise(r => c.toBlob(r, typ, q));
async function verkleinern(file, max = 1800) {
  const bmp = await bildLaden(file);
  const f = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return {blob: await canvasBlob(c), w: c.width, h: c.height};
}
async function dateiSpeichern(memo, blob, extra = {}) {
  const f = {id: uid(), memoId: memo.id, projectId: memo.projectId, blob, typ: blob.type || extra.typ || '', name: extra.name || '', w: extra.w || 0, h: extra.h || 0, nr: extra.nr || 0, updatedAt: stempel()};
  await put('files', f); return f;
}
async function fotosAnhaengen(memo, files) {
  let n = 0;
  const vorhanden = (await byIdx('files', 'memoId', memo.id)).length;
  for (const file of files) {
    try { const {blob, w, h} = await verkleinern(file); await dateiSpeichern(memo, blob, {w, h, nr: vorhanden + n}); n++; }
    catch (e) { toast('Foto konnte nicht gelesen werden'); }
  }
  return n;
}
async function dateienVon(memoId) { return (await byIdx('files', 'memoId', memoId)).sort((a, b) => (a.nr || 0) - (b.nr || 0)); }
const blobUrls = [];
function bildUrl(blob) { const u = URL.createObjectURL(blob); blobUrls.push(u); return u; }
function urlsFreigeben() { while (blobUrls.length) URL.revokeObjectURL(blobUrls.pop()); }
const dataUrl = blob => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
const istBild = f => /^image\//.test(f.typ || f.blob?.type || '');

// ---------- Fenster (Bottom Sheet) ----------
function fenster(html, opts = {}) {
  const o = document.createElement('div'); o.className = 'overlay' + (opts.voll ? ' voll' : '');
  o.innerHTML = `<div class="sheet">${opts.titel ? `<div class="sheetkopf"><b>${esc(opts.titel)}</b><button class="icon" data-zu aria-label="Schließen">×</button></div>` : ''}<div class="sheetinhalt">${html}</div></div>`;
  document.body.appendChild(o);
  const zu = () => { o.remove(); opts.zu && opts.zu(); };
  o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-zu]')) zu(); });
  return {el: o, zu};
}
function auswahl(titelText, optionen) {
  return new Promise(res => {
    const f = fenster(optionen.map((o, i) => `<button class="wahl" data-i="${i}"><b>${esc(o.l)}</b>${o.s ? `<small>${esc(o.s)}</small>` : ''}</button>`).join('') || '<div class="leer">Keine Einträge</div>',
      {titel: titelText, zu: () => res(null)});
    f.el.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { f.el.remove(); res(optionen[+b.dataset.i].v); } });
  });
}
function eingabe(titelText, felder, knopf = 'Übernehmen') {
  return new Promise(res => {
    const feld = x => x.t === 'textarea' ? `<textarea data-k="${x.k}">${esc(x.v)}</textarea>`
      : x.t === 'select' ? `<select data-k="${x.k}">${x.o.map(o => `<option ${o === x.v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
      : `<input data-k="${x.k}" type="${x.t || 'text'}" value="${esc(x.v)}" ${x.t === 'number' ? 'inputmode="decimal" step="any"' : ''} ${x.list ? `list="dl-${x.k}"` : ''}>${x.list ? `<datalist id="dl-${x.k}">${x.list.map(o => `<option value="${esc(o)}">`).join('')}</datalist>` : ''}`;
    const f = fenster(felder.map(x => `<label>${esc(x.l)}</label>${feld(x)}`).join('') + `<button class="btn voll" data-ok>${esc(knopf)}</button>`,
      {titel: titelText, zu: () => res(null)});
    const ein = f.el.querySelector('input,textarea'); if (ein) setTimeout(() => ein.focus(), 50);
    f.el.querySelector('[data-ok]').onclick = () => {
      const o = {}; f.el.querySelectorAll('[data-k]').forEach(i => o[i.dataset.k] = i.value.trim()); f.el.remove(); res(o);
    };
  });
}
function frage(text, ja = 'Ja', nein = 'Abbrechen') {
  return new Promise(res => {
    const f = fenster(`<p style="margin-top:0">${esc(text)}</p><div class="row"><button class="btn sek" data-n>${esc(nein)}</button><button class="btn" data-j>${esc(ja)}</button></div>`, {zu: () => res(false)});
    f.el.querySelector('[data-j]').onclick = () => { f.el.remove(); res(true); };
    f.el.querySelector('[data-n]').onclick = () => { f.el.remove(); res(false); };
  });
}

// ---------- Teilen ----------
// Zwei Schritte: erst Datei erzeugen, dann eigener Tipp auf „Teilen“ (Android verlangt eine frische Nutzeraktion).
function herunterladen(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
function teilbar(files) { try { return !!(navigator.canShare && navigator.canShare({files})); } catch (e) { return false; } }
async function teilen(blob, name) {
  const files = [new File([blob], name, {type: blob.type || 'application/octet-stream'})];
  const kann = teilbar(files);
  const f = fenster(`<p style="margin-top:0">📄 ${esc(name)}<br><small class="hinweis">${fmt(blob.size / 1048576, 1)} MB</small></p>
    ${kann ? '<button class="btn voll" data-teilen>Teilen (WhatsApp, Mail, Drive …)</button>' : '<p class="hinweis">Direktes Teilen ist auf diesem Gerät nicht möglich. Speichern und aus „Downloads“ teilen.</p>'}
    <button class="btn sek voll" data-speichern>Auf dem Gerät speichern</button>`, {titel: 'Datei bereit'});
  f.el.querySelector('[data-speichern]').onclick = () => { herunterladen(blob, name); toast('Gespeichert unter Downloads'); f.zu(); };
  const t = f.el.querySelector('[data-teilen]');
  if (t) t.onclick = async () => {
    try { await navigator.share({files}); f.zu(); }
    catch (e) { if (e.name !== 'AbortError') toast('Teilen nicht möglich. Bitte speichern und aus Downloads teilen.'); }
  };
}

// ---------- Unterschrift ----------
function unterschriftFeld(canvas) {
  const ctx = canvas.getContext('2d'); let zeichnet = false, leer = true;
  const groesse = () => { const r = canvas.getBoundingClientRect(); canvas.width = r.width * 2; canvas.height = r.height * 2; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = '#1a1a1a'; };
  groesse();
  const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * 2, (e.clientY - r.top) * 2]; };
  canvas.onpointerdown = e => { zeichnet = true; leer = false; canvas.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); };
  canvas.onpointermove = e => { if (zeichnet) { ctx.lineTo(...pos(e)); ctx.stroke(); } };
  canvas.onpointerup = () => zeichnet = false;
  return {leer: () => leer, loeschen: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); leer = true; },
    png: async () => { // klein halten: auf 600 px Breite
      const c = document.createElement('canvas'); c.width = 600; c.height = Math.round(600 * canvas.height / canvas.width);
      c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height); return c.toDataURL('image/png'); }};
}
