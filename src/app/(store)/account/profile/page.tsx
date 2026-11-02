import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/store/account-settings";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/profile");
  return <ProfileForm initial={{ name: user.name ?? "", phone: user.phone ?? "" }} />;
}
