import { getPlatformOverview } from "@wayline/db";
import { isPlatformAdmin } from "@/lib/authz";
import { OverviewPanel } from "@/components/admin/overview-panel";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  if (!(await isPlatformAdmin())) return null; // layout já mostra "sem acesso"
  const overview = await getPlatformOverview();
  return <OverviewPanel overview={overview} />;
}
