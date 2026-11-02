import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
