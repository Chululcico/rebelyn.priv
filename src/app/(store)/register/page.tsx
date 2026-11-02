import type { Metadata } from "next";
import { RegisterForm } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return <RegisterForm />;
}
