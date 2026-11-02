import type { Metadata } from "next";
import { CustomersTable } from "@/components/admin/managers";

export const metadata: Metadata = { title: "Clientes" };

export default function AdminCustomersPage() {
  return <CustomersTable />;
}
