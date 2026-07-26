"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Braces,
  Brain,
  Briefcase,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  Database,
  FileSignature,
  FileText,
  KanbanSquare,
  Lock,
  MessageSquare,
  Minus,
  Network,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/plans";

/* ---------------- helpers de animação ---------------- */

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
      { threshold: 0.12 },
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
          setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
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
  { icon: Sparkles, label: "IA (Brain)" },
  { icon: Braces, label: "Campos custom" },
];

const BENEFITS: Array<{
  icon: LucideIcon;
  title: string;
  desc: string;
  accent?: boolean;
}> = [
  { icon: TrendingUp, title: "Receita previsível", desc: "Propostas recorrentes e visão clara do funil comercial.", accent: true },
  { icon: Zap, title: "Menos retrabalho", desc: "Automações cuidam do operacional repetitivo por você." },
  { icon: Rocket, title: "Feche mais rápido", desc: "Da proposta ao contrato assinado em minutos, não dias." },
  { icon: Users, title: "Time no mesmo lugar", desc: "Chat, docs e tarefas juntos — sem informação perdida." },
  { icon: Brain, title: "IA que produz", desc: "Redige propostas, resume e sugere próximos passos.", accent: true },
  { icon: Palette, title: "Sua marca", desc: "White-label: logo, cor e nome da plataforma são seus." },
];

const COMPARISON: Array<{ label: string; us: boolean; them: "no" | "partial" }> = [
  { label: "Tarefas, propostas e contratos no mesmo lugar", us: true, them: "no" },
  { label: "Formulários que viram tarefas automaticamente", us: true, them: "partial" },
  { label: "IA nativa (redige e resume)", us: true, them: "partial" },
  { label: "Marca personalizada (white-label)", us: true, them: "no" },
  { label: "Dados no Brasil e conformidade LGPD", us: true, them: "no" },
  { label: "Preço em Real, sem dólar", us: true, them: "no" },
];

const FLOW = [
  { icon: ClipboardList, title: "Briefing", desc: "Pedidos por formulário viram tarefas no board." },
  { icon: KanbanSquare, title: "Produção", desc: "Time executa com prazos e responsáveis." },
  { icon: Briefcase, title: "Proposta", desc: "Envie e colete o aceite do cliente online." },
  { icon: FileSignature, title: "Contrato", desc: "Gere e assine — negócio fechado." },
];

const SECURITY = [
  { icon: Database, title: "Dados no Brasil", desc: "Infraestrutura no país (LGPD)." },
  { icon: Lock, title: "Criptografia", desc: "Senhas com hash, conexão segura." },
  { icon: ShieldCheck, title: "Isolamento por workspace", desc: "Cada agência com dados isolados." },
  { icon: Users, title: "Seus dados são seus", desc: "Exporte ou exclua quando quiser." },
];

