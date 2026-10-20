// Copia local del QR del cliente para mostrarlo en /offline (mala señal en el
// mostrador). La escribe la tarjeta, la lee el script inline de /offline y se
// borra al cerrar sesión. Clave fija: un teléfono = una sesión de cliente.
export const QR_OFFLINE_KEY = "taper_qr_offline";

export interface QrOffline {
  nombre: string;
  memberId: string;
  qrSvg: string;
}
