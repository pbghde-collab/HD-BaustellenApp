'use strict';
// Oberfläche: Projekte, Ordner, Memos (Foto, Notiz, Sprache, Formular, Scan, Datei, Plan), Aufgaben, Kommentare, Berichte.

if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
const TYP = {foto: ['📷', 'Foto'], notiz: ['✎', 'Notiz'], sprache: ['🎤', 'Sprachnotiz'], formular: ['📋', 'Formular'], scan: ['🖨', 'Scan'], datei: ['📎', 'Datei'], plan: ['🗺', 'Plan']};
let AKT = {projekt: null, ordner: null};

// ---------- Router ----------
async function render() {
  urlsFreigeben();
  document.querySelectorAll('.overlay').forEach(o => o.remove());
  const h = location.hash.split('?')[0].replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  $('#back').hidden = !h[0];
  document.querySelectorAll('#unten a').forEach(a => a.classList.toggle('on', a.dataset.nav === (h[0] || 'start')));
  APP.innerHTML = '';
  try {
    if (!h[0]) await startSeite();
    else if (h[0] === 'p') await projektSeite(h[1], h[2] || 'ordner', h[3]);
    else if (h[0] === 'm') await memoSeite(h[1]);
    else if (h[0] === 'f') await formularSeite(h[1]);
    else if (h[0] === 'plan') await planSeite(h[1]);
    else if (h[0] === 'aufgaben') await aufgabenSeite(h[1] || 'mir');
    else if (h[0] === 'suche') await sucheSeite();
    else if (h[0] === 'einstellungen') await einstellungenSeite();
    else location.hash = '#/';
  } catch (e) { console.error(e); APP.innerHTML = `<div class="card rotschrift">Fehler: ${esc(e.message)}</div>`; }
  window.scrollTo(0, 0);
}
const geh = h => { if (location.hash === h) render(); else location.hash = h; };
$('#back').onclick = () => history.length > 1 ? history.back() : geh('#/');

function waehleDateien(accept, {capture = false, multiple = false} = {}) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = multiple;
    if (capture) i.setAttribute('capture', 'environment');
    i.onchange = () => res([...i.files]); i.click();
  });
}

// ---------- Listen-Hilfen ----------
async function vorschauKarte(pid) { // memoId -> erstes Bild
  const k = {}; for (const f of await byIdx('files', 'projectId', pid)) if (istBild(f) && (!k[f.memoId] || (f.nr || 0) < (k[f.memoId].nr || 0))) k[f.memoId] = f;
  return k;
}
function aufgabeBadge(m) {
  if (!m.aufgabe) return '';
  if (m.aufgabe.status === 'erledigt') return '<span class="badge gruen">✔ erledigt</span>';
  const ueber = m.aufgabe.frist && m.aufgabe.frist < heute();
  return `<span class="badge ${ueber ? 'rot' : ''}">◯ ${esc(m.aufgabe.an || 'offen')}${m.aufgabe.frist ? ' bis ' + dat(m.aufgabe.frist) : ''}</span>`;
}
function memoZeile(m, vors, opts = {}) {
  const v = vors?.[m.id];
  const zeile1 = m.titel || m.text?.split('\n')[0] || (m.typ === 'formular' ? formular(m.formular.vorlage)?.titel : TYP[m.typ]?.[1]);
  return `<a class="memo" href="#/m/${m.id}">${opts.check ? `<input type="checkbox" data-wahl="${m.id}" checked onclick="event.stopPropagation()">` : ''}
    <div class="vs" ${v ? `style="background-image:url('${bildUrl(v.blob)}')"` : ''}>${v ? '' : TYP[m.typ]?.[0] || '•'}</div>
    <div class="in"><p><b>${esc(zeile1)}</b></p>${m.titel && m.text ? `<p class="meta">${esc(m.text.split('\n')[0])}</p>` : ''}
    <div class="meta">${datZeit(m.datum)} · ${esc(m.autor || '')}${opts.projekt ? ' · ' + esc(opts.projekt) : ' · ' + esc(m.ordner || '')}</div>
    <div>${aufgabeBadge(m)}${(m.tags || []).slice(0, 4).map(t => `<span class="badge">${esc(t)}</span>`).join('')}${m.kommentare?.length ? `<span class="badge">💬 ${m.kommentare.length}</span>` : ''}</div></div></a>`;
}
const neuesteZuerst = (a, b) => (b.datum || '').localeCompare(a.datum || '');
const fuerMich = m => CFG.benutzer && (m.aufgabe?.an === CFG.benutzer);
const erwaehntMich = m => CFG.benutzer && (m.kommentare || []).some(k => (k.an || []).includes(CFG.benutzer) && !(k.gelesen || []).includes(CFG.benutzer));

