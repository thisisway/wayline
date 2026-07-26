"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Braces,
  Brain,
  Briefcase,
  Calendar,
  Check,
  ClipboardList,
  Clock,
  Database,
  FileSignature,
  FileText,
  Globe,
  Image as ImageIcon,
  KanbanSquare,
  Lock,
  Mail,
  MessageSquare,
  Network,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/plans";

/* ---------------- helpers de animação (sem libs) ---------------- */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`wl-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function CountUp({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 1400;
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(to * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return (
    <span ref={ref}>
      {prefix}
      {val}
      {suffix}
    </span>
  );
}

/* ---------------- dados ---------------- */

const ORBIT: Array<{ icon: LucideIcon; cls: string; delay: string }> = [
  { icon: Mail, cls: "top-0 left-1/2 -translate-x-1/2", delay: "0s" },
  { icon: Calendar, cls: "top-[14%] right-[4%]", delay: "0.6s" },
  { icon: MessageSquare, cls: "bottom-[14%] right-[4%]", delay: "1.2s" },
  { icon: ImageIcon, cls: "bottom-0 left-1/2 -translate-x-1/2", delay: "0.3s" },
  { icon: FileText, cls: "bottom-[14%] left-[4%]", delay: "0.9s" },
  { icon: Globe, cls: "top-[14%] left-[4%]", delay: "1.5s" },
];

const SHOWCASE: Array<{
  tag: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  bullets: string[];
  visual: React.ReactNode;
  flip?: boolean;
}> = [
  {
    tag: "Gestão de trabalho",
    icon: KanbanSquare,
    title: "Board, Lista, Calendário e Gantt — a mesma base, várias visões",
    desc: "Organize campanhas, entregas e rotinas do jeito que seu time pensa. Arraste, filtre e acompanhe tudo sem perder o contexto.",
    bullets: ["Kanban com arrastar-e-soltar", "Gantt, Calendário e Lista", "Filtros, tags e campos personalizados"],
    visual: <BoardMock />,
  },
  {
    tag: "Comercial",
    icon: Briefcase,
    title: "Do briefing ao contrato assinado, sem sair da plataforma",
    desc: "Crie propostas lindas com link público, colete o aceite do cliente e gere o contrato assinável em segundos.",
    bullets: ["Propostas com link público e aceite", "Catálogo e portfólio de cases", "Contratos assináveis online"],
    visual: <ProposalMock />,
    flip: true,
  },
  {
    tag: "Inteligência artificial",
    icon: Brain,
    title: "O Wayline Brain trabalha ao seu lado",
    desc: "Resuma reuniões, redija propostas, gere tarefas a partir de um briefing e acelere o dia a dia com IA nativa.",
    bullets: ["Rascunho de propostas por IA", "Resumo executivo do board", "Sugestões e automações"],
    visual: <BrainMock />,
  },
];

const MODULES: Array<{ icon: LucideIcon; label: string }> = [
  { icon: KanbanSquare, label: "Board" },
  { icon: FileText, label: "Docs & Wiki" },
  { icon: Network, label: "Mind Map" },
  { icon: MessageSquare, label: "Chat" },
  { icon: Briefcase, label: "Propostas" },
  { icon: FileSignature, label: "Contratos" },
  { icon: ClipboardList, label: "Formulários" },
  { icon: Users, label: "Clientes" },
  { icon: Clock, label: "Controle de tempo" },
  { icon: Zap, label: "Automações" },
  { icon: Sparkles, label: "Wayline Brain (IA)" },
  { icon: Braces, label: "Campos custom" },
];

const FLOW = [
  { icon: ClipboardList, title: "Briefing", desc: "Receba pedidos por formulário — vira tarefa no board." },
  { icon: KanbanSquare, title: "Produção", desc: "Time executa nas visões, com prazos e responsáveis." },
  { icon: Briefcase, title: "Proposta", desc: "Envie a proposta e colete o aceite do cliente." },
  { icon: FileSignature, title: "Contrato", desc: "Gere e assine o contrato — negócio fechado." },
];

const SECURITY = [
  { icon: Database, title: "Dados no Brasil", desc: "Infraestrutura hospedada no país (LGPD)." },
  { icon: Lock, title: "Criptografia", desc: "Senhas com hash e conexão segura." },
  { icon: ShieldCheck, title: "Isolamento por workspace", desc: "Cada agência com seus dados isolados." },
  { icon: Users, title: "Seus dados são seus", desc: "Exporte ou exclua sua conta quando quiser." },
];

function price(id: PlanId, yearly: boolean): string {
  const p = PLANS[id];
  const v = yearly ? p.priceBRLYearly : p.priceBRL;
  if (v === null) return "Sob consulta";
  if (v === 0) return "Grátis";
  return `R$ ${v}`;
}

/* ---------------- página ---------------- */

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
  const [yearly, setYearly] = React.useState(true);

  return (
    <div className="min-h-dvh scroll-smooth bg-canvas text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-canvas/70 backdrop-blur-xl">
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
          <nav className="hidden items-center gap-1 md:flex">
            {[
              ["Recursos", "#recursos"],
              ["Fluxo", "#fluxo"],
              ["Preços", "#precos"],
              ["Segurança", "#seguranca"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-md px-3 py-2 text-dense font-medium text-muted transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden h-9 items-center rounded-md px-3 text-ui font-medium text-muted transition-colors hover:text-foreground sm:flex"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-ui font-medium text-white shadow-sm transition-colors hover:bg-brand-80"
            >
              Começar grátis <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="wl-blob absolute -left-20 top-10 size-72 rounded-full bg-brand/25" />
          <div className="wl-blob absolute right-0 top-40 size-80 rounded-full bg-[#7C5CFF]/20" style={{ animationDelay: "4s" }} />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1 text-dense font-medium text-muted">
              <Sparkles className="size-3.5 text-brand" /> O work OS das agências
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              Toda a operação da sua agência,{" "}
              <span className="wl-gradient-text">em um só lugar.</span>
            </h1>
            <p className="mt-4 max-w-xl text-body text-muted">
              Do briefing ao contrato assinado: tarefas, documentos, propostas, formulários e
              clientes — com IA integrada. Menos ferramentas soltas, mais resultado.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-body font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-80 hover:shadow-brand/40"
              >
                Começar grátis
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#recursos"
                className="flex h-12 items-center justify-center rounded-xl border border-border px-6 text-body font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
              >
                Ver recursos
              </a>
            </div>
            <p className="mt-3 flex items-center gap-2 text-dense text-subtle">
              <Check className="size-4 text-success" /> 14 dias de Business grátis · sem cartão
            </p>
          </Reveal>

          <Reveal delay={150}>
            <HeroConstellation brandName={brandName} logo={logo} />
          </Reveal>
        </div>

        {/* trust marquee */}
        <div className="border-y border-border/60 bg-surface/50 py-5">
          <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-subtle">
            Feito para agências de marketing, design, conteúdo e performance
          </p>
          <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
            <div className="wl-marquee flex w-max gap-3">
              {[...Array(2)].flatMap((_, k) =>
                ["Social Media", "Tráfego Pago", "Branding", "Web & Design", "Audiovisual", "Assessoria", "SEO & Conteúdo", "Influência"].map(
                  (t) => (
                    <span
                      key={`${k}-${t}`}
                      className="rounded-pill border border-border bg-surface px-4 py-1.5 text-dense font-medium text-muted"
                    >
                      {t}
                    </span>
                  ),
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { n: <CountUp to={30} prefix="+" />, l: "recursos integrados" },
            { n: <CountUp to={9} />, l: "visões de trabalho" },
            { n: <CountUp to={100} suffix="%" />, l: "dados no Brasil (LGPD)" },
            { n: <CountUp to={14} />, l: "dias grátis no Business" },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="rounded-2xl border border-border bg-surface p-5 text-center">
                <p className="font-display text-3xl font-extrabold text-brand">{s.n}</p>
                <p className="mt-1 text-dense text-muted">{s.l}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* SHOWCASE */}
      <section id="recursos" className="mx-auto max-w-6xl space-y-20 px-6 py-16">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold">Uma plataforma, o fluxo inteiro</h2>
          <p className="mx-auto mt-2 max-w-xl text-ui text-muted">
            Pare de saltar entre ferramentas. O {brandName} conecta a operação da sua agência de
            ponta a ponta.
          </p>
        </Reveal>

        {SHOWCASE.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={i}>
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div className={s.flip ? "lg:order-2" : ""}>
                  <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand/10 px-3 py-1 text-dense font-semibold text-brand">
                    <Icon className="size-3.5" /> {s.tag}
                  </span>
                  <h3 className="mt-3 font-display text-2xl font-bold leading-tight">{s.title}</h3>
                  <p className="mt-2 text-ui text-muted">{s.desc}</p>
                  <ul className="mt-4 space-y-2">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-ui text-muted">
                        <span className="flex size-5 items-center justify-center rounded-full bg-success/15 text-success">
                          <Check className="size-3" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={s.flip ? "lg:order-1" : ""}>
                  <div className="wl-card-hover rounded-2xl border border-border bg-surface p-4 shadow-sm">
                    {s.visual}
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </section>

      {/* MÓDULOS */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold">Tudo que sua agência precisa</h2>
          <p className="mx-auto mt-2 max-w-xl text-ui text-muted">
            Mais de 30 recursos prontos para usar — sem plugins, sem gambiarra.
          </p>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MODULES.map((m, i) => {
            const Icon = m.icon;
            return (
              <Reveal key={m.label} delay={(i % 4) * 60}>
                <div className="wl-card-hover flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-ui font-medium">{m.label}</span>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* FLUXO */}
      <section id="fluxo" className="border-y border-border bg-surface/40 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-bold">Do briefing ao contrato</h2>
            <p className="mx-auto mt-2 max-w-xl text-ui text-muted">
              Um caminho claro para cada projeto — sem informação perdida no meio.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {FLOW.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={i * 120}>
                  <div className="relative rounded-2xl border border-border bg-canvas p-5">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-white shadow-lg shadow-brand/30">
                      <Icon className="size-5" />
                    </span>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-subtle">
                      Passo {i + 1}
                    </p>
                    <h3 className="mt-0.5 font-display text-ui font-bold">{f.title}</h3>
                    <p className="mt-1 text-dense text-muted">{f.desc}</p>
                    {i < FLOW.length - 1 && (
                      <ArrowRight className="absolute -right-3 top-1/2 hidden size-5 -translate-y-1/2 text-border md:block" />
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* DEPOIMENTO */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand/10 to-[#7C5CFF]/10 p-8 text-center sm:p-12">
            <div className="mb-4 flex justify-center gap-1 text-brand">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-5 fill-current" />
              ))}
            </div>
            <p className="mx-auto max-w-2xl font-display text-xl font-semibold leading-snug sm:text-2xl">
              “Trocamos 5 assinaturas por uma. Proposta, tarefas e contrato no mesmo lugar — a
              equipe parou de se perder entre abas.”
            </p>
            <p className="mt-4 text-dense text-muted">Sua agência pode ser a próxima aqui 👋</p>
          </div>
        </Reveal>
      </section>

      {/* PREÇOS */}
      <section id="precos" className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold">Planos que crescem com você</h2>
          <p className="mx-auto mt-2 max-w-xl text-ui text-muted">
            Comece grátis. Faça upgrade quando o time crescer.
          </p>
          <div className="mt-5 inline-flex items-center gap-1 rounded-pill border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`rounded-pill px-4 h-8 text-dense font-medium transition-colors ${!yearly ? "bg-brand text-white" : "text-muted"}`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`flex items-center gap-1.5 rounded-pill px-4 h-8 text-dense font-medium transition-colors ${yearly ? "bg-brand text-white" : "text-muted"}`}
            >
              Anual <span className={`text-[11px] ${yearly ? "text-white/80" : "text-success"}`}>-20%</span>
            </button>
          </div>
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((id, i) => {
            const p = PLANS[id];
            return (
              <Reveal key={id} delay={i * 80}>
                <div
                  className={`flex h-full flex-col rounded-2xl border bg-surface p-5 ${p.highlight ? "border-brand shadow-xl shadow-brand/10 ring-1 ring-brand" : "border-border"}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-ui font-bold">{p.name}</h3>
                    {p.highlight && (
                      <span className="rounded-pill bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-display text-3xl font-extrabold">
                    {price(id, yearly)}
                    {p.priceBRL != null && p.priceBRL > 0 && (
                      <span className="text-dense font-medium text-subtle"> /usuário/mês</span>
                    )}
                  </p>
                  <p className="mt-1 text-dense text-muted">{p.tagline}</p>
                  <ul className="mt-4 flex-1 space-y-1.5">
                    {p.features.slice(0, 6).map((feat) => (
                      <li key={feat} className="flex gap-2 text-dense text-muted">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`mt-5 flex h-10 items-center justify-center rounded-lg text-ui font-medium transition-colors ${p.highlight ? "bg-brand text-white hover:bg-brand-80" : "border border-border text-foreground hover:bg-elevated"}`}
                  >
                    {p.cta}
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* SEGURANÇA */}
      <section id="seguranca" className="border-y border-border bg-surface/40 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand/10 px-3 py-1 text-dense font-semibold text-brand">
              <ShieldCheck className="size-3.5" /> Privacidade & Segurança
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold">
              Seus dados protegidos e sob seu controle
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-ui text-muted">
              Construído com boas práticas de segurança e em conformidade com a LGPD.
            </p>
          </Reveal>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SECURITY.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.title} delay={i * 80}>
                  <div className="wl-card-hover rounded-2xl border border-border bg-canvas p-5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-3 text-ui font-semibold">{s.title}</h3>
                    <p className="mt-1 text-dense text-muted">{s.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <Reveal className="mt-6 text-center">
            <Link href="/privacidade" className="text-dense font-medium text-brand hover:underline">
              Ler nossa Política de Privacidade →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-brand p-10 text-white shadow-2xl shadow-brand/30 sm:p-14">
            <div className="pointer-events-none absolute inset-0 -z-0 opacity-30">
              <div className="wl-blob absolute -left-10 -top-10 size-56 rounded-full bg-white/40" />
              <div className="wl-blob absolute -bottom-10 right-0 size-64 rounded-full bg-[#7C5CFF]/60" style={{ animationDelay: "3s" }} />
            </div>
            <div className="relative">
              <h2 className="font-display text-3xl font-extrabold">Organize sua agência hoje</h2>
              <p className="mx-auto mt-2 max-w-lg text-white/85">
                Crie seu workspace em minutos. 14 dias de Business grátis, sem cartão.
              </p>
              <Link
                href="/register"
                className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-body font-semibold text-brand transition-transform hover:scale-[1.02]"
              >
                Começar grátis <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              {logo ? (
                <img src={logo} alt={brandName} className="h-6 w-auto max-w-[120px] object-contain" />
              ) : (
                <span className="flex size-7 items-center justify-center rounded-lg bg-brand font-display text-dense font-extrabold text-white">
                  {brandName[0] ?? "W"}
                </span>
              )}
              <span className="font-display text-ui font-bold">{brandName}</span>
            </div>
            <p className="mt-3 max-w-xs text-dense text-muted">
              O sistema operacional de trabalho para agências.
            </p>
          </div>
          <FooterCol title="Produto" links={[["Recursos", "#recursos"], ["Fluxo", "#fluxo"], ["Preços", "#precos"], ["Segurança", "#seguranca"]]} />
          <FooterCol title="Conta" links={[["Entrar", "/login"], ["Criar conta", "/register"]]} />
          <FooterCol title="Legal" links={[["Privacidade", "/privacidade"], ["Termos de Uso", "/termos"]]} />
        </div>
        <div className="border-t border-border py-5 text-center text-dense text-subtle">
          © {brandName} · Feito no Brasil
        </div>
      </footer>
    </div>
  );
}

/* ---------------- subcomponentes visuais ---------------- */

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <p className="text-label uppercase text-subtle">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-dense text-muted transition-colors hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroConstellation({ brandName, logo }: { brandName: string; logo: string | null }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px]">
      {/* anéis girando */}
      <div className="wl-spin-slow absolute inset-4 rounded-full border border-dashed border-brand/25" />
      <div
        className="wl-spin-slow absolute inset-16 rounded-full border border-dashed border-brand/20"
        style={{ animationDirection: "reverse", animationDuration: "30s" }}
      />

      {/* nó central */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="wl-pulse-ring relative flex size-24 items-center justify-center rounded-3xl bg-brand text-white shadow-2xl shadow-brand/40">
          {logo ? (
            <img src={logo} alt={brandName} className="max-h-10 max-w-[70%] object-contain" />
          ) : (
            <span className="font-display text-3xl font-extrabold">{brandName[0] ?? "W"}</span>
          )}
        </div>
      </div>

      {/* ícones orbitando */}
      {ORBIT.map((o, i) => {
        const Icon = o.icon;
        return (
          <div key={i} className={`absolute ${o.cls}`}>
            <div
              className="wl-float flex size-12 items-center justify-center rounded-2xl border border-border bg-surface shadow-lg"
              style={{ animationDelay: o.delay }}
            >
              <Icon className="size-5 text-brand" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardMock() {
  const cols = [
    { name: "A fazer", color: "#94A3B8", cards: 3 },
    { name: "Fazendo", color: "#1D66FF", cards: 2 },
    { name: "Feito", color: "#17C86A", cards: 2 },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {cols.map((c) => (
        <div key={c.name} className="rounded-lg bg-canvas p-2">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="text-[11px] font-semibold text-muted">{c.name}</span>
          </div>
          <div className="space-y-1.5">
            {[...Array(c.cards)].map((_, i) => (
              <div key={i} className="rounded-md border border-border bg-surface p-2">
                <div className="h-1.5 w-3/4 rounded bg-border" />
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="size-3 rounded-full bg-brand/30" />
                  <div className="h-1 w-8 rounded bg-border" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProposalMock() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg bg-canvas p-3">
        <div>
          <div className="h-2 w-24 rounded bg-border" />
          <div className="mt-1.5 h-1.5 w-16 rounded bg-border/60" />
        </div>
        <span className="rounded-pill bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
          Aceita
        </span>
      </div>
      {[
        ["Gestão de social media", "R$ 2.500"],
        ["Tráfego pago", "R$ 1.800"],
        ["Criativos (8/mês)", "R$ 1.200"],
      ].map(([a, b]) => (
        <div key={a} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
          <span className="text-dense text-muted">{a}</span>
          <span className="text-dense font-semibold text-foreground">{b}</span>
        </div>
      ))}
      <div className="flex items-center justify-between rounded-lg bg-brand px-3 py-2 text-white">
        <span className="text-dense font-medium">Total / mês</span>
        <span className="font-display font-bold">R$ 5.500</span>
      </div>
    </div>
  );
}

function BrainMock() {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-brand/10 px-3 py-2 text-dense text-foreground">
          Gere uma proposta de social media para a Loja X
        </div>
      </div>
      <div className="flex items-start gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <Sparkles className="size-3.5" />
        </span>
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-canvas px-3 py-2">
          <div className="h-1.5 w-40 rounded bg-border" />
          <div className="mt-1.5 h-1.5 w-32 rounded bg-border/70" />
          <div className="mt-1.5 h-1.5 w-36 rounded bg-border/50" />
          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-1 text-[10px] font-semibold text-brand">
            <Check className="size-3" /> Proposta pronta
          </div>
        </div>
      </div>
    </div>
  );
}
