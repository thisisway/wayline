"use client";

import * as React from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Plus,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ExpenseDTO, InvoiceListItem } from "@wayline/db";
import { Badge, Button, Input, cn } from "@wayline/ui";
import { toCents, toInput } from "@/lib/money";
import { clientOptionsAction } from "@/actions/proposals";
import {
  createInvoiceAction,
  deleteInvoiceAction,
  getInvoiceAction,
  listInvoicesAction,
  updateInvoiceAction,
} from "@/actions/invoices";
import {
  createExpenseAction,
  deleteExpenseAction,
  listExpensesAction,
  updateExpenseAction,
} from "@/actions/expenses";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";
const sameMonth = (d: Date | null, now: Date) =>
  !!d && new Date(d).getFullYear() === now.getFullYear() && new Date(d).getMonth() === now.getMonth();
const overdue = (iv: InvoiceListItem) =>
  iv.status === "sent" && iv.dueDate != null && new Date(iv.dueDate).getTime() < Date.now();

const INV_STATUS: Record<string, { label: string; variant: "neutral" | "brand" | "success" | "danger" }> = {
  draft: { label: "Rascunho", variant: "neutral" },
  sent: { label: "Em aberto", variant: "brand" },
  paid: { label: "Paga", variant: "success" },
  canceled: { label: "Cancelada", variant: "danger" },
};

const CATEGORIES = ["Geral", "Software", "Salários", "Impostos", "Marketing", "Terceiros", "Escritório"];

export function FinancePage({ orgId }: { orgId: string }) {
  const [tab, setTab] = React.useState<"invoices" | "expenses">("invoices");
  const [invoices, setInvoices] = React.useState<InvoiceListItem[]>([]);
  const [expenses, setExpenses] = React.useState<ExpenseDTO[]>([]);
  const [clients, setClients] = React.useState<Array<{ id: string; name: string }>>([]);

  const reloadInvoices = React.useCallback(() => listInvoicesAction(orgId).then(setInvoices), [orgId]);
  const reloadExpenses = React.useCallback(() => listExpensesAction(orgId).then(setExpenses), [orgId]);

  React.useEffect(() => {
    reloadInvoices();
    reloadExpenses();
    clientOptionsAction(orgId).then(setClients);
  }, [orgId, reloadInvoices, reloadExpenses]);

  const kpi = React.useMemo(() => {
    const now = new Date();
    let receivable = 0, receivedMonth = 0, expenseMonth = 0;
    for (const iv of invoices) {
      if (iv.status === "sent") receivable += iv.amountCents;
      if (iv.status === "paid" && sameMonth(iv.paidAt, now)) receivedMonth += iv.amountCents;
    }
    for (const e of expenses) {
      if (e.paid && sameMonth(e.paidAt, now)) expenseMonth += e.amountCents;
    }
    return { receivable, receivedMonth, expenseMonth, balance: receivedMonth - expenseMonth };
  }, [invoices, expenses]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Cabeçalho */}
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-success/10 text-success">
            <Wallet className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-h2 font-bold">Financeiro</h1>
            <p className="text-ui text-muted">Receitas, despesas e o caixa da sua operação.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={TrendingUp} label="A receber" value={brl(kpi.receivable)} tone="text-brand" />
          <Kpi icon={Check} label="Recebido no mês" value={brl(kpi.receivedMonth)} tone="text-success" />
          <Kpi icon={TrendingDown} label="Despesas no mês" value={brl(kpi.expenseMonth)} tone="text-danger" />
          <Kpi icon={Wallet} label="Saldo do mês" value={brl(kpi.balance)} tone={kpi.balance >= 0 ? "text-success" : "text-danger"} />
        </div>

        {/* Abas */}
        <div className="mb-4 inline-flex rounded-lg border border-border bg-surface p-0.5">
          {([["invoices", "Faturas", Receipt], ["expenses", "Despesas", TrendingDown]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn("flex items-center gap-1.5 rounded-md px-3 h-9 text-dense font-medium transition-colors", tab === id ? "bg-brand/10 text-brand" : "text-muted hover:text-foreground")}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "invoices" ? (
          <InvoicesPanel orgId={orgId} list={invoices} clients={clients} onChanged={reloadInvoices} />
        ) : (
          <ExpensesPanel orgId={orgId} list={expenses} clients={clients} onChanged={reloadExpenses} />
        )}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="size-4" />
        <span className="text-dense font-medium">{label}</span>
      </div>
      <p className={cn("mt-1.5 font-display text-xl font-extrabold tabular-nums", tone)}>{value}</p>
    </div>
  );
}

/* ------------------------------ FATURAS ------------------------------ */

