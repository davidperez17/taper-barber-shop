"use client";

import { guardarSuscripcion, type SubJSON } from "@/app/push/actions";

// Utilidades de push del lado del navegador, compartidas por PushToggle
// (cliente) y NotifyOptIn (staff).

// Defensivo: si en Vercel se pegó la clave con comillas, quítalas.
export const VAPID = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").replace(/^["']|["']$/g, "").trim();

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

export const isIOS = () =>
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

/** Pide permiso (si falta), suscribe y guarda en el servidor. */
export async function activarPush(): Promise<NotificationPermission | "error"> {
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return permiso;
  const reg = await navigator.serviceWorker.ready;
  const sub = await suscripcionVigente(reg);
  const { ok } = await guardarSuscripcion(sub.toJSON() as SubJSON);
  return ok ? "granted" : "error";
}

/**
 * Con el permiso ya concedido: si hay suscripción en el navegador, la valida
 * contra la llave actual y la vuelve a guardar en el servidor. Cura filas
 * borradas/podadas, cambios de dueño y llaves desfasadas sin que el usuario
 * tenga que reactivar. Devuelve true si quedó suscrito.
 */
export async function sincronizarPush(): Promise<boolean> {
  const reg = await navigator.serviceWorker.ready;
  if (!(await reg.pushManager.getSubscription())) return false;
  const sub = await suscripcionVigente(reg);
  const { ok } = await guardarSuscripcion(sub.toJSON() as SubJSON);
  return ok;
}
