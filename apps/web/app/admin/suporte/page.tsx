import { getSupportAlertWhatsapp, getSupportWhatsappUrl, listSupportTickets } from "@wayline/db";
import { isPlatformAdmin } from "@/lib/authz";
import { SupportPanel } from "@/components/admin/support-panel";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  if (!(await isPlatformAdmin())) return null;
  const [tickets, whatsappUrl, alertWhatsapp] = await Promise.all([
    listSupportTickets(),
    getSupportWhatsappUrl(),
    getSupportAlertWhatsapp(),
  ]);
  return <SupportPanel tickets={tickets} whatsappUrl={whatsappUrl} alertWhatsapp={alertWhatsapp} />;
}
