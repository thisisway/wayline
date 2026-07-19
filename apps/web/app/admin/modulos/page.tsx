import { getPlatformModules } from "@wayline/db";
import { isPlatformAdmin } from "@/lib/authz";
import { ModulesPanel } from "@/components/admin/modules-panel";

export const dynamic = "force-dynamic";

export default async function AdminModulesPage() {
  if (!(await isPlatformAdmin())) return null;
  const enabled = await getPlatformModules();
  return <ModulesPanel enabled={enabled} />;
}
