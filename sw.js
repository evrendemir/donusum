const CACHE = 'donusum-v2';
const CORE = ['./', './index.html', './css/styles.css', './manifest.webmanifest',
  './js/app.js', './js/db.js', './js/state.js', './js/avatar.js', './js/ui.js', './js/screen-today.js', './js/screen-week.js', './js/screen-plan.js', './js/screen-me.js', './js/planparse.js',
  './vendor/jszip.min.js', './vendor/pdf.min.js', './vendor/pdf.worker.min.js', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // app shell: network first (so updates arrive), fallback cache
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
    return;
  }
  // third party (fonts, pdf.js, jszip): cache first, then network
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return res; }).catch(() => r)));
});
