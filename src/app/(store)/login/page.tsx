import type { Metadata } from "next";
import { LoginFormWrapped } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return <LoginFormWrapped />;
}
