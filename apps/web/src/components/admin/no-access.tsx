import Link from "next/link";

export function NoAccess({ email }: { email: string }) {
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
        className="flex h-9 items-center rounded-md bg-brand px-4 text-ui font-medium text-white hover:bg-brand-80"
      >
        Voltar ao app
      </Link>
    </div>
  );
}