// ---------- Start ----------
async function startSeite() {
  titel('Projekte');
  const ps = (await projekte()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const memos = (await all('memos')).filter(lebend);
  const offen = memos.filter(m => m.aufgabe && m.aufgabe.status !== 'erledigt');
  const mir = offen.filter(fuerMich), ueber = offen.filter(m => m.aufgabe.frist && m.aufgabe.frist < heute()), erw = memos.filter(erwaehntMich);
  const zeige = new URLSearchParams(location.hash.split('?')[1]).get('alle');
  APP.innerHTML = `${CFG.benutzer ? '' : CFG.mitarbeiter.length ? '<div class="card rotschrift">Bitte zuerst unter „Mehr“ den eigenen Namen wählen.</div>'
    : '<div class="card"><b>Willkommen.</b> Zuerst das Startpaket von Hartmann Dächer mit „Paket einlesen“ laden (Firmendaten, Mitarbeiter), danach unter „Mehr“ den eigenen Namen wählen.</div>'}
    <div class="zaehler"><a href="#/aufgaben/mir"><b>${mir.length}</b><small>meine Aufgaben</small></a>
      <a href="#/aufgaben/alle" class="${ueber.length ? 'warn' : ''}"><b>${ueber.length}</b><small>überfällig</small></a>
      <a href="#/aufgaben/erwaehnt" class="${erw.length ? 'warn' : ''}"><b>${erw.length}</b><small>Erwähnungen</small></a></div>
    <div class="row"><button class="btn" id="neu">+ Neues Projekt</button><button class="btn sek" id="einlesen">⇩ Paket einlesen</button></div>
    <input id="filter" placeholder="Projekt suchen" style="margin:8px 0">
    <div id="liste"></div>`;
  const liste = () => {
    const q = $('#filter').value.toLowerCase();
    const sicht = ps.filter(p => (zeige || p.status !== 'abgeschlossen') && [p.name, p.adresse, p.kunde, p.auftragsnr].join(' ').toLowerCase().includes(q));
    $('#liste').innerHTML = (sicht.map(p => {
      const pm = memos.filter(m => m.projectId === p.id), o = pm.filter(m => m.aufgabe && m.aufgabe.status !== 'erledigt').length;
      return `<a class="card" href="#/p/${p.id}"><div class="t">${esc(p.name)}</div><div class="s">${esc([p.adresse, p.kunde].filter(Boolean).join(' · '))}</div>
        <div>${p.status === 'abgeschlossen' ? '<span class="badge">abgeschlossen</span>' : ''}<span class="badge">${pm.length} Einträge</span>${o ? `<span class="badge rot">${o} offen</span>` : ''}</div></a>`;
    }).join('') || '<div class="leer">Noch keine Projekte. „+ Neues Projekt“ tippen oder ein Paket von Kollegen einlesen.</div>') +
      (zeige ? '<a href="#/" class="hinweis">Nur aktive Projekte zeigen</a>' : '<a href="#/?alle=1" class="hinweis">Auch abgeschlossene Projekte zeigen</a>');
  };
  $('#filter').oninput = liste; liste();
  $('#neu').onclick = projektNeu;
  $('#einlesen').onclick = einlesenDialog;
}
async function projektNeu() {
  const e = await eingabe('Neues Projekt', [{k: 'name', l: 'Projektname (z. B. Kunde, Vorhaben)'}, {k: 'adresse', l: 'Adresse Baustelle'},
    {k: 'kunde', l: 'Auftraggeber'}, {k: 'telefon', l: 'Telefon Auftraggeber', t: 'tel'}, {k: 'auftragsnr', l: 'Auftrags-Nr.'}], 'Anlegen');
  if (!e || !e.name) return;
  const p = await projektSpeichern({id: uid(), ...e, status: 'aktiv', ordner: [...CFG.ordner], angelegt: heute(), von: CFG.benutzer});
  geh('#/p/' + p.id);
}
async function einlesenDialog() {
  const [f] = await waehleDateien('.zip,application/zip'); if (!f) return;
  toast('Lese ein …');
  try { const z = await paketEinlesen(f); CFG = null; await cfg(); toast(`Eingelesen: ${z.neu} neu, ${z.aktuell} aktualisiert, ${z.dateien} Dateien`); render(); }
  catch (e) { toast('Einlesen fehlgeschlagen: ' + e.message); }
}

// ---------- Projekt ----------
async function projektSeite(pid, tab, arg) {
  const p = await get('projects', pid); if (!lebend(p)) return geh('#/');
  AKT.projekt = p; AKT.ordner = tab === 'o' ? p.ordner[+arg] : null;
  titel(AKT.ordner || p.name);
  const memos = (await memosVon(pid)).sort(neuesteZuerst);
  const vors = await vorschauKarte(pid);
  const tabs = [['ordner', 'Ordner'], ['verlauf', 'Verlauf'], ['aufgaben', 'Aufgaben'], ['plaene', 'Pläne'], ['bericht', 'Bericht'], ['info', 'Projekt']];
  APP.innerHTML = `${tab === 'o' ? `<div class="hinweis"><a href="#/p/${pid}">${esc(p.name)}</a> › ${esc(AKT.ordner)}</div>` : `<div class="tabs">${tabs.map(([k, l]) => `<a href="#/p/${pid}/${k}" class="${tab === k ? 'on' : ''}">${l}</a>`).join('')}</div>`}
    ${['ordner', 'verlauf', 'o'].includes(tab) ? schnellKnoepfe() : ''}<div id="inhalt"></div>`;
  bindeSchnell();
  const I = $('#inhalt');
  if (tab === 'ordner') {
    I.innerHTML = `<div class="ordner">${p.ordner.map((o, i) => `<a href="#/p/${pid}/o/${i}"><i>📁</i><span>${esc(o)}</span><b>${memos.filter(m => m.ordner === o).length}</b></a>`).join('')}</div>
      ${memos.filter(m => !p.ordner.includes(m.ordner)).length ? `<h2>Ohne Ordner</h2>${memos.filter(m => !p.ordner.includes(m.ordner)).map(m => memoZeile(m, vors)).join('')}` : ''}
      <h2>Zuletzt</h2>${memos.slice(0, 5).map(m => memoZeile(m, vors)).join('') || '<div class="leer">Noch keine Einträge</div>'}`;
  }
  if (tab === 'o' || tab === 'verlauf') {
    const basis = tab === 'o' ? memos.filter(m => m.ordner === AKT.ordner) : memos;
    const tags = [...new Set(basis.flatMap(m => m.tags || []))].sort();
    I.innerHTML = `${tags.length ? `<div>${tags.map(t => `<span class="tag" data-t="${esc(t)}">${esc(t)}</span>`).join('')}</div>` : ''}<div id="ml"></div>`;
    const aktiv = new Set();
    const zeichne = () => { const l = basis.filter(m => [...aktiv].every(t => (m.tags || []).includes(t)));
      $('#ml').innerHTML = l.map(m => memoZeile(m, vors)).join('') || '<div class="leer">Keine Einträge</div>'; };
    I.onclick = e => { const t = e.target.closest('[data-t]'); if (!t) return; aktiv.has(t.dataset.t) ? aktiv.delete(t.dataset.t) : aktiv.add(t.dataset.t); t.classList.toggle('on'); zeichne(); };
    zeichne();
  }
  if (tab === 'aufgaben') {
    const a = memos.filter(m => m.aufgabe);
    const offen = a.filter(m => m.aufgabe.status !== 'erledigt').sort((x, y) => (x.aufgabe.frist || '9').localeCompare(y.aufgabe.frist || '9'));
    I.innerHTML = `<h2>Offen <small>${offen.length}</small></h2>${offen.map(m => memoZeile(m, vors)).join('') || '<div class="leer">Keine offenen Aufgaben</div>'}
      <h2>Erledigt</h2>${a.filter(m => m.aufgabe.status === 'erledigt').map(m => memoZeile(m, vors)).join('') || '<div class="leer">–</div>'}
      <p class="hinweis">Aus jedem Eintrag wird mit „Als Aufgabe“ eine Aufgabe mit Zuständigem und Frist.</p>`;
  }
  if (tab === 'plaene') {
    const pl = memos.filter(m => m.typ === 'plan');
    I.innerHTML = `<button class="btn" id="planneu">+ Plan hinzufügen (PDF oder Bild)</button>
      ${pl.map(m => `<a class="card" href="#/plan/${m.id}"><div class="t">🗺 ${esc(m.titel || 'Plan')}</div><div class="s">${datZeit(m.datum)} · ${memos.filter(x => x.plan?.planId === m.id).length} Markierungen</div></a>`).join('') || '<div class="leer">Noch keine Pläne</div>'}`;
    $('#planneu').onclick = () => dateiNeu('Pläne', true);
  }
  if (tab === 'bericht') berichtTab(p, memos, vors);
  if (tab === 'info') infoTab(p, memos);
}
function schnellKnoepfe() {
  return `<div class="schnell"><button data-neu="foto"><span>📷</span>Foto</button><button data-neu="notiz"><span>✎</span>Notiz</button>
    <button data-neu="sprache"><span>🎤</span>Sprache</button><button data-neu="formular"><span>📋</span>Formular</button>
    <button data-neu="scan"><span>🖨</span>Scan</button><button data-neu="datei"><span>📎</span>Datei</button></div>`;
}
function bindeSchnell() {
  APP.querySelectorAll('[data-neu]').forEach(b => b.onclick = () => ({foto: fotoNeu, notiz: notizNeu, sprache: spracheNeu, formular: formularNeu, scan: scanNeu, datei: () => dateiNeu()})[b.dataset.neu]());
}
const ordnerFuer = (wunsch) => AKT.ordner || (AKT.projekt.ordner.includes(wunsch) ? wunsch : AKT.projekt.ordner[0]);
async function neuesMemo(typ, ordner, extra = {}) {
  return memoSpeichern({id: uid(), projectId: AKT.projekt.id, typ, ordner, titel: '', text: '', tags: [], datum: jetztIso(), autor: CFG.benutzer, aufgabe: null, kommentare: [], ...extra});
}
async function fotoNeu(extra) {
  const quelle = await auswahl('Foto', [{l: '📷 Kamera', v: 'k'}, {l: '🖼 Galerie (mehrere)', v: 'g'}]); if (!quelle) return;
  const files = await waehleDateien('image/*', quelle === 'k' ? {capture: true} : {multiple: true}); if (!files.length) return;
  const m = await neuesMemo('foto', ordnerFuer('Fotos'), extra);
  toast((await fotosAnhaengen(m, files)) + ' Foto(s) gespeichert'); geh('#/m/' + m.id);
}
async function notizNeu(extra) { const m = await neuesMemo('notiz', ordnerFuer('Fotos'), extra); geh('#/m/' + m.id + '?fokus=1'); }
async function formularNeu() {
  const id = await auswahl('Formular wählen', FORMULARE.map(f => ({l: f.titel, s: [f.unter, f.rechts].filter(Boolean).join(' · '), v: f.id}))); if (!id) return;
  const f = formular(id);
  const m = await neuesMemo('formular', ordnerFuer(f.ordner), {titel: f.titel, formular: {vorlage: id, werte: vorbelegen(f, AKT.projekt)}});
  geh('#/f/' + m.id);
}
async function dateiNeu(ordner, alsPlan) {
  const files = await waehleDateien(alsPlan ? 'application/pdf,image/*' : '*/*', {multiple: !alsPlan}); if (!files.length) return;
  let letzte;
  for (const file of files) {
    const plan = alsPlan || (AKT.ordner === 'Pläne' && /pdf|image/.test(file.type));
    letzte = await neuesMemo(plan ? 'plan' : 'datei', ordner || ordnerFuer(plan ? 'Pläne' : 'Abrechnung'), {titel: file.name.replace(/\.[^.]+$/, '')});
    if (/^image\//.test(file.type)) { const {blob, w, h} = await verkleinern(file, plan ? 3000 : 1800); await dateiSpeichern(letzte, blob, {w, h, name: file.name}); }
    else await dateiSpeichern(letzte, file, {name: file.name, typ: file.type});
  }
  toast(files.length + ' Datei(en) gespeichert');
  geh(alsPlan ? '#/plan/' + letzte.id : files.length === 1 ? '#/m/' + letzte.id : location.hash);
}

// ---------- Sprachnotiz ----------
async function spracheNeu(extra) {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('Aufnahme auf diesem Gerät nicht möglich');
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({audio: true}); } catch (e) { return toast('Kein Zugriff auf das Mikrofon'); }
  const rec = new MediaRecorder(stream), teile = []; let start = Date.now(), uhr;
  const f = fenster('<p style="font-size:34px;text-align:center;margin:10px 0" id="uhr">0:00</p><p class="hinweis" style="text-align:center">Aufnahme läuft …</p><button class="btn voll" data-stop>■ Stopp und speichern</button>',
    {titel: 'Sprachnotiz', zu: () => { clearInterval(uhr); if (rec.state !== 'inactive') { rec.onstop = null; rec.stop(); } stream.getTracks().forEach(t => t.stop()); }});
  rec.ondataavailable = e => teile.push(e.data);
  rec.onstop = async () => {
    clearInterval(uhr); stream.getTracks().forEach(t => t.stop()); f.el.remove();
    const blob = new Blob(teile, {type: rec.mimeType || 'audio/webm'});
    const m = await neuesMemo('sprache', ordnerFuer('Fotos'), extra);
    await dateiSpeichern(m, blob, {name: 'Sprachnotiz', typ: blob.type}); geh('#/m/' + m.id);
  };
  rec.start(); uhr = setInterval(() => { const s = Math.round((Date.now() - start) / 1000); f.el.querySelector('#uhr').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 500);
  f.el.querySelector('[data-stop]').onclick = () => rec.stop();
}

// ---------- Scan ----------
async function scanAufbereiten(file) { // Graustufen und Kontrast strecken, damit Schrift gut lesbar wird
  const bmp = await bildLaden(file), f = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f);
  const ctx = c.getContext('2d'); ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height), d = img.data, hist = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) { const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]); d[i] = g; hist[g]++; }
  const n = d.length / 4; let lo = 0, hi = 255, s = 0;
  while (s < n * 0.02 && lo < 255) s += hist[lo++]; s = 0; while (s < n * 0.08 && hi > 0) s += hist[hi--];
  const sp = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) { let v = (d[i] - lo) * 255 / sp; v = v > 235 ? 255 : v < 0 ? 0 : v; d[i] = d[i + 1] = d[i + 2] = v; }
  ctx.putImageData(img, 0, 0);
  return {blob: await canvasBlob(c, 'image/jpeg', 0.75), w: c.width, h: c.height};
}
async function scanNeu(memo) {
  const files = await waehleDateien('image/*', {capture: true}); if (!files.length) return;
  let m = memo;
  if (!m) { const t = await eingabe('Dokument scannen', [{k: 'titel', l: 'Bezeichnung (z. B. Lieferschein, Aufmaßskizze)', v: 'Scan'}]); if (!t) return;
    m = await neuesMemo('scan', ordnerFuer('Abrechnung'), {titel: t.titel || 'Scan'}); }
  const n = (await dateienVon(m.id)).length;
  for (const [i, file] of files.entries()) { const s = await scanAufbereiten(file); await dateiSpeichern(m, s.blob, {w: s.w, h: s.h, nr: n + i}); }
  toast('Seite gespeichert'); geh('#/m/' + m.id);
}

