// Service worker mínimo — habilita a instalação (PWA) e um cache leve do shell.
// Não faz cache agressivo pra não servir versões velhas de um app dinâmico.
const CACHE = "wayline-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

// Network-first: sempre tenta a rede; cai no cache só se offline (navegações).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r ?? caches.match("/app")) as Promise<Response>),
  );
});
