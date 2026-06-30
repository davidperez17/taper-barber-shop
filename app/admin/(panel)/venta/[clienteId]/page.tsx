import { redirect } from "next/navigation";
import { getClienteParaVenta, getCatalogo } from "@/lib/queries/admin";
import { VentaPOS } from "@/components/admin/VentaPOS";

export default async function VentaPage({
  params,
}: {
  params: Promise<{ clienteId: string }>;
}) {
  const { clienteId } = await params;
  const [dash, catalogo] = await Promise.all([getClienteParaVenta(clienteId), getCatalogo()]);
  if (!dash) redirect("/admin");

  return (
    <VentaPOS
      cliente={{ id: dash.cliente.id, nombre: dash.cliente.nombre, numero: dash.cliente.numero }}
      loyaltyRaw={dash.loyalty}
      servicios={catalogo.servicios}
      productos={catalogo.productos}
      barberos={catalogo.barberos}
    />
  );
}
