/* Mais Valor — Service Worker (PWA)
   Estratégia: network-first (sempre tenta dados frescos),
   com fallback para cache quando estiver offline.
   Chamadas externas (Firebase, Google, fontes) passam direto, sem cache. */

const CACHE = 'mv-pwa-v2';
const SHELL = [
  '/index.html',
  '/style.css',
  '/mobile.css',
  '/nav.js',
  '/data.js',
  '/favicon.png',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // [S8] Carteira offline: pré-cacheia as páginas do consolidador. Os DADOS da
  // carteira ficam offline via persistência do Firestore (IndexedDB) — juntos,
  // shell + dados permitem abrir a carteira sem internet com o último estado.
  '/carteira/resumo.html',
  '/carteira/lancamentos.html',
  '/carteira/rentabilidade.html',
  '/carteira/patrimonio.html',
  '/carteira/proventos.html',
  '/carteira/aporte.html',
  '/carteira/metas.html',
  '/carteira/irpf.html',
  '/carteira/analise.html',
  '/carteira/common.js',
  '/carteira/firebase.js',
  '/carteira/common.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Só intercepta o próprio site. Firebase/Google/fontes seguem normalmente.
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
  );
});
