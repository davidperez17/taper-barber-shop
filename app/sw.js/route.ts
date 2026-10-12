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

// Llave pública VAPID (se fija en build) para re-suscribir desde el SW en
// `pushsubscriptionchange`. Misma limpieza de comillas que lib/push/cliente.ts.
const VAPID = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").replace(/^["']|["']$/g, "").trim();

const SW = `// Service Worker — Taper Barbershop PWA (generado; versión por build)
// Shell offline + cache-first para estáticos. No intercepta Supabase.
// Push: muestra notificaciones del sistema aunque la app esté cerrada.
const CACHE = "taper-${VERSION}";
const SHELL = ["/offline"];
// Registro aparte del staff (ver lib/push/cliente.ts): no controla páginas,
// solo recibe push. No precachea ni borra cachés: eso es del registro raíz.
const SOLO_PUSH = self.registration.scope.endsWith("/push/staff/");

self.addEventListener("install", (e) => {
  // SIN skipWaiting automático: el SW nuevo queda en "waiting" para que la app
  // muestre el aviso "Nueva versión disponible" y el usuario decida cuándo
  // aplicarlo (postMessage SKIP_WAITING → activate → recarga). Ver PWARegister.
  if (SOLO_PUSH) return;
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
  if (SOLO_PUSH) return;
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
    // PNG: Android/Chrome no pintan SVG en notificaciones (salía genérico).
    icon: data.icon || "/icon-192.png",
    tag: data.tag,
    data: { url: data.url || "/" },
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Suscripción rotada/expirada por el navegador ───────────────
// Sin esto la fila vieja da 404/410, se poda, y el usuario deja de recibir
// hasta volver a abrir la app (PushSync/NotifyOptIn re-sincronizan). Aquí se
// re-suscribe y se avisa al server, que cambia endpoint/llaves conservando el
// dueño. Si el navegador no da la suscripción vieja (algunos no), no hay cómo
// ubicar la fila: queda para la re-sincronización al abrir la app.
const VAPID = ${JSON.stringify(VAPID)};

function llaveVapid() {
  const b64 = (VAPID + "=".repeat((4 - (VAPID.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

self.addEventListener("pushsubscriptionchange", (e) => {
  const vieja = e.oldSubscription ? e.oldSubscription.toJSON() : null;
  e.waitUntil(
    Promise.resolve(
      e.newSubscription ||
        self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llaveVapid() }),
    )
      .then((nueva) => {
        if (!vieja || !vieja.keys) return;
        return fetch("/api/push/rotar", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            vieja: { endpoint: vieja.endpoint, auth: vieja.keys.auth },
            nueva: nueva.toJSON(),
          }),
        });
      })
      .catch(() => {}),
  );
});

// ── Click: enfoca una pestaña existente o abre la URL destino ───
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "/";

  // Preferir una ventana de la misma app (admin vs cliente): en Android/escritorio
  // ambas PWAs son del mismo origen. Enfocar primero y luego navegar. El SW de
  // push del staff no controla ventanas (navigate falla): se le pide a la
  // página que navegue ella (PWARegister escucha NAVIGATE).
  const esAdmin = target.startsWith("/admin");
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const c = list.find(
        (w) => "focus" in w && new URL(w.url).pathname.startsWith("/admin") === esAdmin,
      );
      if (!c) return self.clients.openWindow(target);
      return c
        .focus()
        .then((w) => w.navigate(target).catch(() => w.postMessage({ type: "NAVIGATE", url: target })))
        .catch(() => self.clients.openWindow(target));
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
