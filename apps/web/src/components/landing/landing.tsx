import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Check,
  ClipboardList,
  FileText,
  LayoutGrid,
  MessageSquare,
  Network,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/plans";

const FEATURES: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  { icon: LayoutGrid, title: "Board & visões", desc: "Kanban, Lista, Calendário e Gantt — a mesma base em cada visão." },
  { icon: FileText, title: "Docs & Wiki", desc: "Documentos colaborativos, notas e base de conhecimento do time." },
  { icon: Briefcase, title: "Comercial", desc: "Propostas com link público, catálogo, portfólio e contratos assináveis." },
  { icon: ClipboardList, title: "Formulários", desc: "Colete pedidos e feedback; cada resposta pode virar tarefa." },
  { icon: Network, title: "Mind Map", desc: "Organize ideias visualmente e converta nós em tarefas." },
  { icon: Sparkles, title: "IA integrada", desc: "O Wayline Brain resume, redige e acelera o seu trabalho." },
];

function price(id: PlanId): string {
  const p = PLANS[id];
  if (p.priceBRL === null) return "Sob consulta";
  if (p.priceBRL === 0) return "Grátis";
  return `R$ ${p.priceBRL}`;
}

export function Landing({
  brandName,
  logoLight,
  logoDark,
}: {
  brandName: string;
  logoLight?: string | null;
  logoDark?: string | null;
}) {
  const logo = logoLight || logoDark || null;

  return (
    <div className="min-h-dvh bg-canvas text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            {logo ? (
              <img src={logo} alt={brandName} className="h-7 w-auto max-w-[140px] object-contain" />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand font-display text-ui font-extrabold text-white">
                {brandName[0] ?? "W"}
              </span>
            )}
            <span className="font-display text-ui font-bold">{brandName}</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3 h-9 flex items-center text-ui font-medium text-muted transition-colors hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-ui font-medium text-white transition-colors hover:bg-brand-80"
            >
              Começar grátis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1 text-dense font-medium text-muted">
          <Sparkles className="size-3.5 text-brand" /> O work OS das agências
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Tudo o que sua agência faz, em um só lugar.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-body text-muted">
          Tarefas, documentos, propostas, formulários e clientes — com IA integrada. O {brandName}{" "}
          reúne a operação do seu time do briefing ao contrato assinado.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="flex h-11 items-center gap-2 rounded-lg bg-brand px-6 text-body font-semibold text-white transition-colors hover:bg-brand-80"
          >
            Começar grátis <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/login"
            className="flex h-11 items-center rounded-lg border border-border px-6 text-body font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
          >
            Já tenho conta
          </Link>
        </div>
        <p className="mt-3 text-dense text-subtle">14 dias de Business grátis · sem cartão</p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl border border-border bg-surface p-5">
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-3 text-ui font-semibold">{f.title}</h3>
                <p className="mt-1 text-dense text-muted">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h2 className="font-display text-h2 font-bold">Planos que crescem com você</h2>
          <p className="mt-2 text-ui text-muted">Preço por usuário/mês. Comece grátis e evolua quando precisar.</p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            return (
              <div
                key={id}
                className={
                  "flex flex-col rounded-xl border bg-surface p-5 " +
                  (p.highlight ? "border-brand ring-1 ring-brand" : "border-border")
                }
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-ui font-bold">{p.name}</h3>
                  {p.highlight && (
                    <span className="rounded-pill bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-2 font-display text-h2 font-bold">
                  {price(id)}
                  {p.priceBRL != null && p.priceBRL > 0 && (
                    <span className="text-dense font-medium text-subtle"> /usuário/mês</span>
                  )}
                </p>
                <p className="mt-1 text-dense text-muted">{p.tagline}</p>
                <ul className="mt-4 flex-1 space-y-1.5">
                  {p.features.slice(0, 5).map((feat) => (
                    <li key={feat} className="flex gap-2 text-dense text-muted">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={
                    "mt-5 flex h-10 items-center justify-center rounded-md text-ui font-medium transition-colors " +
                    (p.highlight
                      ? "bg-brand text-white hover:bg-brand-80"
                      : "border border-border text-foreground hover:bg-elevated")
                  }
                >
                  {p.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <div className="rounded-2xl border border-border bg-surface p-10">
          <MessageSquare className="mx-auto size-8 text-brand" />
          <h2 className="mt-3 font-display text-h2 font-bold">Pronto para organizar sua agência?</h2>
          <p className="mx-auto mt-2 max-w-lg text-ui text-muted">
            Crie seu workspace em minutos. Sem cartão, com 14 dias de recursos Business liberados.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-6 text-body font-semibold text-white transition-colors hover:bg-brand-80"
          >
            Começar grátis <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-dense text-subtle sm:flex-row">
          <span>© {brandName}</span>
          <div className="flex items-center gap-4">
            <Link href="/privacidade" className="hover:text-foreground">Privacidade</Link>
            <Link href="/termos" className="hover:text-foreground">Termos</Link>
            <Link href="/login" className="hover:text-foreground">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
