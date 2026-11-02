import type { Metadata } from "next";
import { MessagesManager } from "@/components/admin/managers";

export const metadata: Metadata = { title: "Mensajes" };

export default function AdminMessagesPage() {
  return <MessagesManager />;
}
