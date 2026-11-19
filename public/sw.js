/* Leveza — service worker seguro.
 * Faz cache SOMENTE de recursos públicos e estáticos (JS/CSS do build, fontes, ícones).
 * Nunca armazena respostas de API, Supabase, fotos ou qualquer dado pessoal.
 */
const VERSION = "leveza-static-v1";
const PRECACHE = ["/offline.html", "/favicon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

function isPublicStatic(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/brand/") ||
      url.pathname === "/favicon.svg")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase/IA: nunca interceptar
  if (url.pathname.startsWith("/api/")) return;

  if (isPublicStatic(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && res.type === "basic") {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    // Rede primeiro; offline mostra página genérica (sem dados).
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
  }
});