const FAQS: Array<[string, string]> = [
  ["Como começo a usar?", "Crie sua conta grátis em segundos. Seu workspace já vem com um board pronto e um guia de primeiros passos."],
  ["Preciso de cartão de crédito?", "Não. Você começa no plano Free e ainda ganha 14 dias com os recursos do Business liberados, sem cartão."],
  ["Serve para o tipo da minha agência?", "Sim — social media, tráfego, branding, web, audiovisual, assessoria. O Wayline se adapta ao seu fluxo."],
  ["Meus dados estão seguros?", "Sim. Infraestrutura no Brasil, senhas criptografadas, isolamento por workspace e conformidade com a LGPD."],
  ["Consigo exportar ou excluir meus dados?", "A qualquer momento, em Configurações → Conta. Você exporta em JSON ou exclui a conta com um clique."],
  ["Como funciona a IA?", "O Wayline Brain redige propostas a partir de um briefing, resume o board e sugere próximos passos — direto na plataforma."],
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
  const [faq, setFaq] = React.useState<number | null>(0);

  return (
    <div className="min-h-dvh scroll-smooth bg-canvas text-foreground">
      {/* ============ HERO (gradiente vivo) ============ */}
      <section className="wl-hero-gradient relative overflow-hidden text-white">
        <div className="wl-streaks pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0">
          <div className="wl-blob absolute -left-24 top-24 size-80 rounded-full bg-[#4f46e5]/40" />
          <div className="wl-blob absolute -right-16 top-10 size-96 rounded-full bg-[#1D66FF]/40" style={{ animationDelay: "5s" }} />
        </div>

        {/* nav */}
        <header className="relative z-20">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
            <div className="flex items-center gap-2">
              {logo ? (
                <img src={logo} alt={brandName} className="h-7 w-auto max-w-[140px] object-contain brightness-0 invert" />
              ) : (
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 font-display text-ui font-extrabold backdrop-blur">
                  {brandName[0] ?? "W"}
                </span>
              )}
              <span className="font-display text-ui font-bold">{brandName}</span>
            </div>
            <nav className="hidden items-center gap-1 md:flex">
              {[
                ["Recursos", "#recursos"],
                ["Benefícios", "#beneficios"],
                ["Preços", "#precos"],
                ["FAQ", "#faq"],
              ].map(([label, href]) => (
                <a key={href} href={href} className="rounded-md px-3 py-2 text-dense font-medium text-white/75 transition-colors hover:text-white">
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden h-9 items-center rounded-md px-3 text-ui font-medium text-white/80 transition-colors hover:text-white sm:flex">
                Entrar
              </Link>
              <Link href="/register" className="flex h-9 items-center gap-1.5 rounded-pill bg-white px-4 text-ui font-semibold text-[#16225e] shadow-lg transition-transform hover:scale-[1.03]">
                Começar grátis
              </Link>
            </div>
          </div>
        </header>

        {/* hero content */}
        <div className="relative z-10 mx-auto max-w-4xl px-6 pt-10 text-center sm:pt-16">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-white/20 bg-white/10 px-3 py-1 text-dense font-medium text-white/90 backdrop-blur">
              <Sparkles className="size-3.5" /> O work OS das agências
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Sua agência inteira,{" "}
              <span className="bg-gradient-to-r from-white via-[#9db8ff] to-white bg-clip-text text-transparent">
                num só lugar
              </span>{" "}
              <Rocket className="inline size-9 -rotate-45 text-white/90 sm:size-12" />
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-body text-white/75">
              Do briefing ao contrato assinado: tarefas, propostas, formulários e clientes com IA
              integrada. Menos abas abertas, mais negócio fechado.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" className="group flex h-12 items-center gap-2 rounded-pill bg-white px-7 text-body font-semibold text-[#16225e] shadow-xl transition-transform hover:scale-[1.03]">
                Começar grátis <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#recursos" className="flex h-12 items-center gap-2 rounded-pill border border-white/25 bg-white/5 px-7 text-body font-medium text-white backdrop-blur transition-colors hover:bg-white/15">
                Ver recursos
              </a>
            </div>
            <p className="mt-4 flex items-center justify-center gap-2 text-dense text-white/70">
              <Check className="size-4" /> 14 dias de Business grátis · sem cartão
            </p>
          </Reveal>
        </div>

        {/* produto + cards flutuantes */}
        <div className="relative z-10 mx-auto mt-12 max-w-5xl px-6 pb-24">
          <Reveal delay={150}>
            <div className="relative">
              {/* cards flutuantes */}
              <FloatCard className="-left-2 top-8 hidden sm:block" delay="0s">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-success/15 text-success">
                    <Check className="size-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">Proposta aceita</p>
                    <p className="text-[11px] text-muted">Loja X · R$ 5.500/mês</p>
                  </div>
                </div>
              </FloatCard>
              <FloatCard className="-right-2 top-2 hidden sm:block" delay="1.2s">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-brand/15 text-brand">
                    <Sparkles className="size-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">IA gerou a proposta</p>
                    <p className="text-[11px] text-muted">em 8 segundos</p>
                  </div>
                </div>
              </FloatCard>
              <FloatCard className="-right-4 bottom-10 hidden lg:block" delay="0.6s">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#7C5CFF]/15 text-[#7C5CFF]">
                    <FileSignature className="size-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">Contrato assinado</p>
                    <p className="text-[11px] text-muted">agora mesmo</p>
                  </div>
                </div>
              </FloatCard>

              <ProductShot brandName={brandName} />
            </div>
          </Reveal>
        </div>

        {/* curva branca */}
        <div className="absolute inset-x-0 bottom-0 h-16 rounded-t-[2.5rem] bg-canvas" />
      </section>

      {/* ============ TRUST ============ */}
      <section className="bg-canvas pb-4 pt-2">
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-subtle">
          Feito para agências de marketing, design, conteúdo e performance
        </p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="wl-marquee flex w-max gap-3">
            {[...Array(2)].flatMap((_, k) =>
              ["Social Media", "Tráfego Pago", "Branding", "Web & Design", "Audiovisual", "Assessoria", "SEO & Conteúdo", "Influência"].map((t) => (
                <span key={`${k}-${t}`} className="rounded-pill border border-border bg-surface px-4 py-1.5 text-dense font-medium text-muted">
                  {t}
                </span>
              )),
            )}
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { n: <CountUp to={30} prefix="+" />, l: "recursos integrados" },
            { n: <CountUp to={9} />, l: "visões de trabalho" },
            { n: <CountUp to={100} suffix="%" />, l: "dados no Brasil" },
            { n: <CountUp to={14} />, l: "dias grátis no Business" },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="rounded-2xl border border-border bg-gradient-to-b from-surface to-brand/[0.04] p-5 text-center">
                <p className="font-display text-3xl font-extrabold text-brand">{s.n}</p>
                <p className="mt-1 text-dense text-muted">{s.l}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ FEATURES (uma destacada) ============ */}
      <section id="recursos" className="mx-auto max-w-6xl px-6 py-14">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand/10 px-3 py-1 text-dense font-semibold text-brand">Recursos</span>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Transforme sua agência em uma{" "}
            <span className="wl-gradient-text">máquina de entregar</span>
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-ui text-muted">
            Tudo o que você precisa para vender, produzir e cobrar — em uma plataforma só.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <Reveal>
            <FeatureCard
              icon={KanbanSquare}
              title="Gestão de trabalho"
              desc="Board, Lista, Calendário e Gantt sobre a mesma base."
              visual={<BoardMock />}
            />
          </Reveal>
          <Reveal delay={100}>
            <FeatureCard
              accent
              icon={Briefcase}
              title="Comercial completo"
              desc="Propostas com aceite, catálogo, portfólio e contratos."
              visual={<ProposalMock accent />}
            />
          </Reveal>
          <Reveal delay={200}>
            <FeatureCard
              icon={Brain}
              title="Wayline Brain (IA)"
              desc="Redige, resume e acelera o seu dia a dia."
              visual={<BrainMock />}
            />
          </Reveal>
        </div>
      </section>

      {/* ============ BENEFÍCIOS (cards coloridos) ============ */}
      <section id="beneficios" className="border-y border-border bg-gradient-to-b from-brand/[0.05] to-transparent py-16">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand/10 px-3 py-1 text-dense font-semibold text-brand">Benefícios</span>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Feito para você crescer</h2>
            <p className="mx-auto mt-2 max-w-xl text-ui text-muted">
              Menos dor de cabeça operacional, mais tempo para o que importa: seus clientes.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <Reveal key={b.title} delay={(i % 3) * 90}>
                  <div
                    className={
                      "wl-card-hover h-full rounded-2xl border p-5 " +
                      (b.accent
                        ? "border-transparent bg-gradient-to-br from-brand to-[#7C5CFF] text-white shadow-xl shadow-brand/25"
                        : "border-border bg-surface")
                    }
                  >
                    <span className={"flex size-11 items-center justify-center rounded-xl " + (b.accent ? "bg-white/15 text-white" : "bg-brand/10 text-brand")}>
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-3 font-display text-ui font-bold">{b.title}</h3>
                    <p className={"mt-1 text-dense " + (b.accent ? "text-white/85" : "text-muted")}>{b.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ MÓDULOS ============ */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Mais de 30 recursos, zero gambiarra</h2>
          <p className="mx-auto mt-2 max-w-xl text-ui text-muted">Tudo nativo — sem plugins, sem integrações frágeis.</p>
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

      {/* ============ FLUXO ============ */}
      <section className="border-y border-border bg-surface/40 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Do briefing ao contrato</h2>
            <p className="mx-auto mt-2 max-w-xl text-ui text-muted">Um caminho claro para cada projeto.</p>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {FLOW.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={i * 110}>
                  <div className="relative rounded-2xl border border-border bg-canvas p-5">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-[#7C5CFF] text-white shadow-lg shadow-brand/30">
                      <Icon className="size-5" />
                    </span>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-subtle">Passo {i + 1}</p>
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

      {/* ============ COMPARATIVO ============ */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Por que o {brandName} <span className="wl-gradient-text">ganha</span> das outras
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-ui text-muted">Tudo que prometem, sem as dores que escondem.</p>
        </Reveal>
        <Reveal className="mt-8">
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 bg-surface px-4 py-3 text-dense font-semibold text-muted">
              <span>Recurso</span>
              <span className="w-20 text-center text-subtle">Outros</span>
              <span className="w-20 rounded-lg bg-brand py-1 text-center text-white">{brandName}</span>
            </div>
            {COMPARISON.map((c, i) => (
              <div
                key={c.label}
                className={"grid grid-cols-[1fr_auto_auto] items-center gap-2 px-4 py-3 text-ui " + (i % 2 ? "bg-surface/40" : "")}
              >
                <span className="text-foreground">{c.label}</span>
                <span className="flex w-20 justify-center">
                  {c.them === "no" ? (
                    <span className="text-subtle">—</span>
                  ) : (
                    <Minus className="size-4 text-warning" />
                  )}
                </span>
                <span className="flex w-20 justify-center">
                  <span className="flex size-6 items-center justify-center rounded-full bg-success/15 text-success">
                    <Check className="size-4" />
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============ DEPOIMENTO ============ */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-[#7C5CFF] p-8 text-center text-white shadow-2xl shadow-brand/30 sm:p-12">
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <div className="wl-blob absolute -left-10 -top-10 size-56 rounded-full bg-white/40" />
            </div>
            <div className="relative">
              <div className="mb-4 flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-5 fill-white text-white" />
                ))}
              </div>
              <p className="mx-auto max-w-2xl font-display text-xl font-semibold leading-snug sm:text-2xl">
                “Trocamos 5 assinaturas por uma. Proposta, tarefas e contrato no mesmo lugar — a
                equipe parou de se perder entre abas.”
              </p>
              <p className="mt-4 text-dense text-white/80">Sua agência pode ser a próxima aqui 👋</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ PREÇOS (faixa escura) ============ */}
      <section id="precos" className="wl-hero-gradient relative overflow-hidden py-16 text-white">
        <div className="wl-streaks pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-6">
          <Reveal className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1 text-dense font-semibold text-white/90 backdrop-blur">Preços</span>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Planos que crescem com você</h2>
            <p className="mx-auto mt-2 max-w-xl text-white/75">Comece grátis. Faça upgrade quando o time crescer.</p>
            <div className="mt-5 inline-flex items-center gap-1 rounded-pill border border-white/20 bg-white/10 p-1 backdrop-blur">
              <button type="button" onClick={() => setYearly(false)} className={"rounded-pill px-4 h-8 text-dense font-medium transition-colors " + (!yearly ? "bg-white text-[#16225e]" : "text-white/80")}>
                Mensal
              </button>
              <button type="button" onClick={() => setYearly(true)} className={"flex items-center gap-1.5 rounded-pill px-4 h-8 text-dense font-medium transition-colors " + (yearly ? "bg-white text-[#16225e]" : "text-white/80")}>
                Anual <span className="text-[11px] text-success">-20%</span>
              </button>
            </div>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_ORDER.map((id, i) => {
              const p = PLANS[id];
              return (
                <Reveal key={id} delay={i * 80}>
                  <div className={"flex h-full flex-col rounded-2xl p-5 " + (p.highlight ? "bg-white text-foreground shadow-2xl" : "border border-white/15 bg-white/5 text-white backdrop-blur")}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-ui font-bold">{p.name}</h3>
                      {p.highlight && <span className="rounded-pill bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">Popular</span>}
                    </div>
                    <p className="mt-2 font-display text-3xl font-extrabold">
                      {price(id, yearly)}
                      {p.priceBRL != null && p.priceBRL > 0 && (
                        <span className={"text-dense font-medium " + (p.highlight ? "text-subtle" : "text-white/60")}> /usuário/mês</span>
                      )}
                    </p>
                    <p className={"mt-1 text-dense " + (p.highlight ? "text-muted" : "text-white/70")}>{p.tagline}</p>
                    <ul className="mt-4 flex-1 space-y-1.5">
                      {p.features.slice(0, 6).map((feat) => (
                        <li key={feat} className={"flex gap-2 text-dense " + (p.highlight ? "text-muted" : "text-white/80")}>
                          <Check className={"mt-0.5 size-3.5 shrink-0 " + (p.highlight ? "text-success" : "text-white")} />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <Link href="/register" className={"mt-5 flex h-10 items-center justify-center rounded-lg text-ui font-medium transition-colors " + (p.highlight ? "bg-brand text-white hover:bg-brand-80" : "bg-white/10 text-white hover:bg-white/20")}>
                      {p.cta}
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ SEGURANÇA ============ */}
      <section id="seguranca" className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand/10 px-3 py-1 text-dense font-semibold text-brand">
            <ShieldCheck className="size-3.5" /> Privacidade & Segurança
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Seus dados protegidos e sob seu controle</h2>
          <p className="mx-auto mt-2 max-w-xl text-ui text-muted">Boas práticas de segurança e conformidade com a LGPD.</p>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECURITY.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.title} delay={i * 80}>
                <div className="wl-card-hover rounded-2xl border border-border bg-surface p-5">
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
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="border-t border-border bg-surface/40 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Perguntas frequentes</h2>
            <p className="mx-auto mt-2 max-w-xl text-ui text-muted">Tudo o que você precisa saber para começar.</p>
          </Reveal>
          <div className="mt-8 space-y-3">
            {FAQS.map(([q, a], i) => {
              const open = faq === i;
              return (
                <Reveal key={q} delay={i * 50}>
                  <div className="overflow-hidden rounded-xl border border-border bg-canvas">
                    <button
                      type="button"
                      onClick={() => setFaq(open ? null : i)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                    >
                      <span className="text-ui font-semibold">{q}</span>
                      <ChevronDown className={"size-4 shrink-0 text-muted transition-transform " + (open ? "rotate-180" : "")} />
                    </button>
                    <div className={"grid transition-all duration-300 " + (open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                      <div className="overflow-hidden">
                        <p className="px-4 pb-4 text-dense text-muted">{a}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <Reveal>
          <div className="wl-hero-gradient relative overflow-hidden rounded-3xl p-10 text-white shadow-2xl shadow-brand/30 sm:p-14">
            <div className="wl-streaks pointer-events-none absolute inset-0" />
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="wl-blob absolute -left-10 -top-10 size-56 rounded-full bg-white/30" />
              <div className="wl-blob absolute -bottom-10 right-0 size-64 rounded-full bg-[#7C5CFF]/60" style={{ animationDelay: "3s" }} />
            </div>
            <div className="relative">
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Organize sua agência hoje</h2>
              <p className="mx-auto mt-2 max-w-lg text-white/85">Workspace pronto em minutos. 14 dias de Business grátis, sem cartão.</p>
              <Link href="/register" className="mt-7 inline-flex h-12 items-center gap-2 rounded-pill bg-white px-7 text-body font-semibold text-[#16225e] transition-transform hover:scale-[1.03]">
                Começar grátis <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ FOOTER ============ */}
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
            <p className="mt-3 max-w-xs text-dense text-muted">O sistema operacional de trabalho para agências.</p>
          </div>
          <FooterCol title="Produto" links={[["Recursos", "#recursos"], ["Benefícios", "#beneficios"], ["Preços", "#precos"], ["FAQ", "#faq"]]} />
          <FooterCol title="Conta" links={[["Entrar", "/login"], ["Criar conta", "/register"]]} />
          <FooterCol title="Legal" links={[["Privacidade", "/privacidade"], ["Termos de Uso", "/termos"]]} />
        </div>
        <div className="border-t border-border py-5 text-center text-dense text-subtle">© {brandName} · Feito no Brasil</div>
      </footer>
    </div>
  );
}

/* ---------------- subcomponentes ---------------- */

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <p className="text-label uppercase text-subtle">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-dense text-muted transition-colors hover:text-foreground">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FloatCard({ children, className = "", delay = "0s" }: { children: React.ReactNode; className?: string; delay?: string }) {
  return (
    <div className={"absolute z-20 rounded-xl border border-border bg-surface/95 px-3 py-2 shadow-xl backdrop-blur wl-bob " + className} style={{ animationDelay: delay }}>
      {children}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  visual,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  visual: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={"wl-card-hover flex h-full flex-col rounded-2xl border p-5 " + (accent ? "border-brand/30 bg-gradient-to-b from-brand/[0.06] to-transparent" : "border-border bg-surface")}>
      <span className={"flex size-11 items-center justify-center rounded-xl " + (accent ? "bg-brand text-white" : "bg-brand/10 text-brand")}>
        <Icon className="size-5" />
      </span>
      <h3 className="mt-3 font-display text-ui font-bold">{title}</h3>
      <p className="mt-1 text-dense text-muted">{desc}</p>
      <div className="mt-4 rounded-xl border border-border bg-canvas p-3">{visual}</div>
    </div>
  );
}

/** Mockup de "captura de tela" — janela do app com sidebar + board. */
function ProductShot({ brandName }: { brandName: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/20 ring-1 ring-black/5">
      {/* barra do navegador */}
      <div className="flex items-center gap-2 border-b border-border bg-canvas px-4 py-2.5">
        <span className="size-3 rounded-full bg-[#FF5F57]" />
        <span className="size-3 rounded-full bg-[#FEBC2E]" />
        <span className="size-3 rounded-full bg-[#28C840]" />
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-surface px-3 py-1 text-[11px] text-subtle">
          <Lock className="size-3" /> app.wayline.com.br
        </div>
      </div>
      <div className="flex">
        {/* mini sidebar */}
        <div className="hidden w-40 shrink-0 border-r border-border bg-canvas p-3 sm:block">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-brand text-[11px] font-bold text-white">
              {brandName[0] ?? "W"}
            </span>
            <div className="h-2 w-16 rounded bg-border" />
          </div>
          <div className="mt-4 space-y-2">
            {["Home", "Inbox", "Comercial", "Formulários"].map((s, i) => (
              <div key={s} className={"flex items-center gap-2 rounded-md px-2 py-1.5 " + (i === 0 ? "bg-brand/10" : "")}>
                <span className={"size-3 rounded " + (i === 0 ? "bg-brand" : "bg-border")} />
                <span className={"text-[11px] " + (i === 0 ? "font-semibold text-brand" : "text-muted")}>{s}</span>
              </div>
            ))}
          </div>
        </div>
        {/* board */}
        <div className="min-w-0 flex-1 p-4">
          <div className="mb-3 flex items-center gap-2">
            {["Board", "Lista", "Calendário", "Gantt"].map((t, i) => (
              <span key={t} className={"rounded-md px-2 py-1 text-[11px] font-medium " + (i === 0 ? "bg-brand/10 text-brand" : "text-muted")}>{t}</span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: "A fazer", color: "#94A3B8", cards: 3 },
              { name: "Fazendo", color: "#1D66FF", cards: 2 },
              { name: "Feito", color: "#17C86A", cards: 2 },
            ].map((c) => (
              <div key={c.name} className="rounded-lg bg-canvas p-2">
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-[10px] font-semibold text-muted">{c.name}</span>
                </div>
                <div className="space-y-1.5">
                  {[...Array(c.cards)].map((_, i) => (
                    <div key={i} className="rounded-md border border-border bg-surface p-2">
                      <div className="h-1.5 w-3/4 rounded bg-border" />
                      <div className="mt-1.5 flex items-center justify-between">
                        <div className="flex -space-x-1">
                          <span className="size-3.5 rounded-full bg-brand/40 ring-1 ring-surface" />
                          <span className="size-3.5 rounded-full bg-[#7C5CFF]/40 ring-1 ring-surface" />
                        </div>
                        <span className="rounded bg-brand/10 px-1 py-0.5 text-[8px] font-semibold text-brand">Hoje</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardMock() {
  const cols = [
    { color: "#94A3B8", cards: 2 },
    { color: "#1D66FF", cards: 2 },
    { color: "#17C86A", cards: 1 },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {cols.map((c, ci) => (
        <div key={ci} className="rounded-lg bg-surface p-1.5">
          <span className="mb-1.5 block size-2 rounded-full" style={{ backgroundColor: c.color }} />
          <div className="space-y-1.5">
            {[...Array(c.cards)].map((_, i) => (
              <div key={i} className="rounded border border-border bg-canvas p-1.5">
                <div className="h-1 w-3/4 rounded bg-border" />
                <span className="mt-1 block size-3 rounded-full bg-brand/30" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProposalMock({ accent }: { accent?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between rounded-md bg-surface px-2 py-1.5">
        <div className="h-1.5 w-16 rounded bg-border" />
        <span className="rounded-pill bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold text-success">Aceita</span>
      </div>
      {["R$ 2.500", "R$ 1.800", "R$ 1.200"].map((v, i) => (
        <div key={i} className="flex items-center justify-between rounded-md border border-border bg-surface px-2 py-1">
          <div className="h-1 w-14 rounded bg-border" />
          <span className="text-[10px] font-semibold text-foreground">{v}</span>
        </div>
      ))}
      <div className={"flex items-center justify-between rounded-md px-2 py-1.5 text-white " + (accent ? "bg-brand" : "bg-brand")}>
        <span className="text-[10px] font-medium">Total</span>
        <span className="text-[11px] font-bold">R$ 5.500</span>
      </div>
    </div>
  );
}

function BrainMock() {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg rounded-br-sm bg-brand/10 px-2 py-1 text-[10px] text-foreground">
          Gere uma proposta de social media
        </div>
      </div>
      <div className="flex items-start gap-1.5">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <Sparkles className="size-3" />
        </span>
        <div className="max-w-[85%] rounded-lg rounded-bl-sm border border-border bg-surface px-2 py-1.5">
          <div className="h-1 w-24 rounded bg-border" />
          <div className="mt-1 h-1 w-20 rounded bg-border/70" />
          <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-brand/10 px-1.5 py-0.5 text-[8px] font-semibold text-brand">
            <Check className="size-2.5" /> Pronta
          </span>
        </div>
      </div>
    </div>
  );
}
