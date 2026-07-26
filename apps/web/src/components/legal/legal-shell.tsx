import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Layout consistente para páginas legais (públicas). */
export function LegalShell({
  brandName,
  title,
  updatedAt,
  children,
}: {
  brandName: string;
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="font-display text-ui font-bold">{brandName}</span>
          <Link
            href="/app"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 h-9 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Voltar ao app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-h2 font-bold">{title}</h1>
        <p className="mt-1 text-dense text-subtle">Última atualização: {updatedAt}</p>
        <div className="legal mt-8 space-y-5 text-ui leading-relaxed text-muted">{children}</div>

        <div className="mt-12 border-t border-border pt-6 text-dense text-subtle">
          <Link href="/privacidade" className="text-brand hover:underline">
            Privacidade
          </Link>
          {" · "}
          <Link href="/termos" className="text-brand hover:underline">
            Termos de Uso
          </Link>
        </div>
      </main>
    </div>
  );
}

/** Título de seção com âncora. */
export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 id={id} className="font-display text-h3 font-bold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
