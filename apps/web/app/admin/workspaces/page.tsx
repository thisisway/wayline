import { getPlatformOverview } from "@wayline/db";
import { isPlatformAdmin } from "@/lib/authz";
import { WorkspacesPanel } from "@/components/admin/workspaces-panel";

export const dynamic = "force-dynamic";

export default async function AdminWorkspacesPage() {
  if (!(await isPlatformAdmin())) return null;
  const overview = await getPlatformOverview();
  return <WorkspacesPanel orgs={overview.orgs} />;
}
