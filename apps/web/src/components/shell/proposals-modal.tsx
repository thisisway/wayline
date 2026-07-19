"use client";

import * as React from "react";
import { Check, Copy, FileText, Package, Plus, Sparkles, Trash2, X } from "lucide-react";
import type { PortfolioItemDTO, ProposalDTO, ProposalListItem, ServiceDTO } from "@wayline/db";
import { Badge, Button, Input, cn } from "@wayline/ui";
import { listServicesAction } from "@/actions/services";
import { listPortfolioAction } from "@/actions/portfolio";
import {
  aiEnabledAction,
  clientOptionsAction,
  createProposalAction,
  deleteProposalAction,
  draftProposalAction,
  getProposalAction,
  listProposalsAction,
  updateProposalAction,
} from "@/actions/proposals";

const STATUS: Record<string, { label: string; variant: "neutral" | "brand" | "success" | "danger" }> = {
  draft: { label: "Rascunho", variant: "neutral" },
  sent: { label: "Enviada", variant: "brand" },
  accepted: { label: "Aceita", variant: "success" },
  rejected: { label: "Recusada", variant: "danger" },
};

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const propNo = (n: number) => `PROP-${String(n).padStart(5, "0")}`;

interface ItemRow {
  description: string;
  details: string;
  value: string; // preço unitário em reais (texto)
  quantity: string;
  unit: string;
  term: string;
}

function toCents(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
}
const emptyItem = (): ItemRow => ({
  description: "",
  details: "",
  value: "",
  quantity: "1",
  unit: "Unidade",
  term: "",
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-dense font-medium text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Area(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full resize-y rounded-md border border-border bg-canvas p-2.5 text-ui text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        props.className,
      )}
    />
  );
}

