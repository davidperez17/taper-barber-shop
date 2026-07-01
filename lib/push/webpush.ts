import webpush from "web-push";

// Configura VAPID una sola vez por proceso. SOLO servidor (runtime Node).
let listo = false;

export function getWebPush() {
  if (!listo) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? "mailto:soporte@taper.com";
    if (!publicKey || !privateKey) {
      throw new Error("Faltan las llaves VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).");
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    listo = true;
  }
  return webpush;
}
