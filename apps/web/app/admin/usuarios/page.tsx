import { getPlatformUsers } from "@wayline/db";
import { isPlatformAdmin } from "@/lib/authz";
import { UsersPanel } from "@/components/admin/users-panel";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  if (!(await isPlatformAdmin())) return null;
  const users = await getPlatformUsers();
  return <UsersPanel users={users} />;
}
