import { getPlatformOverview } from "@wayline/db";
import { isPlatformAdmin } from "@/lib/authz";
import { RevenuePanel } from "@/components/admin/revenue-panel";

export const dynamic = "force-dynamic";

export default async function AdminRevenuePage() {
  if (!(await isPlatformAdmin())) return null;
  const overview = await getPlatformOverview();
  return <RevenuePanel orgs={overview.orgs} />;
}
