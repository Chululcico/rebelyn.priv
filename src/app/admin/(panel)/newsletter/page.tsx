import type { Metadata } from "next";
import { NewsletterManager } from "@/components/admin/newsletter-manager";

export const metadata: Metadata = { title: "Newsletter" };

export default function AdminNewsletterPage() {
  return <NewsletterManager />;
}
