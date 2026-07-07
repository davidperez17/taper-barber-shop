"use client";

import type { ReporteData } from "@/lib/queries/reportes";

export function ExportCSV({ reporte, rangoLabel }: { reporte: ReporteData; rangoLabel: string }) {
  function descargar() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const L: string[] = [];
    L.push(`Reporte Taper Barber,${esc(rangoLabel)}`);
    L.push("");
    L.push("Resumen");
    L.push(`Ventas totales,${reporte.total}`);
    L.push(`Número de ventas,${reporte.num}`);
    L.push(`Ticket promedio,${reporte.ticket}`);
    L.push("");
    L.push("Ventas por día");
    L.push("Fecha,Total,Ventas");
    reporte.por_dia.forEach((d) => L.push(`${d.dia},${d.total},${d.num}`));
    const bloque = (titulo: string, rows: ReporteData["top_servicios"]) => {
      L.push("");
      L.push(titulo);
      L.push("Nombre,Cantidad,Monto");
      rows.forEach((r) => L.push(`${esc(r.nombre)},${r.n},${r.monto}`));
    };
    bloque("Top servicios", reporte.top_servicios);
    bloque("Top productos", reporte.top_productos);
    bloque("Top barberos", reporte.top_barberos);

    const blob = new Blob(["﻿" + L.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-taper-${rangoLabel.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={descargar}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-elevated px-4 text-sm font-medium text-ink hover:border-line-strong"
    >
      Exportar CSV
    </button>
  );
}
