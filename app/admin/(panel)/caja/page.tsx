import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getSucursalActiva } from "@/lib/sucursal";
import { getCajaResumen, hoyGT } from "@/lib/queries/caja";
import { CajaCierre } from "@/components/admin/CajaCierre";

export default async function CajaPage() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");

  const fecha = hoyGT();
  const sucursalId = await getSucursalActiva(staff);
  const resumen = await getCajaResumen(fecha, sucursalId);

  return (
    <div className="animate-fade-up mx-auto max-w-[640px]">
      <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Cierre de caja</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Arqueo del día — cuadra el efectivo antes de cerrar.</p>
      {resumen ? (
        <CajaCierre resumen={resumen} />
      ) : (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
          No se pudo cargar el resumen de caja.
        </p>
      )}
    </div>
  );
}
