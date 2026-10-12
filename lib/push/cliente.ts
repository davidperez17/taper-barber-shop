"use client";

import {
  guardarSuscripcion,
  soltarSuscripcionStaff,
  type AppPush,
  type SubJSON,
} from "@/app/push/actions";

// Utilidades de push del lado del navegador, compartidas por PushToggle
// (cliente) y NotifyOptIn (staff).

// Defensivo: si en Vercel se pegó la clave con comillas, quítalas.
const VAPID = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").replace(/^["']|["']$/g, "").trim();

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
  !/crios|fxios/i.test(window.navigator.userAgent);

/** ¿Este navegador puede recibir push? (iOS solo con la PWA instalada). */
export const pushDisponible = () =>
  !!VAPID &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window &&
  !(isIOS() && !isStandalone());

/** VAPID public key (base64url) → Uint8Array para applicationServerKey. */
function urlB64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** ¿La suscripción se creó con la llave VAPID actual? */
function mismaLlave(sub: PushSubscription, llave: Uint8Array): boolean {
  const k = sub.options?.applicationServerKey;
  if (!k) return true; // el navegador no lo expone: no se puede comparar
  const a = new Uint8Array(k);
  return a.length === llave.length && a.every((b, i) => b === llave[i]);
}

/**
 * Devuelve una suscripción válida para la llave VAPID actual. Si la existente
 * se creó con otra llave (rotación, o llaves de dev vs prod), el push service
 * rechazaría cada envío con 403 en silencio → se desuscribe y se crea otra.
 */
async function suscripcionVigente(reg: ServiceWorkerRegistration): Promise<PushSubscription> {
  const llave = urlB64ToUint8Array(VAPID);
  const actual = await reg.pushManager.getSubscription();
  if (actual && mismaLlave(actual, llave)) return actual;
  if (actual) await actual.unsubscribe().catch(() => {});
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llave });
}

// El navegador da UNA suscripción por registro de SW. Si cliente y staff
// usaran el mismo (scope "/"), en Android/escritorio compartirían endpoint y
// el último en guardarse se quedaba la fila: uno de los dos dejaba de recibir.
// Staff usa un registro aparte del mismo sw.js con un scope sin páginas: no
// controla ninguna ventana (no toca caché ni el aviso de versión), solo
// existe para tener su propia suscripción.
const SCOPE_STAFF = "/push/staff/";

/** Espera a que el registro tenga un SW activo (requisito de subscribe). */
function activo(reg: ServiceWorkerRegistration): Promise<void> {
  const sw = reg.installing ?? reg.waiting;
  if (reg.active || !sw) return Promise.resolve();
  return new Promise((ok, falla) =>
    sw.addEventListener("statechange", () => {
      if (sw.state === "activated") ok();
      else if (sw.state === "redundant") falla(new Error("SW de push redundante"));
    }),
  );
}

async function registro(app: AppPush): Promise<ServiceWorkerRegistration> {
  if (app === "cliente") return navigator.serviceWorker.ready;
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: SCOPE_STAFF });
  await activo(reg);
  return reg;
}

async function guardar(sub: PushSubscription, app: AppPush): Promise<boolean> {
  const { ok } = await guardarSuscripcion(sub.toJSON() as SubJSON, app);
  if (ok && app === "staff") await soltarRaizStaff().catch(() => {});
  return ok;
}

/**
 * Migración: antes el staff se suscribía con el registro raíz (el del
 * cliente). Ya con su suscripción propia guardada, suelta la fila staff que
 * pudiera tener el endpoint raíz para no recibir cada aviso dos veces.
 */
async function soltarRaizStaff(): Promise<void> {
  const raiz = await navigator.serviceWorker.getRegistration("/");
  const sub = await raiz?.pushManager.getSubscription();
  if (sub) await soltarSuscripcionStaff(sub.endpoint);
}

/** Pide permiso (si falta), suscribe y guarda en el servidor. */
export async function activarPush(app: AppPush): Promise<NotificationPermission | "error"> {
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return permiso;
  const sub = await suscripcionVigente(await registro(app));
  return (await guardar(sub, app)) ? "granted" : "error";
}

/**
 * Con el permiso ya concedido: valida la suscripción del navegador contra la
 * llave actual y la vuelve a guardar en el servidor. Cura filas
 * borradas/podadas, cambios de dueño y llaves desfasadas sin que el usuario
 * tenga que reactivar. Devuelve true si quedó suscrito.
 *
 * Cliente: solo si ya hay suscripción (pudo apagarla en Perfil). Staff: no
 * tiene interruptor, así que la crea si falta (p. ej. al migrar al registro
 * propio); si el navegador exige un gesto, devuelve false y se ofrece el banner.
 */
export async function sincronizarPush(app: AppPush): Promise<boolean> {
  const reg = await registro(app);
  if (app === "cliente" && !(await reg.pushManager.getSubscription())) return false;
  const sub = await suscripcionVigente(reg).catch(() => null);
  return sub ? guardar(sub, app) : false;
}

/** Suscripción actual del navegador para esa app (o null). */
export async function suscripcionActual(app: AppPush): Promise<PushSubscription | null> {
  return (await registro(app)).pushManager.getSubscription();
}
