"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { IconBell } from "@/components/icons";
import { useModalA11y } from "@/components/admin/useModalA11y";
import { cargarBandeja, marcarNotiLeida } from "@/app/notificaciones/actions";
import type { Noti } from "@/lib/queries/notificaciones";

/** Tiempo relativo corto en español (hace 5 min, hace 2 h, hace 3 d). */
function haceCuanto(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "ahora";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

/**
 * Campana del header cliente = bandeja de notificaciones (recordatorios,
 * citas, promos…). Abre una hoja inferior con el historial; tocar una la
 * marca leída y navega a su destino. El activar/desactivar push vive en
 * Perfil ([[push-notificaciones]]), no aquí.
 */
export function NotifyBell({
  notisInicial,
  noLeidasInicial,
}: {
  notisInicial: Noti[];
  noLeidasInicial: number;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [notis, setNotis] = useState<Noti[]>(notisInicial);

  // Badge: hay no leídas entre las cargadas, o el server contó más de las traídas.
  const extraNoLeidas = noLeidasInicial - notisInicial.filter((x) => !x.leida).length;
  const hayNoLeidas = notis.some((n) => !n.leida) || extraNoLeidas > 0;

  const abrir = async () => {
    setAbierto(true);
    const { notis: frescas } = await cargarBandeja();
    setNotis(frescas);
  };

  const cerrar = useCallback(() => setAbierto(false), []);

  const tocar = async (n: Noti) => {
    if (!n.leida) {
      setNotis((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      void marcarNotiLeida(n.id);
    }
    if (n.url) {
      setAbierto(false);
      router.push(n.url);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label="Notificaciones"
        className="relative flex size-11 items-center justify-center rounded-full border border-line bg-elevated text-muted transition-transform active:scale-95"
      >
        <IconBell />
        {hayNoLeidas && (
          <span className="absolute right-2.5 top-2 size-[7px] rounded-full bg-accent ring-2 ring-bg" />
        )}
      </button>

      {abierto && (
        <NotifSheet notis={notis} onClose={cerrar} onTocar={tocar} />
      )}
    </>
  );
}

/** Hoja inferior de notificaciones. Se monta solo cuando está abierta, así el
 *  focus-trap/Escape/scroll-lock ([[feedback_modal_portal]]) vive con el sheet. */
function NotifSheet({
  notis,
  onClose,
  onTocar,
}: {
  notis: Noti[];
  onClose: () => void;
  onTocar: (n: Noti) => void;
}) {
  const ref = useModalA11y(onClose);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      className="fixed inset-0 z-[var(--z-modal)] flex items-end"
      role="dialog"
      aria-modal="true"
      aria-label="Notificaciones"
    >
      <div aria-hidden className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="animate-fade-up relative flex max-h-[80dvh] w-full flex-col rounded-t-2xl border border-line bg-bg pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <header className="flex items-center justify-between px-5 pb-3 pt-4">
          <h2 className="font-display text-lg font-bold text-ink">Notificaciones</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-sm font-medium text-muted"
          >
            Cerrar
          </button>
        </header>

        {notis.length === 0 ? (
          <div className="px-6 pb-10 pt-8 text-center">
            <div className="mx-auto mb-3.5 flex size-14 items-center justify-center rounded-full bg-accent-dim text-accent">
              <IconBell size={24} />
            </div>
            <p className="font-display text-base font-bold text-ink">Todo tranquilo por aquí</p>
            <p className="mt-1.5 text-[13px] text-muted">
              Te avisamos cuando tu corte gratis esté listo, cuando subas de nivel y de promos solo para miembros.
            </p>
          </div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto overscroll-contain">
            {notis.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => onTocar(n)}
                  className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors active:bg-elevated"
                >
                  <span
                    aria-hidden
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${n.leida ? "bg-transparent" : "bg-accent"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm ${n.leida ? "font-medium text-ink" : "font-semibold text-ink"}`}>
                        {n.titulo}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-subtle">
                        {haceCuanto(n.created_at)}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">{n.cuerpo}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
