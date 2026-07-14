import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlatformOverview, getUserProfile } from "@wayline/db";
import { auth } from "@/auth";
import { isPlatformAdmin } from "@/lib/authz";
import { AdminView } from "@/components/admin/admin-view";

// Sempre dinâmico (lê o banco a cada request).
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!(await isPlatformAdmin())) {
    // Mostra o email logado para facilitar configurar PLATFORM_ADMIN_EMAILS.
    const email = session.user.email ?? (await getUserProfile(session.user.id))?.email ?? "—";
    return <NoAccess email={email} />;
  }

  const overview = await getPlatformOverview();
  return <AdminView overview={overview} adminEmail={session.user.email ?? ""} />;
}

function NoAccess({ email }: { email: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-6 text-center text-foreground">
      <span className="flex size-12 items-center justify-center rounded-xl bg-elevated text-muted">
        🔒
      </span>
      <div>
        <h1 className="font-display text-h2 font-bold">Acesso restrito</h1>
        <p className="mt-2 max-w-md text-ui text-muted">
          Esta área é só para superadmins da plataforma. Você está logado como{" "}
          <strong className="text-foreground">{email}</strong>.
        </p>
        <p className="mt-2 max-w-md text-dense text-subtle">
          Para liberar, inclua esse email na variável de ambiente{" "}
          <code>PLATFORM_ADMIN_EMAILS</code> (no serviço do app) e reimplante.
        </p>
      </div>
      <Link
        href="/app"
        className="rounded-md bg-brand px-4 h-9 flex items-center text-ui font-medium text-white hover:bg-brand-80"
      >
        Voltar ao app
      </Link>
    </div>
  );
}
