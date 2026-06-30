"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import jsQR from "jsqr";
import { createClient } from "@/lib/supabase/client";

// BarcodeDetector no está en los tipos de TS por defecto.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats: string[] }) => BarcodeDetectorLike;
  }
}

type Estado = "iniciando" | "escaneando" | "buscando" | "sin-soporte" | "error";

export function QrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const sb = useRef(createClient());
  const [estado, setEstado] = useState<Estado>("iniciando");
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelado = false;

    async function resolverToken(token: string) {
      setEstado("buscando");
      const { data } = await sb.current.rpc("get_cliente_by_qr", { p_qr_token: token });
      if (cancelado) return;
      const cliente = (data as { cliente?: { id: string } } | null)?.cliente;
      if (cliente?.id) {
        router.push(`/admin/venta/${cliente.id}`);
      } else {
        setMensaje("QR no reconocido. Intenta de nuevo o busca al cliente.");
        setEstado("escaneando");
      }
    }

    async function start() {
      // La cámara exige contexto seguro (HTTPS o localhost).
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado("sin-soporte");
        setMensaje("Tu navegador no permite usar la cámara aquí.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelado) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        // Decodificador: BarcodeDetector nativo (rápido) cuando existe;
        // si no (iOS Safari, Firefox…), fallback a jsQR sobre canvas.
        const nativo = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null;
        let canvas: HTMLCanvasElement | null = null;
        let ctx: CanvasRenderingContext2D | null = null;
        if (!nativo) {
          canvas = document.createElement("canvas");
          ctx = canvas.getContext("2d", { willReadFrequently: true });
        }

        const detectar = async (): Promise<string | null> => {
          if (nativo) {
            const codes = await nativo.detect(video);
            return codes.length > 0 ? codes[0].rawValue || null : null;
          }
          if (!ctx || !canvas || !video.videoWidth) return null;
          // Escalar a máx. 640px de ancho para que jsQR sea fluido en el teléfono.
          const escala = Math.min(1, 640 / video.videoWidth);
          const w = Math.round(video.videoWidth * escala);
          const h = Math.round(video.videoHeight * escala);
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          const res = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
          return res?.data || null;
        };

        setEstado("escaneando");

        // ~10fps: detectar es costoso; 60fps gasta CPU/batería sin ganar nada.
        const INTERVALO = 100;
        let ultimo = 0;
        const tick = async (t: number) => {
          if (cancelado) return;
          if (t - ultimo >= INTERVALO) {
            ultimo = t;
            try {
              const token = await detectar();
              if (token) {
                cancelAnimationFrame(raf);
                await resolverToken(token);
                return;
              }
            } catch {
              /* frame sin lectura */
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setEstado("error");
        setMensaje("No pudimos acceder a la cámara. Revisa los permisos.");
      }
    }

    start();
    return () => {
      cancelado = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [router]);

  if (estado === "sin-soporte" || estado === "error") {
    return (
      <div className="rounded-2xl border border-line bg-elevated p-6 text-center">
        <p className="font-display text-lg font-bold text-ink">
          {estado === "sin-soporte" ? "Escaneo no disponible" : "Cámara no disponible"}
        </p>
        <p className="mt-2 text-sm text-muted">
          {mensaje ?? "Este dispositivo no soporta el escáner."} Usa la búsqueda por nombre o teléfono.
        </p>
        <Link href="/admin" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-accent px-6 font-semibold text-accent-ink">
          Buscar cliente
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-line bg-black">
        <video ref={videoRef} playsInline muted className="size-full object-cover" />
        {/* Marco guía */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="size-3/5 rounded-2xl border-2 border-accent/80 shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]" />
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-muted">
        {estado === "buscando" ? "Identificando cliente…" : "Apunta al QR del cliente"}
      </p>
      {mensaje && <p role="alert" className="mt-2 text-center text-sm text-warning">{mensaje}</p>}
      <Link href="/admin" className="mt-4 flex min-h-11 items-center justify-center text-sm text-muted hover:text-ink">
        Buscar por nombre o teléfono
      </Link>
    </div>
  );
}
