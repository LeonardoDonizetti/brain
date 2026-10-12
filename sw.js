/* Deixa o Brain abrir sem internet. Muda VERSAO sempre que atualizar os arquivos. */
const VERSAO = 'brain-v59';
const ARQUIVOS = ['./', 'index.html', 'financas.html', 'tarefas.html', 'rotina.html', 'jornada.html', 'estudos.html',
  'base.css', 'nav.js', 'texto.js', 'prefs.js', 'coach.js', 'ia.js', 'consultor.js', 'ordem.js', 'anexo.js', 'toque.js', 'animar.js', 'celebrar.js', 'agenda.js', 'estudos.js', 'tarefas.js', 'onboarding.js', 'boasvindas.html', 'leitor.js', 'categorias.js', 'cofre.js', 'jogo.js', 'jogo-ui.js', 'mascote.js', 'tour.js', 'bloqueio.js', 'api-local.js', 'manifest.webmanifest', 'fonts/ibm-plex-sans-latin-400-normal.woff2', 'fonts/ibm-plex-sans-latin-500-normal.woff2', 'fonts/ibm-plex-sans-latin-600-normal.woff2', 'fonts/fraunces-latin-500-normal.woff2',
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