function InvoicesPanel({
  orgId,
  list,
  clients,
  onChanged,
}: {
  orgId: string;
  list: InvoiceListItem[];
  clients: Array<{ id: string; name: string }>;
  onChanged: () => void;
}) {
  const [sel, setSel] = React.useState<string | null>(null);
  const [f, setF] = React.useState({ title: "", clientId: "", amount: "", dueDate: "", status: "draft", recurrence: "none", description: "", token: "" });
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  async function open(id: string) {
    const iv = await getInvoiceAction(orgId, id);
    if (!iv) return;
    setSel(id);
    setF({
      title: iv.title, clientId: iv.clientId ?? "", amount: toInput(iv.amountCents),
      dueDate: iv.dueDate ? new Date(iv.dueDate).toISOString().slice(0, 10) : "",
      status: iv.status, recurrence: iv.recurrence, description: iv.description, token: iv.token,
    });
  }
  async function createNew() {
    const id = await createInvoiceAction(orgId);
    if (id) { onChanged(); open(id); }
  }
  async function save(status = f.status) {
    if (!sel || saving) return;
    setSaving(true);
    await updateInvoiceAction(orgId, sel, {
      title: f.title, description: f.description, amountCents: toCents(f.amount),
      clientId: f.clientId || null, status, recurrence: f.recurrence,
      dueDateIso: f.dueDate ? new Date(f.dueDate).toISOString() : null,
    }).catch(() => {});
    setSaving(false);
    setF((s) => ({ ...s, status }));
    onChanged();
  }
  async function remove() {
    if (!sel) return;
    await deleteInvoiceAction(orgId, sel);
    setSel(null); onChanged();
  }
  function copyLink() {
    navigator.clipboard?.writeText(`${window.location.origin}/fatura/${f.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-[340px_1fr]">
      {/* Lista */}
      <div className={cn("min-w-0", sel && "hidden md:block")}>
        <Button onClick={createNew} className="mb-3 w-full"><Plus className="size-4" /> Nova fatura</Button>
        {list.length === 0 ? (
          <Empty>Nenhuma fatura ainda.</Empty>
        ) : (
          <div className="space-y-2">
            {list.map((iv) => (
              <button key={iv.id} type="button" onClick={() => open(iv.id)} className={cn("flex w-full flex-col gap-1 rounded-xl border p-3 text-left transition-colors", sel === iv.id ? "border-brand bg-brand/5" : "border-border bg-surface hover:border-brand-40")}>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-ui font-medium text-foreground">{iv.title}</span>
                  <Badge variant={overdue(iv) ? "danger" : INV_STATUS[iv.status]?.variant ?? "neutral"} size="sm">
                    {overdue(iv) ? "Vencida" : INV_STATUS[iv.status]?.label ?? iv.status}
                  </Badge>
                </span>
                <span className="flex items-center justify-between text-dense text-subtle">
                  <span className="truncate">{iv.clientName ?? "Sem cliente"} · venc. {fmtDate(iv.dueDate)}</span>
                  <span className="font-semibold tabular-nums text-foreground">{brl(iv.amountCents)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className={cn("rounded-2xl border border-border bg-surface", !sel && "hidden md:block")}>
        {!sel ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 p-6 text-center text-muted">
            <Receipt className="size-8 text-subtle" />
            <p className="text-ui">Selecione uma fatura ou crie uma nova.</p>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <button type="button" onClick={() => setSel(null)} className="mb-3 flex items-center gap-1.5 text-dense font-medium text-muted hover:text-foreground md:hidden">
              <ArrowLeft className="size-4" /> Voltar
            </button>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Título" className="col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
              <Field label="Valor (R$)"><Input value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0,00" className="text-right" /></Field>
              <Field label="Vencimento"><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
              <Field label="Cliente">
                <Select value={f.clientId} onChange={(v) => setF({ ...f, clientId: v })} options={[{ v: "", l: "Sem cliente" }, ...clients.map((c) => ({ v: c.id, l: c.name }))]} />
              </Field>
              <Field label="Status">
                <Select value={f.status} onChange={(v) => setF({ ...f, status: v })} options={[{ v: "draft", l: "Rascunho" }, { v: "sent", l: "Em aberto" }, { v: "paid", l: "Paga" }, { v: "canceled", l: "Cancelada" }]} />
              </Field>
              <Field label="Recorrência" className="col-span-2">
                <Select value={f.recurrence} onChange={(v) => setF({ ...f, recurrence: v })} options={[{ v: "none", l: "Única" }, { v: "monthly", l: "Mensal (gera rascunho todo mês)" }]} />
              </Field>
              <Field label="Descrição / itens" className="col-span-2">
                <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="h-24 w-full resize-y rounded-md border border-border bg-canvas p-2.5 text-ui text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <button type="button" onClick={copyLink} className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 h-9 text-dense font-medium text-muted hover:bg-elevated hover:text-foreground">
                {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />} {copied ? "Copiado!" : "Copiar link"}
              </button>
              <button type="button" onClick={remove} className="flex size-9 items-center justify-center rounded-md text-subtle hover:text-danger" aria-label="Excluir"><Trash2 className="size-4" /></button>
              <div className="ml-auto flex items-center gap-2">
                {f.status !== "paid" && <Button variant="secondary" onClick={() => save("paid")} disabled={saving}><Check className="size-4" /> Marcar paga</Button>}
                <Button onClick={() => save()} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ DESPESAS ------------------------------ */

const emptyExpense = { description: "", category: "Geral", amount: "", dueDate: "", paid: false, recurrence: "none", clientId: "" };

function ExpensesPanel({
  orgId,
  list,
  clients,
  onChanged,
}: {
  orgId: string;
  list: ExpenseDTO[];
  clients: Array<{ id: string; name: string }>;
  onChanged: () => void;
}) {
  const [sel, setSel] = React.useState<string | "new" | null>(null);
  const [f, setF] = React.useState({ ...emptyExpense });
  const [saving, setSaving] = React.useState(false);

  function edit(e: ExpenseDTO) {
    setSel(e.id);
    setF({
      description: e.description, category: e.category, amount: toInput(e.amountCents),
      dueDate: e.dueDate ? new Date(e.dueDate).toISOString().slice(0, 10) : "",
      paid: e.paid, recurrence: e.recurrence, clientId: e.clientId ?? "",
    });
  }
  function createNew() {
    setSel("new");
    setF({ ...emptyExpense });
  }
  async function save() {
    if (saving || !f.description.trim()) return;
    setSaving(true);
    const raw = {
      description: f.description, category: f.category, amountCents: toCents(f.amount),
      dueDateIso: f.dueDate ? new Date(f.dueDate).toISOString() : null, paid: f.paid,
      recurrence: f.recurrence, clientId: f.clientId || null,
    };
    if (sel === "new") await createExpenseAction(orgId, raw).catch(() => null);
    else if (sel) await updateExpenseAction(orgId, sel, raw).catch(() => {});
    setSaving(false);
    setSel(null);
    onChanged();
  }
  async function remove(id: string) {
    await deleteExpenseAction(orgId, id);
    if (sel === id) setSel(null);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-[340px_1fr]">
      {/* Lista */}
      <div className={cn("min-w-0", sel && "hidden md:block")}>
        <Button onClick={createNew} className="mb-3 w-full"><Plus className="size-4" /> Nova despesa</Button>
        {list.length === 0 ? (
          <Empty>Nenhuma despesa ainda.</Empty>
        ) : (
          <div className="space-y-2">
            {list.map((e) => (
              <button key={e.id} type="button" onClick={() => edit(e)} className={cn("flex w-full flex-col gap-1 rounded-xl border p-3 text-left transition-colors", sel === e.id ? "border-brand bg-brand/5" : "border-border bg-surface hover:border-brand-40")}>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-ui font-medium text-foreground">{e.description}</span>
                  <Badge variant={e.paid ? "success" : "neutral"} size="sm">{e.paid ? "Paga" : "A pagar"}</Badge>
                </span>
                <span className="flex items-center justify-between text-dense text-subtle">
                  <span className="truncate">{e.category}{e.clientName ? ` · ${e.clientName}` : ""} · {fmtDate(e.dueDate)}</span>
                  <span className="font-semibold tabular-nums text-danger">- {brl(e.amountCents)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className={cn("rounded-2xl border border-border bg-surface", !sel && "hidden md:block")}>
        {!sel ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 p-6 text-center text-muted">
            <TrendingDown className="size-8 text-subtle" />
            <p className="text-ui">Registre uma despesa para ver o caixa real.</p>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <button type="button" onClick={() => setSel(null)} className="mb-3 flex items-center gap-1.5 text-dense font-medium text-muted hover:text-foreground md:hidden">
              <ArrowLeft className="size-4" /> Voltar
            </button>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Descrição" className="col-span-2"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Ex.: Assinatura Adobe" /></Field>
              <Field label="Valor (R$)"><Input value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0,00" className="text-right" /></Field>
              <Field label="Vencimento"><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
              <Field label="Categoria">
                <Select value={f.category} onChange={(v) => setF({ ...f, category: v })} options={CATEGORIES.map((c) => ({ v: c, l: c }))} />
              </Field>
              <Field label="Cliente (opcional)">
                <Select value={f.clientId} onChange={(v) => setF({ ...f, clientId: v })} options={[{ v: "", l: "—" }, ...clients.map((c) => ({ v: c.id, l: c.name }))]} />
              </Field>
              <Field label="Recorrência" className="col-span-2">
                <Select value={f.recurrence} onChange={(v) => setF({ ...f, recurrence: v })} options={[{ v: "none", l: "Única" }, { v: "monthly", l: "Mensal" }]} />
              </Field>
              <label className="col-span-2 flex items-center gap-2 text-ui text-muted">
                <input type="checkbox" checked={f.paid} onChange={(e) => setF({ ...f, paid: e.target.checked })} className="size-4 accent-brand" />
                Já foi paga
              </label>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
              {sel !== "new" && (
                <button type="button" onClick={() => remove(sel)} className="flex size-9 items-center justify-center rounded-md text-subtle hover:text-danger" aria-label="Excluir"><Trash2 className="size-4" /></button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Button variant="secondary" onClick={() => setSel(null)}>Cancelar</Button>
                <Button onClick={save} disabled={!f.description.trim() || saving}>{saving ? "Salvando…" : "Salvar"}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ helpers ------------------------------ */

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-dense font-medium text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<{ v: string; l: string }> }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-ui text-foreground">
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-6 text-center text-dense text-subtle">{children}</p>;
}
