// Service Worker — Taper Barbershop PWA
// Shell offline + cache-first para estáticos. No intercepta Supabase.
// Push: muestra notificaciones del sistema aunque la app esté cerrada.
const CACHE = "taper-v6";
const SHELL = ["/offline", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      // Individual: un recurso que falle no debe abortar todo el precache.
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

// El botón "Actualizar" puede pedir que un SW en espera tome control ya.
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