// ---------- Memo ----------
async function memoSeite(id) {
  const m = await get('memos', id); if (!lebend(m)) return geh('#/');
  const p = await get('projects', m.projectId); AKT = {projekt: p, ordner: null};
  if (erwaehntMich(m)) { m.kommentare.forEach(k => { if ((k.an || []).includes(CFG.benutzer)) k.gelesen = [...new Set([...(k.gelesen || []), CFG.benutzer])]; }); await put('memos', m); }
  titel(TYP[m.typ][1]);
  const dateien = await dateienVon(id), bilder = dateien.filter(istBild), sonst = dateien.filter(f => !istBild(f));
  const plan = m.plan ? await get('memos', m.plan.planId) : null;
  const alleTags = [...new Set([...CFG.tags, ...(m.tags || [])])];
  APP.innerHTML = `<div class="hinweis"><a href="#/p/${p.id}">${esc(p.name)}</a> › ${esc(m.ordner)}</div>
    <div class="card"><div class="meta hinweis">${TYP[m.typ][0]} ${datZeit(m.datum)} · ${esc(m.autor || 'unbekannt')}</div>
      <label>Ordner</label><select id="ordner">${[...new Set([...p.ordner, m.ordner])].map(o => `<option ${o === m.ordner ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
      <label>Titel</label><input id="titelfeld" value="${esc(m.titel)}" placeholder="optional">
      <label>Beschreibung</label><textarea id="text" placeholder="Was ist zu sehen, was wurde gemacht?">${esc(m.text)}</textarea>
      <label>Schlagworte</label><div id="tags">${alleTags.map(t => `<span class="tag ${(m.tags || []).includes(t) ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</span>`).join('')}<span class="tag" data-tagneu>+ eigenes</span></div>
      ${plan ? `<p><a class="btn sek klein" href="#/plan/${plan.id}">🗺 Im Plan „${esc(plan.titel)}“ zeigen</a></p>` : ''}
    </div>
    ${m.typ === 'formular' ? `<div class="card"><b>📋 ${esc(formular(m.formular.vorlage)?.titel)}</b><br><a class="btn" href="#/f/${m.id}">Ausfüllen</a><button class="btn dunkel" id="fpdf">PDF</button></div>` : ''}
    ${m.typ === 'plan' ? `<div class="card"><a class="btn" href="#/plan/${m.id}">🗺 Plan öffnen</a></div>` : ''}
    ${m.typ === 'scan' ? `<div class="card"><b>🖨 ${bilder.length} Seite(n)</b><br><button class="btn sek" id="seite">+ Seite</button><button class="btn dunkel" id="spdf">PDF</button></div>` : ''}
    <h2>Fotos <small>${bilder.length}</small></h2>
    ${bilder.length ? `<div class="fotos">${bilder.map(f => `<div class="foto"><img src="${bildUrl(f.blob)}" data-mark="${f.id}" alt=""><button class="x" data-fdel="${f.id}" aria-label="Foto löschen">×</button></div>`).join('')}</div><p class="hinweis">Foto antippen zum Markieren (Pfeil, Kreis, Text, Stift).</p>` : ''}
    <button class="btn sek klein" id="fotoplus">📷 Foto hinzufügen</button>
    ${sonst.map(f => /^audio\//.test(f.typ) ? `<audio controls src="${bildUrl(f.blob)}"></audio>` : `<div class="card">📎 ${esc(f.name || 'Datei')} <a class="btn sek klein" href="${bildUrl(f.blob)}" target="_blank" rel="noopener">Öffnen</a></div>`).join('')}
    <h2>Aufgabe</h2><div id="aufgabe"></div>
    <h2>Kommentare <small>${m.kommentare?.length || 0}</small></h2><div id="komm"></div>
    <h2>Weitergeben</h2>
    <button class="btn sek" id="mpdf">PDF dieses Eintrags</button><button class="btn sek" id="loeschen">Löschen</button>`;
  const speichern = async () => { await memoSpeichern(m); };
  let t; const spaeter = () => { clearTimeout(t); t = setTimeout(speichern, 500); };
  $('#text').oninput = e => { m.text = e.target.value; spaeter(); };
  $('#titelfeld').oninput = e => { m.titel = e.target.value; spaeter(); };
  $('#ordner').onchange = e => { m.ordner = e.target.value; speichern(); toast('Verschoben nach ' + m.ordner); };
  if (location.hash.includes('fokus')) setTimeout(() => $('#text').focus(), 100);
  $('#tags').onclick = async e => {
    const el = e.target.closest('.tag'); if (!el) return;
    if (el.dataset.tagneu !== undefined) {
      const r = await eingabe('Schlagwort', [{k: 't', l: 'Neues Schlagwort'}]); if (!r?.t) return;
      if (!CFG.tags.includes(r.t)) { CFG.tags.push(r.t); await cfgSpeichern(); }
      m.tags = [...new Set([...(m.tags || []), r.t])]; await speichern(); return render();
    }
    const tg = el.dataset.tag; m.tags = m.tags || []; m.tags.includes(tg) ? m.tags.splice(m.tags.indexOf(tg), 1) : m.tags.push(tg);
    el.classList.toggle('on'); speichern();
  };
  $('#fotoplus').onclick = async () => {
    const q = await auswahl('Foto', [{l: '📷 Kamera', v: 'k'}, {l: '🖼 Galerie', v: 'g'}]); if (!q) return;
    const files = await waehleDateien('image/*', q === 'k' ? {capture: true} : {multiple: true}); if (!files.length) return;
    await fotosAnhaengen(m, files); await speichern(); render();
  };
  APP.querySelectorAll('[data-fdel]').forEach(b => b.onclick = async () => { if (await frage('Foto löschen?', 'Löschen')) { await del('files', b.dataset.fdel); await speichern(); render(); } });
  APP.querySelectorAll('[data-mark]').forEach(i => i.onclick = () => markieren(i.dataset.mark));
  if ($('#fpdf')) $('#fpdf').onclick = async () => { toast('PDF wird erstellt …'); const r = await formularPdf(m, p); teilen(r.blob, r.name); };
  if ($('#spdf')) $('#spdf').onclick = async () => { const r = await scanPdf(m, p); teilen(r.blob, r.name); };
  if ($('#seite')) $('#seite').onclick = () => scanNeu(m);
  $('#mpdf').onclick = async () => { toast('PDF wird erstellt …'); const r = await berichtPdf(p, [m], 'foto', ''); teilen(r.blob, r.name.replace('Fotodokumentation', m.titel ? dateiname(m.titel) : 'Eintrag')); };
  $('#loeschen').onclick = async () => { if (await frage('Eintrag mit allen Fotos löschen? Beim nächsten Austausch wird er auch bei den Kollegen entfernt.', 'Löschen')) { await memoLoeschen(m); geh('#/p/' + p.id); } };
  aufgabeZeichnen(m, speichern);
  kommentareZeichnen(m, speichern);
}
function aufgabeZeichnen(m, speichern) {
  const el = $('#aufgabe');
  if (!m.aufgabe) { el.innerHTML = '<button class="btn" id="alsauf">✔ Als Aufgabe</button>'; $('#alsauf').onclick = () => aufgabeBearbeiten(m, speichern); return; }
  const a = m.aufgabe, ueber = a.status !== 'erledigt' && a.frist && a.frist < heute();
  el.innerHTML = `<div class="card"><div>${aufgabeBadge(m)}</div><div class="s">Zuständig: <b>${esc(a.an || '–')}</b> · Frist: <b class="${ueber ? 'rotschrift' : ''}">${dat(a.frist) || '–'}</b>${a.von ? ' · angelegt von ' + esc(a.von) : ''}</div>
    <button class="btn ${a.status === 'erledigt' ? 'sek' : ''}" id="erl">${a.status === 'erledigt' ? 'Wieder öffnen' : '✔ Erledigt'}</button><button class="btn sek" id="aufb">Ändern</button><button class="btn sek" id="aufx">Keine Aufgabe</button></div>`;
  $('#erl').onclick = async () => { a.status = a.status === 'erledigt' ? 'offen' : 'erledigt'; a.erledigt = a.status === 'erledigt' ? heute() : ''; a.erledigtVon = CFG.benutzer; await speichern(); aufgabeZeichnen(m, speichern); };
  $('#aufb').onclick = () => aufgabeBearbeiten(m, speichern);
  $('#aufx').onclick = async () => { m.aufgabe = null; await speichern(); aufgabeZeichnen(m, speichern); };
}
async function aufgabeBearbeiten(m, speichern) {
  const a = m.aufgabe || {};
  const r = await eingabe('Aufgabe', [{k: 'an', l: 'Zuständig', t: 'select', o: ['', ...CFG.mitarbeiter], v: a.an || ''}, {k: 'frist', l: 'Frist', t: 'date', v: a.frist || ''}]);
  if (!r) return;
  m.aufgabe = {...a, an: r.an, frist: r.frist, status: a.status || 'offen', von: a.von || CFG.benutzer, angelegt: a.angelegt || heute()};
  await speichern(); aufgabeZeichnen(m, speichern);
}
function kommentareZeichnen(m, speichern) {
  const el = $('#komm');
  const text = k => esc(k.text).replace(/@([\wÄÖÜäöüß.-]+(?: [\wÄÖÜäöüß.-]+)?)/g, (x, n) => CFG.mitarbeiter.some(ma => ma === n) ? `<b class="at">@${n}</b>` : x);
  el.innerHTML = (m.kommentare || []).map(k => `<div class="kommentar"><small>${esc(k.autor)} · ${datZeit(k.datum)}${k.an?.length ? ' · an ' + esc(k.an.join(', ')) : ''}</small><div>${text(k)}</div></div>`).join('') +
    `<div class="row" style="margin-top:8px"><textarea id="ktext" placeholder="Kommentar, Kollegen mit @Name erwähnen" style="min-height:44px"></textarea></div>
     <div>${CFG.mitarbeiter.filter(n => n !== CFG.benutzer).map(n => `<span class="tag" data-an="${esc(n)}">@${esc(n)}</span>`).join('')}</div>
     <button class="btn klein" id="ksend">Kommentar speichern</button>`;
  el.querySelectorAll('[data-an]').forEach(t => t.onclick = () => { const ta = $('#ktext'); ta.value += (ta.value && !ta.value.endsWith(' ') ? ' ' : '') + '@' + t.dataset.an + ' '; ta.focus(); });
  $('#ksend').onclick = async () => {
    const v = $('#ktext').value.trim(); if (!v) return;
    const an = CFG.mitarbeiter.filter(n => v.includes('@' + n));
    m.kommentare = [...(m.kommentare || []), {id: uid(), autor: CFG.benutzer, datum: jetztIso(), text: v, an, gelesen: []}];
    await speichern(); kommentareZeichnen(m, speichern);
    if (an.length) toast('Gespeichert. Kollegen sehen es nach dem nächsten Paketaustausch.');
  };
}

// ---------- Foto markieren ----------
async function markieren(fid) {
  const f = await get('files', fid); const bmp = await bildLaden(f.blob);
  const fen = fenster(`<div class="werkzeug">${[['pfeil', '↗ Pfeil'], ['kreis', '◯ Kreis'], ['rechteck', '▭ Rahmen'], ['stift', '✎ Stift'], ['text', 'T Text']].map(([k, l], i) => `<button class="btn sek klein ${i ? '' : 'on'}" data-w="${k}">${l}</button>`).join('')}
    ${['#e30613', '#ffd400', '#ffffff'].map((c, i) => `<button class="btn klein ${i ? '' : 'on'}" data-c="${c}" style="background:${c};width:34px">&nbsp;</button>`).join('')}</div>
    <div class="zeichnen"><canvas></canvas></div>
    <div class="row"><button class="btn sek" data-undo>↶ Zurück</button>${f.original ? '<button class="btn sek" data-orig>Original</button>' : ''}<button class="btn" data-ok>Speichern</button></div>`, {titel: 'Foto markieren', voll: true});
  const cv = fen.el.querySelector('canvas'), ctx = cv.getContext('2d');
  cv.width = bmp.width; cv.height = bmp.height;
  let werkzeug = 'pfeil', farbe = '#e30613', formen = [], akt = null;
  const lw = Math.max(5, Math.max(cv.width, cv.height) / 160);
  const zeichne = () => {
    ctx.drawImage(bmp, 0, 0); ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of [...formen, akt].filter(Boolean)) {
      ctx.strokeStyle = ctx.fillStyle = s.c; const [x1, y1] = s.p[0], [x2, y2] = s.p[s.p.length - 1];
      ctx.beginPath();
      if (s.w === 'stift') { s.p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
      if (s.w === 'rechteck') ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      if (s.w === 'kreis') { ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2 || 1, Math.abs(y2 - y1) / 2 || 1, 0, 0, 7); ctx.stroke(); }
      if (s.w === 'pfeil') { const a = Math.atan2(y2 - y1, x2 - x1), k = lw * 6; ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - k * Math.cos(a - .45), y2 - k * Math.sin(a - .45)); ctx.lineTo(x2 - k * Math.cos(a + .45), y2 - k * Math.sin(a + .45)); ctx.fill(); }
      if (s.w === 'text') { ctx.font = `bold ${lw * 7}px system-ui,sans-serif`; ctx.lineWidth = lw * 1.2; ctx.strokeStyle = s.c === '#ffffff' ? '#000' : '#fff'; ctx.strokeText(s.t, x1, y1); ctx.fillText(s.t, x1, y1); ctx.lineWidth = lw; }
    }
  };
  zeichne();
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.onpointerdown = async e => {
    if (werkzeug === 'text') { const p0 = pos(e); const r = await eingabe('Text', [{k: 't', l: 'Text im Foto'}]); if (r?.t) { formen.push({w: 'text', c: farbe, p: [p0], t: r.t}); zeichne(); } return; }
    cv.setPointerCapture(e.pointerId); akt = {w: werkzeug, c: farbe, p: [pos(e)]};
  };
  cv.onpointermove = e => { if (!akt) return; if (akt.w === 'stift') akt.p.push(pos(e)); else akt.p[1] = pos(e); zeichne(); };
  cv.onpointerup = () => { if (akt && akt.p.length > 1) formen.push(akt); akt = null; zeichne(); };
  fen.el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { werkzeug = b.dataset.w; fen.el.querySelectorAll('[data-w]').forEach(x => x.classList.toggle('on', x === b)); });
  fen.el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { farbe = b.dataset.c; fen.el.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b)); });
  fen.el.querySelector('[data-undo]').onclick = () => { formen.pop(); zeichne(); };
  const orig = fen.el.querySelector('[data-orig]');
  if (orig) orig.onclick = async () => { f.blob = f.original; delete f.original; f.updatedAt = stempel(); await put('files', f); fen.zu(); render(); };
  fen.el.querySelector('[data-ok]').onclick = async () => {
    if (!formen.length) return fen.zu();
    if (!f.original) f.original = f.blob;
    f.blob = await canvasBlob(cv); f.updatedAt = stempel(); await put('files', f);
    const m = await get('memos', f.memoId); await memoSpeichern(m); fen.zu(); render();
  };
}

// ---------- Formular ----------
async function formularSeite(id) {
  const m = await get('memos', id); if (!lebend(m)) return geh('#/');
  const p = await get('projects', m.projectId), f = formular(m.formular.vorlage);
  titel(f.titel);
  const zeichne = () => {
    APP.innerHTML = `<div class="hinweis"><a href="#/p/${p.id}">${esc(p.name)}</a> › <a href="#/m/${m.id}">Eintrag</a></div>
      <div id="form">${formularHtml(f, m.formular.werte)}</div>
      <h2>Abschließen</h2><button class="btn" id="pdf">PDF erstellen und teilen</button><a class="btn sek" href="#/m/${m.id}">Fotos, Aufgabe, Kommentar</a>
      <p class="hinweis">Alles wird automatisch gespeichert.</p>`;
    $('#pdf').onclick = async () => { await memoSpeichern(m); toast('PDF wird erstellt …'); const r = await formularPdf(m, p); teilen(r.blob, r.name); };
    formularBinden($('#form'), f, m.formular.werte, () => memoSpeichern(m), zeichne);
  };
  zeichne();
}

// ---------- Plan ----------
async function planSeite(id) {
  const m = await get('memos', id); if (!lebend(m)) return geh('#/');
  const p = await get('projects', m.projectId); AKT = {projekt: p, ordner: null};
  titel(m.titel || 'Plan');
  const [datei] = await dateienVon(id); if (!datei) { APP.innerHTML = '<div class="leer">Plan ohne Datei</div>'; return; }
  const seite = +(new URLSearchParams(location.hash.split('?')[1]).get('s') || 1);
  APP.innerHTML = `<div class="hinweis"><a href="#/p/${p.id}/plaene">${esc(p.name)} › Pläne</a></div>
    <div class="werkzeug"><button class="btn" id="pinmodus">📍 Markierung setzen</button><button class="btn sek klein" id="zplus">＋</button><button class="btn sek klein" id="zminus">－</button><span id="seiten"></span></div>
    <div class="plan" id="plan"><div class="innen" id="innen"></div></div>
    <p class="hinweis">„Markierung setzen“, dann auf die Stelle im Plan tippen. Daraus wird ein Eintrag mit Fotos, Aufgabe und Kommentar.</p><div id="pinliste"></div>`;
  const innen = $('#innen');
  let el;
  if (/pdf/.test(datei.typ)) {
    const doc = await pdfjsLib.getDocument({data: await datei.blob.arrayBuffer()}).promise;
    if (doc.numPages > 1) $('#seiten').innerHTML = `Seite <select id="sw">${Array.from({length: doc.numPages}, (_, i) => `<option ${i + 1 === seite ? 'selected' : ''}>${i + 1}</option>`).join('')}</select>`;
    const pg = await doc.getPage(seite), vp0 = pg.getViewport({scale: 1}), sc = Math.min(4, 2400 / Math.max(vp0.width, vp0.height)), vp = pg.getViewport({scale: sc});
    el = document.createElement('canvas'); el.width = vp.width; el.height = vp.height;
    await pg.render({canvasContext: el.getContext('2d'), viewport: vp}).promise;
    if ($('#sw')) $('#sw').onchange = e => geh(`#/plan/${id}?s=${e.target.value}`);
  } else { el = document.createElement('img'); el.src = bildUrl(datei.blob); await el.decode(); }
  innen.appendChild(el);
  let zoom = 1; const breite = () => { const w = $('#plan').clientWidth * zoom; el.style.width = w + 'px'; el.style.height = 'auto'; };
  breite();
  $('#zplus').onclick = () => { zoom = Math.min(6, zoom * 1.5); breite(); };
  $('#zminus').onclick = () => { zoom = Math.max(1, zoom / 1.5); breite(); };
  const pins = (await memosVon(p.id)).filter(x => x.plan?.planId === id && (x.plan.seite || 1) === seite).sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));
  pins.forEach((x, i) => {
    const d = document.createElement('div'); d.className = 'pin' + (x.aufgabe?.status === 'erledigt' ? ' erl' : '');
    d.style.left = x.plan.x * 100 + '%'; d.style.top = x.plan.y * 100 + '%'; d.innerHTML = `<span>${i + 1}</span>`; d.onclick = e => { e.stopPropagation(); geh('#/m/' + x.id); };
    innen.appendChild(d);
  });
  const vors = await vorschauKarte(p.id);
  $('#pinliste').innerHTML = pins.map((x, i) => memoZeile({...x, titel: `${i + 1}. ${x.titel || x.text?.split('\n')[0] || TYP[x.typ][1]}`, text: x.titel ? x.text : ''}, vors)).join('');
  let modus = false;
  $('#pinmodus').onclick = () => { modus = !modus; $('#pinmodus').textContent = modus ? 'Auf den Plan tippen …' : '📍 Markierung setzen'; };
  el.onclick = async e => {
    if (!modus) return;
    const r = el.getBoundingClientRect(), pos = {planId: id, seite, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height};
    const art = await auswahl('Markierung', [{l: '📷 Mit Foto', v: 'foto'}, {l: '✎ Nur Notiz', v: 'notiz'}]); if (!art) return;
    AKT.ordner = null;
    art === 'foto' ? fotoNeu({plan: pos}) : notizNeu({plan: pos});
  };
}

