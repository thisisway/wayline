"use client";

import * as React from "react";
import { Check, Copy, FilePlus2, Plus, Trash2, Wallet, X } from "lucide-react";
import type { ContractListItem, InvoiceDTO, InvoiceListItem } from "@wayline/db";
import { Badge, Button, Input, cn } from "@wayline/ui";
import { toCents, toInput } from "@/lib/money";
import { clientOptionsAction } from "@/actions/proposals";
import { listContractsAction } from "@/actions/contracts";
import {
  createInvoiceAction,
  deleteInvoiceAction,
  getInvoiceAction,
  invoiceFromContractAction,
  listInvoicesAction,
  updateInvoiceAction,
} from "@/actions/invoices";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const no = (n: number) => `FAT-${String(n).padStart(5, "0")}`;

const STATUS: Record<string, { label: string; variant: "neutral" | "brand" | "success" | "danger" }> = {
  draft: { label: "Rascunho", variant: "neutral" },
  sent: { label: "Em aberto", variant: "brand" },
  paid: { label: "Paga", variant: "success" },
  canceled: { label: "Cancelada", variant: "danger" },
};

const isOverdue = (iv: InvoiceListItem) =>
  iv.status === "sent" && iv.dueDate != null && new Date(iv.dueDate).getTime() < Date.now();

