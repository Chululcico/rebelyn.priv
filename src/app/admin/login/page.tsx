import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const metadata: Metadata = { title: "Admin login" };
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}