export function ProposalsModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [list, setList] = React.useState<ProposalListItem[] | null>(null);
  const [clients, setClients] = React.useState<Array<{ id: string; name: string }>>([]);
  const [aiOn, setAiOn] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Editor
  const [d, setD] = React.useState<ProposalDTO | null>(null);
  const [title, setTitle] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [validUntil, setValidUntil] = React.useState("");
  const [status, setStatus] = React.useState("draft");
  const [recurrence, setRecurrence] = React.useState("once");
  const [intro, setIntro] = React.useState("");
  const [objective, setObjective] = React.useState("");
  const [terms, setTerms] = React.useState("");
  const [bonus, setBonus] = React.useState("");
  const [nextSteps, setNextSteps] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");
  const [schedule, setSchedule] = React.useState<Array<{ label: string; duration: string }>>([]);
  const [items, setItems] = React.useState<ItemRow[]>([]);
  const [discount, setDiscount] = React.useState("0");
  const [payMethod, setPayMethod] = React.useState("");
  const [payTerms, setPayTerms] = React.useState("");
  const [token, setToken] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const [briefing, setBriefing] = React.useState("");
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiPanel, setAiPanel] = React.useState(false);

  const [catalog, setCatalog] = React.useState<ServiceDTO[]>([]);
  const [catalogOpen, setCatalogOpen] = React.useState(false);
  const [portfolio, setPortfolio] = React.useState<PortfolioItemDTO[]>([]);
  const [portfolioIds, setPortfolioIds] = React.useState<string[]>([]);

  const reload = React.useCallback(() => listProposalsAction(orgId).then(setList), [orgId]);

  React.useEffect(() => {
    reload();
    clientOptionsAction(orgId).then(setClients);
    listServicesAction(orgId).then(setCatalog);
    listPortfolioAction(orgId).then(setPortfolio);
    aiEnabledAction().then(setAiOn);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orgId, reload, onClose]);

  function loadInto(p: ProposalDTO) {
    setD(p);
    setSelectedId(p.id);
    setTitle(p.title);
    setClientId(p.clientId ?? "");
    setValidUntil(p.validUntil ? new Date(p.validUntil).toISOString().slice(0, 10) : "");
    setStatus(p.status);
    setRecurrence(p.recurrence);
    setIntro(p.intro);
    setObjective(p.objective);
    setTerms(p.terms);
    setBonus(p.bonus);
    setNextSteps(p.nextSteps);
    setInternalNotes(p.internalNotes);
    setSchedule(p.schedule);
    setDiscount(String(p.discountPct));
    setPayMethod(p.paymentMethod);
    setPayTerms(p.paymentTerms);
    setPortfolioIds(p.portfolioIds);
    setToken(p.token);
    setItems(
      p.items.length
        ? p.items.map((i) => ({
            description: i.description,
            details: i.details,
            value: (i.amountCents / 100).toString(),
            quantity: String(i.quantity),
            unit: i.unit,
            term: i.term,
          }))
        : [emptyItem()],
    );
    setAiPanel(false);
  }

  async function open(id: string) {
    const p = await getProposalAction(orgId, id);
    if (p) loadInto(p);
  }
  async function createNew() {
    const id = await createProposalAction(orgId);
    if (!id) return;
    reload();
    const p = await getProposalAction(orgId, id);
    if (p) loadInto(p);
  }

  async function save() {
    if (!selectedId || saving) return;
    setSaving(true);
    await updateProposalAction(orgId, selectedId, {
      title,
      intro,
      objective,
      terms,
      bonus,
      nextSteps,
      internalNotes,
      schedule: schedule.filter((s) => s.label.trim()),
      discountPct: Number(discount) || 0,
      paymentMethod: payMethod,
      paymentTerms: payTerms,
      portfolioIds,
      recurrence,
      clientId: clientId || null,
      status,
      validUntilIso: validUntil ? new Date(validUntil).toISOString() : null,
      items: items
        .filter((i) => i.description.trim())
        .map((i) => ({
          description: i.description.trim(),
          details: i.details,
          amountCents: toCents(i.value),
          quantity: Math.max(1, Number(i.quantity) || 1),
          unit: i.unit || "Unidade",
          term: i.term,
        })),
    }).catch(() => {});
    setSaving(false);
    reload();
  }

  async function remove() {
    if (!selectedId) return;
    await deleteProposalAction(orgId, selectedId);
    setSelectedId(null);
    setD(null);
    reload();
  }

  function copyLink() {
    navigator.clipboard?.writeText(`${window.location.origin}/proposta/${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function runAI() {
    if (!briefing.trim() || aiBusy) return;
    setAiBusy(true);
    const res = await draftProposalAction(orgId, briefing).catch(() => null);
    setAiBusy(false);
    if (res) {
      if (res.intro) setIntro(res.intro);
      if (res.items.length) {
        setItems(
          res.items.map((i) => ({
            description: i.description,
            details: "",
            value: (i.amountCents / 100).toString(),
            quantity: "1",
            unit: "Unidade",
            term: "",
          })),
        );
      }
      setAiPanel(false);
    }
  }

  const subtotalCents = items.reduce((s, i) => s + toCents(i.value) * (Number(i.quantity) || 1), 0);
  const discPct = Math.min(100, Math.max(0, Number(discount) || 0));
  const totalCents = Math.round(subtotalCents * (1 - discPct / 100));
  const decided = status === "accepted" || status === "rejected";
  const setItem = (i: number, patch: Partial<ItemRow>) =>
    setItems((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[88vh] w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lista */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-display text-ui font-bold">Propostas</h2>
            <button
              type="button"
              onClick={createNew}
              aria-label="Nova proposta"
              className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {list === null ? (
              <p className="p-2 text-dense text-subtle">Carregando…</p>
            ) : list.length === 0 ? (
              <p className="p-2 text-dense text-subtle">Nenhuma proposta.</p>
            ) : (
              list.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => open(p.id)}
                  className={cn(
                    "mb-1 flex w-full flex-col gap-1 rounded-md px-2.5 py-2 text-left transition-colors",
                    selectedId === p.id ? "bg-brand/10" : "hover:bg-elevated",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-dense font-medium text-foreground">{p.title}</span>
                    <Badge variant={STATUS[p.status]?.variant ?? "neutral"} size="sm">
                      {STATUS[p.status]?.label ?? p.status}
                    </Badge>
                  </span>
                  <span className="flex items-center justify-between text-[11px] text-subtle">
                    <span className="truncate">{propNo(p.number)} · {p.clientName ?? "Sem cliente"}</span>
                    <span className="tabular-nums">{brl(p.totalCents)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Editor */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="flex items-center gap-2 text-dense text-subtle">
              <FileText className="size-4" />
              {selectedId ? `Editando ${propNo(d?.number ?? 0)}` : "Selecione ou crie uma proposta"}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted">
              <FileText className="size-8 text-subtle" />
              <p className="text-ui">Crie uma proposta e compartilhe o link com o cliente.</p>
              <Button onClick={createNew}>
                <Plus className="size-4" /> Nova proposta
              </Button>
            </div>
          ) : (
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {/* Cabeçalho + meta */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-3">
                  <Field label="Título">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </Field>
                </div>
                <div className="space-y-3">
                  <Field label="Cliente">
                    <select
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-ui text-foreground"
                    >
                      <option value="">Sem cliente</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Recorrência">
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-ui text-foreground"
                  >
                    <option value="once">Única</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </Field>
                <Field label="Válida até">
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </Field>
                <Field label="Status">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={decided}
                    className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-ui text-foreground disabled:opacity-60"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="sent">Enviada</option>
                    {decided && <option value={status}>{STATUS[status]?.label}</option>}
                  </select>
                </Field>
              </div>

              {/* Apresentação + IA */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-dense font-medium text-muted">Apresentação</span>
                  {aiOn && (
                    <button
                      type="button"
                      onClick={() => setAiPanel((v) => !v)}
                      className="flex items-center gap-1 text-dense font-medium text-brand hover:underline"
                    >
                      <Sparkles className="size-3.5" /> Gerar com IA
                    </button>
                  )}
                </div>
                {aiPanel && (
                  <div className="mt-2 rounded-md border border-brand/30 bg-brand/5 p-2.5">
                    <Area
                      value={briefing}
                      onChange={(e) => setBriefing(e.target.value)}
                      placeholder="Briefing: cliente, objetivo, serviços…"
                      className="h-16 border-border bg-surface"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" onClick={runAI} disabled={!briefing.trim() || aiBusy}>
                        <Sparkles className="size-3.5" /> {aiBusy ? "Gerando…" : "Gerar"}
                      </Button>
                    </div>
                  </div>
                )}
                <Area
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  className="mt-1 h-20"
                  placeholder="Apresentação da empresa/proposta…"
                />
              </div>

              <Field label="Objetivo">
                <Area value={objective} onChange={(e) => setObjective(e.target.value)} className="h-16" />
              </Field>

              {/* Portfólio */}
              {portfolio.length > 0 && (
                <div>
                  <span className="text-dense font-medium text-muted">
                    Portfólio ({portfolioIds.length} selecionado{portfolioIds.length === 1 ? "" : "s"})
                  </span>
                  <div className="mt-1 grid grid-cols-4 gap-2">
                    {portfolio.map((c) => {
                      const on = portfolioIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setPortfolioIds((ids) =>
                              on ? ids.filter((x) => x !== c.id) : [...ids, c.id],
                            )
                          }
                          title={c.title}
                          className={cn(
                            "overflow-hidden rounded-md border-2 transition",
                            on ? "border-brand" : "border-transparent opacity-60 hover:opacity-100",
                          )}
                        >
                          <img src={c.imageUrl} alt={c.title} className="aspect-video w-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cronograma */}
              <div>
                <span className="text-dense font-medium text-muted">Cronograma de entrega</span>
                <div className="mt-1 space-y-2">
                  {schedule.map((ph, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={ph.label}
                        onChange={(e) =>
                          setSchedule((a) => a.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                        }
                        placeholder="Fase (ex.: Aprovação da proposta)"
                        className="flex-1"
                      />
                      <Input
                        value={ph.duration}
                        onChange={(e) =>
                          setSchedule((a) => a.map((x, j) => (j === i ? { ...x, duration: e.target.value } : x)))
                        }
                        placeholder="Duração"
                        className="w-32"
                      />
                      <button
                        type="button"
                        onClick={() => setSchedule((a) => a.filter((_, j) => j !== i))}
                        className="flex size-9 items-center justify-center rounded-md text-subtle hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSchedule((a) => [...a, { label: "", duration: "" }])}
                  className="mt-2 flex items-center gap-1 text-dense font-medium text-muted hover:text-foreground"
                >
                  <Plus className="size-3.5" /> Adicionar fase
                </button>
              </div>

              {/* Investimento */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-dense font-medium text-muted">Investimento</span>
                  {catalog.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCatalogOpen((v) => !v)}
                      className="flex items-center gap-1 text-dense font-medium text-brand hover:underline"
                    >
                      <Package className="size-3.5" /> Catálogo
                    </button>
                  )}
                </div>
                {catalogOpen && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border bg-canvas p-1">
                    {catalog.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setItems((arr) => [
                            ...arr.filter((x) => x.description.trim() || x.value.trim()),
                            {
                              description: s.name,
                              details: s.description,
                              value: (s.amountCents / 100).toString(),
                              quantity: "1",
                              unit: s.unit,
                              term: s.term,
                            },
                          ]);
                          setCatalogOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-dense hover:bg-elevated"
                      >
                        <span className="truncate text-foreground">{s.name}</span>
                        <span className="shrink-0 tabular-nums text-subtle">{brl(s.amountCents)}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-1 space-y-3">
                  {items.map((it, i) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={it.description}
                          onChange={(e) => setItem(i, { description: e.target.value })}
                          placeholder="Serviço / descrição"
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}
                          className="flex size-8 items-center justify-center rounded-md text-subtle hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        <label className="text-[11px] text-subtle">
                          Qtd
                          <Input
                            value={it.quantity}
                            onChange={(e) => setItem(i, { quantity: e.target.value })}
                            className="mt-0.5 text-right"
                          />
                        </label>
                        <label className="text-[11px] text-subtle">
                          Unidade
                          <Input
                            value={it.unit}
                            onChange={(e) => setItem(i, { unit: e.target.value })}
                            className="mt-0.5"
                          />
                        </label>
                        <label className="text-[11px] text-subtle">
                          Preço unit. (R$)
                          <Input
                            value={it.value}
                            onChange={(e) => setItem(i, { value: e.target.value })}
                            placeholder="0,00"
                            className="mt-0.5 text-right"
                          />
                        </label>
                        <label className="text-[11px] text-subtle">
                          Prazo
                          <Input
                            value={it.term}
                            onChange={(e) => setItem(i, { term: e.target.value })}
                            className="mt-0.5"
                          />
                        </label>
                      </div>
                      <Area
                        value={it.details}
                        onChange={(e) => setItem(i, { details: e.target.value })}
                        placeholder="Detalhes do serviço (o que está incluído)…"
                        className="mt-2 h-16 text-dense"
                      />
                      <p className="mt-1 text-right text-dense text-subtle">
                        Subtotal:{" "}
                        <span className="font-semibold text-foreground tabular-nums">
                          {brl(toCents(it.value) * (Number(it.quantity) || 1))}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setItems((arr) => [...arr, emptyItem()])}
                  className="mt-2 flex items-center gap-1 text-dense font-medium text-muted hover:text-foreground"
                >
                  <Plus className="size-3.5" /> Adicionar item
                </button>

                {/* Totais */}
                <div className="mt-3 space-y-1 rounded-lg border border-border bg-canvas p-3 text-ui">
                  <div className="flex items-center justify-between text-muted">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{brl(subtotalCents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Desconto (%)</span>
                    <Input
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="h-8 w-20 text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-1 text-h3 font-bold">
                    <span>Total</span>
                    <span className="tabular-nums text-brand">{brl(totalCents)}</span>
                  </div>
                </div>
              </div>

              {/* Pagamento */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Forma de pagamento">
                  <Input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} placeholder="Pix, cartão…" />
                </Field>
                <Field label="Condições de pagamento">
                  <Input value={payTerms} onChange={(e) => setPayTerms(e.target.value)} placeholder="Ex.: entrada + 3x" />
                </Field>
              </div>

              <Field label="Condições gerais">
                <Area value={terms} onChange={(e) => setTerms(e.target.value)} className="h-20" />
              </Field>
              <Field label="Bônus (incluídos)">
                <Area value={bonus} onChange={(e) => setBonus(e.target.value)} className="h-14" />
              </Field>
              <Field label="Próximos passos (visível ao cliente)">
                <Area value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} className="h-14" />
              </Field>
              <Field label="Notas internas (não vão para o cliente)">
                <Area value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} className="h-14" />
              </Field>

              {decided && d?.decidedByName && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-dense">
                  <span className="font-semibold text-success">
                    {status === "accepted" ? "Aceita" : "Recusada"}
                  </span>{" "}
                  por <strong>{d.decidedByName}</strong>
                  {d.decidedByDoc && ` (${d.decidedByDoc})`}
                  {d.decidedAt && ` em ${new Date(d.decidedAt).toLocaleString("pt-BR")}`}
                </div>
              )}
            </div>
          )}

          {/* Rodapé */}
          {selectedId && (
            <div className="flex items-center gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 h-9 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
              >
                {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                {copied ? "Copiado!" : "Copiar link"}
              </button>
              <button
                type="button"
                onClick={remove}
                className="flex size-9 items-center justify-center rounded-md text-subtle hover:text-danger"
                aria-label="Excluir"
              >
                <Trash2 className="size-4" />
              </button>
              <span className="ml-auto text-dense text-subtle">
                Total <strong className="text-foreground tabular-nums">{brl(totalCents)}</strong>
              </span>
              <Button onClick={save} disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
