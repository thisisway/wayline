import type { AdminUserRow } from "@wayline/db";
import { Avatar } from "@wayline/ui";

export function UsersPanel({ users }: { users: AdminUserRow[] }) {
  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-2">
        <h2 className="font-display text-h2 font-bold">Usuários</h2>
        <span className="text-dense text-subtle">{users.length} no total</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[560px] text-left text-dense">
          <thead className="border-b border-border text-label uppercase text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-elevated/50">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5">
                    <Avatar name={u.name} src={u.avatarUrl ?? undefined} size="sm" />
                    <span className="font-medium text-foreground">{u.name}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="px-4 py-3 text-muted">{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