export function InvoicesModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [list, setList] = React.useState<InvoiceListItem[] | null>(null);
  const [clients, setClients] = React.useState<Array<{ id: string; name: string }>>([]);
  const [contracts, setContracts] = React.useState<ContractListItem[]>([]);
  const [sel, setSel] = React.useState<string | null>(null);
  const [d, setD] = React.useState<InvoiceDTO | null>(null);
  const [title, setTitle] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [status, setStatus] = React.useState("draft");
  const [amount, setAmount] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [recurrence, setRecurrence] = React.useState("none");
  const [token, setToken] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [fromContract, setFromContract] = React.useState(false);

  const reload = React.useCallback(() => listInvoicesAction(orgId).then(setList), [orgId]);
  React.useEffect(() => {
    reload();
    clientOptionsAction(orgId).then(setClients);
    listContractsAction(orgId).then(setContracts);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orgId, reload, onClose]);

  // Resumo (calculado da lista — sem query extra).
  const totals = React.useMemo(() => {
    const rows = list ?? [];
    const now = new Date();
    let receivable = 0, overdue = 0, paidMonth = 0;
    for (const iv of rows) {
      if (iv.status === "sent") {
        receivable += iv.amountCents;
        if (isOverdue(iv)) overdue += iv.amountCents;
      }
      if (iv.status === "paid" && iv.paidAt) {
        const p = new Date(iv.paidAt);
        if (p.getFullYear() === now.getFullYear() && p.getMonth() === now.getMonth()) paidMonth += iv.amountCents;
      }
    }
    return { receivable, overdue, paidMonth };
  }, [list]);

  function loadInto(iv: InvoiceDTO) {
    setD(iv);
    setSel(iv.id);
    setTitle(iv.title);
    setClientId(iv.clientId ?? "");
    setStatus(iv.status);
    setAmount(toInput(iv.amountCents));
    setDueDate(iv.dueDate ? new Date(iv.dueDate).toISOString().slice(0, 10) : "");
    setDescription(iv.description);
    setRecurrence(iv.recurrence);
    setToken(iv.token);
  }
  async function open(id: string) {
    const iv = await getInvoiceAction(orgId, id);
    if (iv) loadInto(iv);
  }
  async function createNew() {
    const id = await createInvoiceAction(orgId);
    if (!id) return;
    reload();
    open(id);
  }
  async function genFrom(contractId: string) {
    const id = await invoiceFromContractAction(orgId, contractId).catch(() => null);
    setFromContract(false);
    if (id) {
      reload();
      open(id);
    }
  }
  async function save(nextStatus = status) {
    if (!sel || saving) return;
    setSaving(true);
    await updateInvoiceAction(orgId, sel, {
      title,
      description,
      amountCents: toCents(amount),
      clientId: clientId || null,
      status: nextStatus,
      recurrence,
      dueDateIso: dueDate ? new Date(dueDate).toISOString() : null,
    }).catch(() => {});
    setSaving(false);
    setStatus(nextStatus);
    reload();
  }
  async function remove() {
    if (!sel) return;
    await deleteInvoiceAction(orgId, sel);
    setSel(null);
    setD(null);
    reload();
  }
  function copyLink() {
    navigator.clipboard?.writeText(`${window.location.origin}/fatura/${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[86vh] w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lista */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 font-display text-ui font-bold">
              <Wallet className="size-4" /> Financeiro
            </h2>
            <button type="button" onClick={createNew} aria-label="Nova fatura" className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground">
              <Plus className="size-4" />
            </button>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-px border-b border-border bg-border text-center">
            {[
              { l: "A receber", v: totals.receivable, c: "text-brand" },
              { l: "Vencido", v: totals.overdue, c: "text-danger" },
              { l: "Recebido/mês", v: totals.paidMonth, c: "text-success" },
            ].map((s) => (
              <div key={s.l} className="bg-surface px-1 py-2">
                <p className={cn("text-[11px] font-bold tabular-nums", s.c)}>{brl(s.v)}</p>
                <p className="text-[9px] uppercase text-subtle">{s.l}</p>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {list === null ? (
              <p className="p-2 text-dense text-subtle">Carregando…</p>
            ) : list.length === 0 ? (
              <p className="p-2 text-dense text-subtle">Nenhuma fatura.</p>
            ) : (
              list.map((iv) => (
                <button
                  key={iv.id}
                  type="button"
                  onClick={() => open(iv.id)}
                  className={cn("mb-1 flex w-full flex-col gap-1 rounded-md px-2.5 py-2 text-left transition-colors", sel === iv.id ? "bg-brand/10" : "hover:bg-elevated")}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-dense font-medium text-foreground">{iv.title}</span>
                    <Badge variant={isOverdue(iv) ? "danger" : STATUS[iv.status]?.variant ?? "neutral"} size="sm">
                      {isOverdue(iv) ? "Vencida" : STATUS[iv.status]?.label ?? iv.status}
                    </Badge>
                  </span>
                  <span className="flex items-center justify-between text-[11px] text-subtle">
                    <span className="truncate">{no(iv.number)} · {iv.clientName ?? "Sem cliente"}</span>
                    <span className="tabular-nums">{brl(iv.amountCents)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Editor */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="text-dense text-subtle">{sel ? `Editando ${no(d?.number ?? 0)}` : "Selecione ou crie uma fatura"}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setFromContract((v) => !v)} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 h-8 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground">
                <FilePlus2 className="size-3.5" /> Gerar de contrato
              </button>
              <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
          </div>

          {fromContract && (
            <div className="max-h-40 overflow-y-auto border-b border-border bg-canvas p-1">
              {contracts.length === 0 ? (
                <p className="p-2 text-dense text-subtle">Nenhum contrato para gerar.</p>
              ) : (
                contracts.map((c) => (
                  <button key={c.id} type="button" onClick={() => genFrom(c.id)} className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-dense hover:bg-elevated">
                    <span className="truncate text-foreground">{c.title}</span>
                    <span className="shrink-0 tabular-nums text-subtle">{brl(c.valueCents)}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {!sel ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted">
              <Wallet className="size-8 text-subtle" />
              <p className="text-ui">Crie uma fatura ou gere a partir de um contrato.</p>
              <Button onClick={createNew}><Plus className="size-4" /> Nova fatura</Button>
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2 block">
                  <span className="text-dense font-medium text-muted">Título</span>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
                </label>
                <label className="block">
                  <span className="text-dense font-medium text-muted">Valor (R$)</span>
                  <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="mt-1 text-right" />
                </label>
                <label className="block">
                  <span className="text-dense font-medium text-muted">Cliente</span>
                  <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-border bg-canvas px-2 text-ui text-foreground">
                    <option value="">Sem cliente</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-dense font-medium text-muted">Vencimento</span>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
                </label>
                <label className="block">
                  <span className="text-dense font-medium text-muted">Status</span>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-border bg-canvas px-2 text-ui text-foreground">
                    <option value="draft">Rascunho</option>
                    <option value="sent">Em aberto</option>
                    <option value="paid">Paga</option>
                    <option value="canceled">Cancelada</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-dense font-medium text-muted">Recorrência</span>
                  <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-border bg-canvas px-2 text-ui text-foreground">
                    <option value="none">Única</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-dense font-medium text-muted">Descrição / itens</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 h-32 w-full resize-y rounded-md border border-border bg-canvas p-2.5 text-ui text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="O que está sendo cobrado…" />
              </label>
            </div>
          )}

          {sel && (
            <div className="flex items-center gap-2 border-t border-border px-5 py-3">
              <button type="button" onClick={copyLink} className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 h-9 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground">
                {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                {copied ? "Copiado!" : "Copiar link"}
              </button>
              <button type="button" onClick={remove} className="flex size-9 items-center justify-center rounded-md text-subtle hover:text-danger" aria-label="Excluir">
                <Trash2 className="size-4" />
              </button>
              <div className="ml-auto flex items-center gap-2">
                {status !== "paid" && (
                  <Button variant="secondary" onClick={() => save("paid")} disabled={saving}>
                    <Check className="size-4" /> Marcar paga
                  </Button>
                )}
                <Button onClick={() => save()} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
