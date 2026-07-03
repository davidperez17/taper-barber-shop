import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientesConLealtad } from "@/lib/queries/clientes";
import { getStaff } from "@/lib/queries/staff";
import { getSucursalActiva } from "@/lib/sucursal";
import { ClientesList } from "@/components/admin/ClientesList";
import { IconPlus } from "@/components/icons";

export default async function ClientesPage() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  const sucursalId = await getSucursalActiva(staff);
  const clientes = await getClientesConLealtad(sucursalId);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Clientes</h1>
        <Link
          href="/admin/registrar"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink"
        >
          <IconPlus size={18} /> Nuevo
        </Link>
      </div>

      <ClientesList clientes={clientes} />
    </div>
  );
}
