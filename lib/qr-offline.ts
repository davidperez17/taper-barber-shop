// Datos del cliente para /offline (mala señal en el mostrador). Desde 0040 el
// QR cambia cada 30 s y no se puede mostrar sin red: /offline enseña el número
// de cliente para que el cajero lo busque. Lo escribe la tarjeta, lo lee el
// script inline de /offline y se borra al cerrar sesión.
export const QR_OFFLINE_KEY = "taper_qr_offline";

export interface QrOffline {
  nombre: string;
  memberId: string;
}