// ---------- Bericht ----------
function berichtTab(p, memos, vors) {
  const I = $('#inhalt');
  const tags = [...new Set(memos.flatMap(m => m.tags || []))].sort();
  I.innerHTML = `<label>Art</label><select id="art">${BERICHTE.map(b => `<option value="${b.id}">${b.titel}</option>`).join('')}</select>
    <label>Einleitung</label><textarea id="einl"></textarea>
    <div class="row"><div><label>Ordner</label><select id="fo"><option value="">alle</option>${p.ordner.map(o => `<option>${esc(o)}</option>`).join('')}</select></div>
      <div><label>Schlagwort</label><select id="ft"><option value="">alle</option>${tags.map(t => `<option>${esc(t)}</option>`).join('')}</select></div></div>
    <div class="row"><div><label>von</label><input type="date" id="fv"></div><div><label>bis</label><input type="date" id="fb"></div></div>
    <h2>Einträge <small id="anz"></small></h2><div id="bl"></div>
    <button class="btn voll" id="erstellen">PDF erstellen</button>
    <p class="hinweis">Für den Kunden: Bericht erstellen und per Mail oder WhatsApp teilen. Eine öffentliche Kundenfreigabe wie bei Cloud-Diensten gibt es ohne Server nicht.</p>`;
  const vorlage = () => { const b = BERICHTE.find(x => x.id === $('#art').value); $('#einl').value = b.text; filtern(); };
  const filtern = () => {
    const art = $('#art').value, o = $('#fo').value, t = $('#ft').value, v = $('#fv').value, b = $('#fb').value;
    const l = memos.filter(m => (!o || m.ordner === o) && (!t || (m.tags || []).includes(t)) && (!v || m.datum >= v) && (!b || m.datum.slice(0, 10) <= b) &&
      (art !== 'aufgaben' || m.aufgabe) && (art !== 'zusatz' || (m.tags || []).includes('Zusatzleistung') || t) && (art !== 'schaden' || ['Schaden', 'Mangel', 'Sturm'].some(x => (m.tags || []).includes(x)) || o || t));
    $('#bl').innerHTML = l.map(m => memoZeile(m, vors, {check: true})).join('') || '<div class="leer">Keine passenden Einträge</div>';
    $('#anz').textContent = l.length;
  };
  ['#fo', '#ft', '#fv', '#fb'].forEach(s => $(s).onchange = filtern);
  $('#art').onchange = vorlage; vorlage();
  $('#erstellen').onclick = async () => {
    const ids = [...I.querySelectorAll('[data-wahl]:checked')].map(c => c.dataset.wahl);
    if (!ids.length) return toast('Keine Einträge ausgewählt');
    toast('PDF wird erstellt …');
    const r = await berichtPdf(p, memos.filter(m => ids.includes(m.id)), $('#art').value, $('#einl').value);
    teilen(r.blob, r.name);
  };
}

