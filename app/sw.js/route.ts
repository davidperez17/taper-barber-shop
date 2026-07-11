// Service Worker servido por route handler para inyectar la versión del build
// en el CACHE. Así `sw.js` cambia byte a byte en CADA deploy automáticamente →
// el navegador detecta un SW nuevo → PWARegister muestra el aviso "Nueva
// versión disponible". Antes había que bumpear `taper-vN` a mano (fácil de
// olvidar). Reemplaza al viejo public/sw.js (estático).
export const dynamic = "force-static";

// Fijado en build: en Vercel es el SHA del commit (estable en todo el deploy);
// en local, la marca de tiempo del build. NO usar valores por-request (harían
// flapping de versión entre instancias).
const VERSION = (process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())).slice(0, 12);

const SW = `// Service Worker — Taper Barbershop PWA (generado; versión por build)
// Shell offline + cache-first para estáticos. No intercepta Supabase.
// Push: muestra notificaciones del sistema aunque la app esté cerrada.
const CACHE = "taper-${VERSION}";
const SHELL = ["/offline", "/icon.svg"];

self.addEventListener("install", (e) => {
  // SIN skipWaiting automático: el SW nuevo queda en "waiting" para que la app
  // muestre el aviso "Nueva versión disponible" y el usuario decida cuándo
  // aplicarlo (postMessage SKIP_WAITING → activate → recarga). Ver PWARegister.
  e.waitUntil(
    caches
      .open(CACHE)
      // Individual: un recurso que falle no debe abortar todo el precache.
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))),
  );
});

// El botón "Actualizar" / el toast pueden pedir que un SW en espera tome control ya.
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // dejar pasar Supabase/externos

  // Navegaciones: network-first → caché → /offline. respondWith SIEMPRE debe
  // resolver a un Response; si /offline no está cacheado, Response.error() evita
  // el "Failed to convert value to 'Response'".
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() =>
        caches
          .match(request)
          .then((r) => r || caches.match("/offline"))
          .then((r) => r || Response.error()),
      ),
    );
    return;
  }

  // Estáticos: cache-first con relleno. Si no hay caché y la red falla, hay que
  // devolver un Response (nunca undefined) o respondWith rechaza.
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return resp;
        })
        .catch(() => Response.error());
    }),
  );
});

// ── Push: notificación del sistema (app abierta o cerrada) ──────
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { body: e.data ? e.data.text() : "" };
  }

  const title = data.title || "Taper Barbershop";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon.svg",
    badge: "/icon.svg",
    tag: data.tag,
    data: { url: data.url || "/" },
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Click: enfoca una pestaña existente o abre la URL destino ───
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "/";

  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(target).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
`;

export function GET() {
  return new Response(SW, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate",
      "service-worker-allowed": "/",
    },
  });
}
