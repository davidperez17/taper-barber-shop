"use client";

import { useEffect, useState } from "react";
import { borrarSuscripcion } from "@/app/push/actions";
import { activarPush, pushDisponible, sincronizarPush } from "@/lib/push/cliente";

// on = suscrito; off = puede activar; guardando = en curso;
// bloqueado = permiso denegado; no-disp = sin soporte / iOS sin instalar / sin clave.
type Estado = "on" | "off" | "guardando" | "bloqueado" | "no-disp";

/** Fila de ajuste en Perfil para activar/desactivar las notificaciones push. */
export function PushToggle() {
  const [estado, setEstado] = useState<Estado>("no-disp");

  useEffect(() => {
    if (!pushDisponible()) return;
    // Depende de APIs del navegador: solo se puede decidir tras montar.
    if (Notification.permission === "denied") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEstado("bloqueado");
      return;
    }
    if (Notification.permission !== "granted") {
      setEstado("off");
      return;
    }
    // Permiso concedido: re-sincroniza la suscripción con el servidor en cada
    // visita (cura filas podadas y llaves VAPID desfasadas).
    let vivo = true;
    sincronizarPush()
      .then((on) => vivo && setEstado(on ? "on" : "off"))
      .catch(() => vivo && setEstado("off"));
    return () => {
      vivo = false;
    };
  }, []);

  const activar = async () => {
    try {
      setEstado("guardando");
      const r = await activarPush();
      setEstado(r === "granted" ? "on" : r === "denied" ? "bloqueado" : "off");
    } catch (e) {
      console.error("[push] fallo al activar:", e);
      setEstado("off");
    }
  };

  const desactivar = async () => {
    try {
      setEstado("guardando");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await borrarSuscripcion(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("off");
    } catch (e) {
      console.error("[push] fallo al desactivar:", e);
      setEstado("on");
    }
  };

  if (estado === "no-disp") return null;

  const activo = estado === "on";
  const ocupado = estado === "guardando";

  return (
    <div className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-elevated p-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Notificaciones</p>
        <p className="mt-0.5 text-xs leading-snug text-muted">
          {estado === "bloqueado"
            ? "Bloqueadas. Actívalas en los ajustes del navegador."
            : "Recompensas, citas y promos al instante."}
        </p>
      </div>

      {estado === "bloqueado" ? null : (
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          aria-label={activo ? "Desactivar notificaciones" : "Activar notificaciones"}
          disabled={ocupado}
          onClick={activo ? desactivar : activar}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${activo ? "bg-accent" : "bg-line-strong"}`}
        >
          <span
            className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform ${activo ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      )}
    </div>
  );
}
