"use client";

import { useEffect, useState } from "react";
import { enviarPrueba } from "@/app/push/actions";
import { activarPush, pushDisponible, sincronizarPush } from "@/lib/push/cliente";

type Estado = "oculto" | "ofrecer" | "guardando" | "listo";

// El descarte vive por sesión: "Ahora no" silencia el banner hasta que se
// vuelva a abrir la app, sin quemar el permiso del navegador.
const DESCARTE_KEY = "taper_notif_luego";

/**
 * Banner discreto para activar notificaciones push. Se auto-oculta si ya
 * están concedidas, denegadas, descartadas en esta sesión, o si el
 * navegador/plataforma no las soporta (iOS solo con la PWA instalada).
 */
export function NotifyOptIn() {
  const [estado, setEstado] = useState<Estado>("oculto");
  const [prueba, setPrueba] = useState<string | null>(null);

  useEffect(() => {
    if (!pushDisponible()) return;
    if (Notification.permission === "denied") return;
    if (sessionStorage.getItem(DESCARTE_KEY)) return;
    // Depende de APIs del navegador: solo se puede decidir tras montar.
    if (Notification.permission !== "granted") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEstado("ofrecer");
      return;
    }
    // Permiso concedido: re-sincroniza la suscripción con el servidor (cura
    // filas podadas, llaves VAPID desfasadas y cambios de dueño). Si no hay
    // suscripción (se perdió o nunca se creó), volver a ofrecer o el banner
    // desaparecería para siempre sin forma de reactivar.
    let vivo = true;
    sincronizarPush()
      .then((on) => {
        if (vivo && !on) setEstado("ofrecer");
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // Tras activar mostramos "Notificaciones activas" un momento y luego el
  // banner se retira solo para no ocupar espacio de forma permanente.
  useEffect(() => {
    if (estado !== "listo") return;
    const t = setTimeout(() => setEstado("oculto"), 3000);
    return () => clearTimeout(t);
  }, [estado]);

  const descartar = () => {
    sessionStorage.setItem(DESCARTE_KEY, "1");
    setEstado("oculto");
  };

  const activar = async () => {
    try {
      setEstado("guardando");
      const r = await activarPush();
      if (r === "granted") setEstado("listo");
      else setEstado(r === "error" ? "ofrecer" : "oculto");
    } catch (e) {
      console.error("[push] fallo al activar:", e);
      setEstado("ofrecer");
    }
  };

  const probar = async () => {
    const { enviadas } = await enviarPrueba();
    setPrueba(enviadas > 0 ? "Prueba enviada" : "No se pudo enviar");
  };

  if (estado === "oculto") return null;

  return (
    <div className="my-6 flex items-center gap-3 rounded-2xl border border-line bg-elevated p-3.5 text-left">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
        <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        {estado === "listo" ? (
          <>
            <p className="text-sm font-semibold text-ink">Notificaciones activas</p>
            {prueba ? (
              <p className="mt-0.5 text-xs text-muted">{prueba}</p>
            ) : (
              <button onClick={probar} className="mt-0.5 text-xs font-medium text-accent">
                Enviar prueba
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink">Activa las notificaciones</p>
            <p className="mt-0.5 text-xs leading-snug text-muted">Recompensas, citas y novedades al instante.</p>
          </>
        )}
      </div>

      {estado !== "listo" && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={activar}
            disabled={estado === "guardando"}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-transform active:scale-95 disabled:opacity-60"
          >
            {estado === "guardando" ? "…" : "Activar"}
          </button>
          <button
            onClick={descartar}
            aria-label="Ahora no"
            className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
