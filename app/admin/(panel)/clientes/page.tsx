import Link from "next/link";
import { getClientesConLealtad } from "@/lib/queries/clientes";
import { ClientesList } from "@/components/admin/ClientesList";
import { IconPlus } from "@/components/icons";

export default async function ClientesPage() {
  const clientes = await getClientesConLealtad();

  return (
    <div className="animate-fade-up">
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
