/* Deixa o Brain abrir sem internet. Muda VERSAO sempre que atualizar os arquivos. */
const VERSAO = 'brain-v7';
const ARQUIVOS = ['./', 'index.html', 'financas.html', 'tarefas.html', 'rotina.html', 'jornada.html',
  'base.css', 'nav.js', 'texto.js', 'prefs.js', 'coach.js', 'categorias.js', 'api-local.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Internet primeiro (pega atualizações); se falhar, usa o que está guardado.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(e.request, copia)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
