import { redirect } from "next/navigation";
import { getClienteFicha } from "@/lib/queries/clientes";
import { ClienteFicha } from "@/components/admin/ClienteFicha";

export default async function ClienteFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ficha = await getClienteFicha(id);
  if (!ficha) redirect("/admin/clientes");

  return <ClienteFicha ficha={ficha} />;
}
