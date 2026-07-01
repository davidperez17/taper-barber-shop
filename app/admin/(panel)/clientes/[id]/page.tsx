import { redirect } from "next/navigation";
import { getClienteFicha } from "@/lib/queries/clientes";
import { getStaff } from "@/lib/queries/staff";
import { ClienteFicha } from "@/components/admin/ClienteFicha";

export default async function ClienteFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ficha, staff] = await Promise.all([getClienteFicha(id), getStaff()]);
  if (!ficha) redirect("/admin/clientes");

  const puedeResetPin = staff?.rol === "dueno" || staff?.rol === "admin";
  return <ClienteFicha ficha={ficha} puedeResetPin={puedeResetPin} />;
}
