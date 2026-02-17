import type { Metadata } from "next";
import WhatsAppChatClient from "./WhatsAppChatClient";

export const metadata: Metadata = {
  title: "WhatsApp Messages - Admin",
  robots: { index: false, follow: false },
};

export default function WhatsAppPage() {
  return <WhatsAppChatClient />;
}
