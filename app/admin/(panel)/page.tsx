import Link from "next/link";
import { getStaff } from "@/lib/queries/staff";
import { ClienteSearch } from "@/components/admin/ClienteSearch";
import { IconScan } from "@/components/icons";

export default async function AdminHomePage() {
  const staff = await getStaff();
  const esDueno = staff?.rol === "dueno" || staff?.rol === "admin";

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Registrar venta</h1>
      <p className="mt-1 text-sm text-muted">Escanea el QR del cliente o búscalo por nombre/teléfono.</p>

      {/* Escanear QR — acción primaria */}
      <Link
        href="/admin/escanear"
        className="mt-5 flex items-center gap-4 rounded-2xl bg-accent px-5 py-4 text-accent-ink shadow-[0_0_28px_var(--accent-glow)] transition-transform active:scale-[0.99]"
      >
        <IconScan size={26} />
        <span>
          <span className="block font-display text-lg font-bold leading-tight">Escanear QR</span>
          <span className="block text-[13px] opacity-80">Cámara · identifica al cliente al instante</span>
        </span>
      </Link>

      {/* Separador */}
      <div className="my-5 flex items-center gap-3 text-subtle">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs uppercase tracking-wider">o busca al cliente</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <ClienteSearch />

      {/* Accesos */}
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/admin/registrar" className="rounded-xl border border-line bg-elevated px-4 py-3 text-sm font-medium text-ink hover:border-line-strong">
          + Cliente nuevo
        </Link>
        {esDueno && (
          <Link href="/admin/dashboard" className="rounded-xl border border-line bg-elevated px-4 py-3 text-sm font-medium text-ink hover:border-line-strong">
            Dashboard del negocio
          </Link>
        )}
      </div>
    </div>
  );
}
