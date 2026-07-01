import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getCupones } from "@/lib/queries/cupones";
import { CuponesManager } from "@/components/admin/CuponesManager";

export default async function CuponesPage() {
  const staff = await getStaff();
  if (staff?.rol !== "admin" && staff?.rol !== "dueno") redirect("/admin");

  const cupones = await getCupones();
  return <CuponesManager cupones={cupones} />;
}
