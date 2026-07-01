import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getPersonal } from "@/lib/queries/personal";
import { PersonalManager } from "@/components/admin/PersonalManager";

export default async function PersonalPage() {
  const staff = await getStaff();
  if (staff?.rol !== "dueno") redirect("/admin");

  const personal = await getPersonal();
  return <PersonalManager personal={personal} yoId={staff.id} />;
}
