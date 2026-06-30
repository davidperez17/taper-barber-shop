"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { uploadCatalogoImage } from "@/lib/upload";
import { IconCamera } from "@/components/icons";

export function ImagePicker({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadCatalogoImage(file);
      onChange(url);
    } catch {
      setError("No se pudo subir la imagen. Verifica permisos/conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />

      {value ? (
        <Image src={value} alt="" width={56} height={56} unoptimized className="size-14 rounded-lg object-cover" />
      ) : (
        <div className="flex size-14 items-center justify-center rounded-lg border border-dashed border-line bg-elevated text-subtle" aria-hidden>
          {busy ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <IconCamera size={22} />}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="min-h-9 rounded-lg border border-line bg-elevated px-3 text-[13px] font-medium text-ink hover:border-line-strong disabled:opacity-50"
        >
          {busy ? "Subiendo…" : value ? "Cambiar foto" : "Subir foto"}
        </button>
        {value && !busy && (
          <button type="button" onClick={() => onChange(null)} className="text-left text-[12px] text-muted hover:text-danger">
            Quitar
          </button>
        )}
        {error && <p role="alert" className="max-w-[180px] text-[12px] text-danger">{error}</p>}
      </div>
    </div>
  );
}
