import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddressesManager } from "@/components/store/addresses-manager";

export const metadata: Metadata = { title: "Mis direcciones" };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/addresses");

  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return <AddressesManager initial={addresses.map((a) => ({ ...a, line2: a.line2 ?? null, phone: a.phone ?? null }))} />;
}
