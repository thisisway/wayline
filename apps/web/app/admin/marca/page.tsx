import { getPlatformSettings } from "@wayline/db";
import { isPlatformAdmin } from "@/lib/authz";
import { BrandingPanel } from "@/components/admin/branding-panel";

export const dynamic = "force-dynamic";

export default async function AdminBrandingPage() {
  if (!(await isPlatformAdmin())) return null;
  const initial = await getPlatformSettings();
  return <BrandingPanel initial={initial} />;
}
