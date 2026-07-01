"use client";

import { useState, useTransition } from "react";
import { enviarDifusion } from "@/app/admin/actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Audiencia = "clientes" | "staff";

export function DifusionForm() {
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [url, setUrl] = useState("");
  const [audiencia, setAudiencia] = useState<Audiencia>("clientes");
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; texto: string } | null>(null);

  const enviar = () => {
    setFeedback(null);
    start(async () => {
      const r = await enviarDifusion({ titulo, mensaje, url, audiencia });
      if (r.ok) {
        setFeedback({ ok: true, texto: `Enviada a ${r.enviadas} dispositivo(s).` });
        setTitulo("");
        setMensaje("");
        setUrl("");
      } else {
        setFeedback({ ok: false, texto: r.error });
      }
    });
  };

  return (
    <div className="mx-auto max-w-[520px]">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.01em] text-ink">Notificaciones</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Envía un mensaje push a tus clientes o a tu equipo.</p>

      <div className="mb-4">
        <span className="mb-2 block text-xs font-medium uppercase tracking-[0.04em] text-subtle">Audiencia</span>
        <div className="grid grid-cols-2 gap-2">
          {(["clientes", "staff"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAudiencia(a)}
              className={
                "min-h-[46px] rounded-lg border text-sm font-semibold transition-colors " +
                (audiencia === a
                  ? "border-accent bg-accent/10 text-ink"
                  : "border-line bg-elevated text-muted hover:border-line-strong")
              }
            >
              {a === "clientes" ? "Clientes" : "Equipo (staff)"}
            </button>
          ))}
        </div>
      </div>

      <Input label="Título" name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="¡Promo del día! 💈" maxLength={60} />

      <div className="mb-4">
        <label htmlFor="mensaje" className="mb-2 block text-xs font-medium uppercase tracking-[0.04em] text-subtle">Mensaje</label>
        <textarea
          id="mensaje"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Hoy 2x1 en corte + barba. Te esperamos."
          maxLength={160}
          rows={3}
          className="w-full resize-none rounded-lg border border-line bg-elevated px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
        <p className="mt-1 text-right text-[11px] text-subtle">{mensaje.length}/160</p>
      </div>

      <Input label="Enlace al tocar" name="url" hint="(opcional)" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/tarjeta" prefix="ruta" />

      {feedback && (
        <p role="alert" className={"mb-4 text-sm " + (feedback.ok ? "text-accent" : "text-danger")}>
          {feedback.texto}
        </p>
      )}

      <Button onClick={enviar} loading={pending} disabled={!titulo.trim() || !mensaje.trim()}>
        Enviar notificación
      </Button>
    </div>
  );
}
