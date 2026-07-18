import { redirect } from "next/navigation";
import { getPlatformSettings, getUserProfile } from "@wayline/db";
import { auth } from "@/auth";
import { isPlatformAdmin } from "@/lib/authz";
import { AdminShell } from "@/components/admin/admin-shell";
import { NoAccess } from "@/components/admin/no-access";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!(await isPlatformAdmin())) {
    const email = session.user.email ?? (await getUserProfile(session.user.id))?.email ?? "—";
    return <NoAccess email={email} />;
  }

  const platform = await getPlatformSettings();
  return (
    <AdminShell adminEmail={session.user.email ?? ""} logoUrl={platform.logoUrl}>
      {children}
    </AdminShell>
  );
}