// ---------- Projektinfo ----------
function infoTab(p, memos) {
  $('#inhalt').innerHTML = `<div class="card"><div class="t">${esc(p.name)}</div>
    <div class="s">${esc(p.adresse || '')}${p.adresse ? ` · <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.adresse)}" target="_blank" rel="noopener">Karte</a>` : ''}</div>
    <div class="s">Auftraggeber: ${esc(p.kunde || '–')}${p.telefon ? ` · <a href="tel:${esc(p.telefon.replace(/\s/g, ''))}">${esc(p.telefon)}</a>` : ''}</div>
    <div class="s">Auftrags-Nr.: ${esc(p.auftragsnr || '–')} · angelegt ${dat(p.angelegt)}${p.von ? ' von ' + esc(p.von) : ''} · ${memos.length} Einträge</div></div>
    <button class="btn sek" id="bearb">Bearbeiten</button><button class="btn sek" id="ordn">Ordner anpassen</button>
    <button class="btn sek" id="status">${p.status === 'abgeschlossen' ? 'Wieder aktivieren' : 'Abschließen'}</button>
    <h2>Mit Kollegen austauschen</h2>
    <p class="hinweis">Paket erstellen und per WhatsApp, Mail oder Drive an Kollegen schicken. Die Kollegen lesen es auf der Startseite mit „Paket einlesen“ ein. Neuere Einträge, Kommentare und Aufgaben werden zusammengeführt, nichts wird doppelt angelegt. Danach den eigenen Stand zurückschicken lassen.</p>
    <button class="btn" id="paket">⇧ Projektpaket erstellen</button>
    <h2>Löschen</h2><button class="btn sek" id="pdel">Projekt löschen</button>`;
  $('#bearb').onclick = async () => {
    const e = await eingabe('Projekt', [{k: 'name', l: 'Projektname', v: p.name}, {k: 'adresse', l: 'Adresse Baustelle', v: p.adresse}, {k: 'kunde', l: 'Auftraggeber', v: p.kunde},
      {k: 'telefon', l: 'Telefon', t: 'tel', v: p.telefon}, {k: 'auftragsnr', l: 'Auftrags-Nr.', v: p.auftragsnr}]);
    if (e && e.name) { Object.assign(p, e); await projektSpeichern(p); render(); }
  };
  $('#ordn').onclick = async () => {
    const e = await eingabe('Ordner (einer je Zeile)', [{k: 'o', l: 'Ordner', t: 'textarea', v: p.ordner.join('\n')}]);
    if (e) { p.ordner = [...new Set(e.o.split('\n').map(s => s.trim()).filter(Boolean))]; if (!p.ordner.length) p.ordner = ['Fotos']; await projektSpeichern(p); render(); }
  };
  $('#status').onclick = async () => { p.status = p.status === 'abgeschlossen' ? 'aktiv' : 'abgeschlossen'; await projektSpeichern(p); render(); };
  $('#paket').onclick = async () => { toast('Paket wird erstellt …'); const b = await paketErstellen([p.id]); teilen(b, `${kompakt()} Projektakte ${dateiname(p.name)} von ${dateiname(CFG.benutzer || 'unbekannt')}.zip`); };
  $('#pdel').onclick = async () => {
    if (!await frage(`Projekt „${p.name}“ mit ${memos.length} Einträgen löschen? Vorher am besten ein Paket als Sicherung erstellen.`, 'Löschen')) return;
    for (const m of memos) await memoLoeschen(m);
    p.deleted = true; await projektSpeichern(p); geh('#/');
  };
}

// ---------- Aufgaben übergreifend ----------
async function aufgabenSeite(sicht) {
  titel('Aufgaben');
  const ps = Object.fromEntries((await projekte()).map(p => [p.id, p]));
  const memos = (await all('memos')).filter(m => lebend(m) && ps[m.projectId]);
  const offen = memos.filter(m => m.aufgabe && m.aufgabe.status !== 'erledigt').sort((a, b) => (a.aufgabe.frist || '9').localeCompare(b.aufgabe.frist || '9'));
  const liste = {mir: offen.filter(fuerMich), alle: offen, erwaehnt: memos.filter(m => (m.kommentare || []).some(k => (k.an || []).includes(CFG.benutzer))).sort(neuesteZuerst),
    erledigt: memos.filter(m => m.aufgabe?.status === 'erledigt').sort((a, b) => (b.aufgabe.erledigt || '').localeCompare(a.aufgabe.erledigt || ''))}[sicht] || [];
  const vors = {}; for (const pid of new Set(liste.map(m => m.projectId))) Object.assign(vors, await vorschauKarte(pid));
  APP.innerHTML = `<div class="tabs">${[['mir', 'Meine'], ['alle', 'Alle offenen'], ['erwaehnt', 'Erwähnungen'], ['erledigt', 'Erledigt']].map(([k, l]) => `<a href="#/aufgaben/${k}" class="${sicht === k ? 'on' : ''}">${l}</a>`).join('')}</div>
    ${!CFG.benutzer && sicht === 'mir' ? '<div class="card">Unter „Mehr“ den eigenen Namen wählen, dann erscheinen hier die eigenen Aufgaben.</div>' : ''}
    ${liste.map(m => memoZeile(m, vors, {projekt: ps[m.projectId].name})).join('') || '<div class="leer">Nichts offen 👍</div>'}`;
}

// ---------- Suche ----------
async function sucheSeite() {
  titel('Suche');
  const ps = Object.fromEntries((await projekte()).map(p => [p.id, p]));
  const memos = (await all('memos')).filter(m => lebend(m) && ps[m.projectId]).sort(neuesteZuerst);
  const tags = [...new Set(memos.flatMap(m => m.tags || []))].sort();
  APP.innerHTML = `<input id="q" placeholder="Text, Projekt, Name, Formular …" autofocus><div style="margin:8px 0">${tags.map(t => `<span class="tag" data-t="${esc(t)}">${esc(t)}</span>`).join('')}</div><div id="treffer"></div>`;
  const aktiv = new Set(); const vors = {};
  const suche = async () => {
    const q = $('#q').value.toLowerCase().trim();
    if (!q && !aktiv.size) { $('#treffer').innerHTML = '<div class="leer">Suchbegriff eingeben oder Schlagwort wählen</div>'; return; }
    const l = memos.filter(m => [...aktiv].every(t => (m.tags || []).includes(t)) && (!q || [m.titel, m.text, m.autor, m.ordner, ps[m.projectId].name, ps[m.projectId].adresse, ps[m.projectId].kunde,
      (m.tags || []).join(' '), (m.kommentare || []).map(k => k.text).join(' '), m.aufgabe?.an, m.formular ? JSON.stringify(m.formular.werte).replace(/data:image[^"]+/g, '') : ''].join(' ').toLowerCase().includes(q))).slice(0, 100);
    for (const pid of new Set(l.map(m => m.projectId))) if (!vors[pid]) { vors[pid] = 1; Object.assign(vors, await vorschauKarte(pid)); }
    $('#treffer').innerHTML = `<p class="hinweis">${l.length} Treffer</p>` + l.map(m => memoZeile(m, vors, {projekt: ps[m.projectId].name})).join('');
  };
  $('#q').oninput = suche;
  APP.onclick = e => { const t = e.target.closest('[data-t]'); if (!t) return; aktiv.has(t.dataset.t) ? aktiv.delete(t.dataset.t) : aktiv.add(t.dataset.t); t.classList.toggle('on'); suche(); };
  suche();
}

// ---------- Einstellungen ----------
async function einstellungenSeite() {
  titel('Mehr');
  APP.onclick = null;
  const F = CFG.firma;
  APP.innerHTML = `<h2>Ich bin</h2>
    <select id="benutzer"><option value="">– bitte wählen –</option>${CFG.mitarbeiter.map(n => `<option ${n === CFG.benutzer ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
    <p class="hinweis">Der Name steht an jedem Eintrag, Kommentar und Formular dieses Geräts.</p>
    <h2>Team</h2><label>Mitarbeiter (einer je Zeile)</label><textarea id="ma">${esc(CFG.mitarbeiter.join('\n'))}</textarea>
    <h2>Vorlagen</h2><label>Ordner für neue Projekte (einer je Zeile)</label><textarea id="ord" style="min-height:160px">${esc(CFG.ordner.join('\n'))}</textarea>
    <label>Schlagworte (eines je Zeile)</label><textarea id="tg" style="min-height:160px">${esc(CFG.tags.join('\n'))}</textarea>
    <h2>Firma (Kopf der PDFs)</h2>
    ${[['name', 'Firma'], ['inhaber', 'Inhaber'], ['titel', 'Titel'], ['strasse', 'Straße'], ['ort', 'PLZ Ort'], ['tel', 'Telefon'], ['mail', 'E-Mail'], ['web', 'Internet']].map(([k, l]) => `<label>${l}</label><input data-fi="${k}" value="${esc(F[k])}">`).join('')}
    <button class="btn voll" id="speichern" style="margin-top:12px">Speichern</button>
    <h2>Sicherung</h2>
    <p class="hinweis">Alle Daten liegen nur auf diesem Gerät. Regelmäßig eine Sicherung erstellen und z. B. in Google Drive ablegen. Bei Gerätewechsel hier wieder einlesen.</p>
    <button class="btn sek" id="sich">⇧ Sicherung erstellen</button><button class="btn sek" id="ein">⇩ Sicherung oder Paket einlesen</button>
    <h2>Über</h2><p class="hinweis">Hartmann Dächer Projektakte, Version ${VERSION}. Keine Datenübertragung an Dritte: Daten bleiben auf dem Gerät und werden nur über selbst geteilte Pakete weitergegeben.</p>`;
  $('#benutzer').onchange = async e => { CFG.benutzer = e.target.value; await cfgSpeichern(); toast('Gespeichert'); };
  $('#speichern').onclick = async () => {
    const zeilen = s => [...new Set($(s).value.split('\n').map(x => x.trim()).filter(Boolean))];
    CFG.mitarbeiter = zeilen('#ma'); CFG.ordner = zeilen('#ord'); CFG.tags = zeilen('#tg');
    APP.querySelectorAll('[data-fi]').forEach(i => CFG.firma[i.dataset.fi] = i.value.trim());
    await cfgSpeichern(); toast('Gespeichert'); render();
  };
  $('#sich').onclick = async () => { toast('Sicherung wird erstellt …'); teilen(await sicherungErstellen(), `${kompakt()} Sicherung Projektakte ${dateiname(CFG.benutzer || 'Gerät')}.zip`); };
  $('#ein').onclick = einlesenDialog;
}

// ---------- Start ----------
(async () => {
  db = await openDB(); await cfg();
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  window.addEventListener('hashchange', () => { APP.onclick = null; render(); });
  render();
})();
