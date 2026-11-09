// Offline-Speicher der App-Dateien. Bei jeder Änderung VERSION erhöhen.
// Startet sofort aus dem Speicher (schlechtes Netz auf dem Dach), aktualisiert im Hintergrund; neue Fassung ab dem nächsten Start.
const VERSION = 'hd-projektakte-v1.1.0';
const FILES = ['./', './index.html', './app.css', './kern.js', './vorlagen.js', './berichte.js', './austausch.js', './app.js', './manifest.webmanifest',
  './jspdf.umd.min.js', './jszip.min.js', './pdf.min.js', './pdf.worker.min.js', './logo.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const alt = await c.match(e.request, {ignoreSearch: true});
    const neu = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => alt);
    return alt || neu;
  }));
});
