"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconSearch } from "@/components/icons";

interface Hit {
  id: string;
  numero: number;
  nombre: string;
  telefono: string;
}

export function ClienteSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const sb = useRef(createClient());

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const digits = term.replace(/\D/g, "");
      const filter = digits.length >= 3
        ? `telefono.ilike.%${digits}%,nombre.ilike.%${term}%`
        : `nombre.ilike.%${term}%`;
      const { data } = await sb.current
        .from("clientes")
        .select("id, numero, nombre, telefono")
        .or(filter)
        .limit(8);
      setHits((data as Hit[]) ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="flex items-center rounded-xl border border-line bg-elevated px-4 focus-within:border-line-strong">
        <span className="mr-3 text-subtle"><IconSearch size={20} /></span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre o teléfono…"
          aria-label="Buscar cliente"
          className="min-h-[52px] w-full bg-transparent text-base text-ink outline-none placeholder:text-muted"
        />
      </div>

      {q.trim().length >= 2 && (
        <ul className="mt-3 flex flex-col gap-2">
          {loading && <li className="skeleton h-[60px]" />}
          {!loading && hits.length === 0 && (
            <li className="rounded-xl border border-line bg-elevated p-4 text-sm text-muted">
              Sin resultados. ¿Cliente nuevo?{" "}
              <a href="/admin/registrar" className="font-semibold text-accent">Regístralo</a>
            </li>
          )}
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => router.push(`/admin/venta/${h.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-line bg-elevated p-4 text-left hover:border-line-strong"
              >
                <span>
                  <span className="block font-semibold text-ink">{h.nombre}</span>
                  <span className="block text-[13px] text-muted">
                    #{String(h.numero).padStart(5, "0")} · {h.telefono}
                  </span>
                </span>
                <span className="text-subtle">→</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
