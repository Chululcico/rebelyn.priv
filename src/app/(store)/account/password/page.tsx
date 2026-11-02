import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PasswordForm } from "@/components/store/account-settings";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default async function PasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/password");
  return <PasswordForm />;
}
