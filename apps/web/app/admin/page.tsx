import { redirect } from "next/navigation";
import { getPlatformOverview } from "@wayline/db";
import { auth } from "@/auth";
import { isPlatformAdmin } from "@/lib/authz";
import { AdminView } from "@/components/admin/admin-view";

// Sempre dinâmico (lê o banco a cada request).
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isPlatformAdmin())) redirect("/app");

  const overview = await getPlatformOverview();
  return <AdminView overview={overview} adminEmail={session.user.email ?? ""} />;
}
