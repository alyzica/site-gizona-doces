/* Service worker mínimo: só habilita a instalação e mostra uma tela offline.
   NÃO guarda dados do Supabase nem páginas em cache (sempre busca da rede),
   para o cardápio, preços e pedidos nunca ficarem desatualizados. */
const OFFLINE = 'offline.html';
const CACHE = 'gizona-offline-v1';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.add(OFFLINE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
