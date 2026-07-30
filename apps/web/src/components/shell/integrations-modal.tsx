"use client";

import * as React from "react";
import { Check, Copy, Plug, Plus, Send, Trash2, X } from "lucide-react";
import { Button, Input, cn } from "@wayline/ui";
import type { IntegrationDTO, IntegrationKind } from "@wayline/db";
import {
  createIntegrationAction,
  deleteIntegrationAction,
  listIntegrationsAction,
  testIntegrationAction,
  updateIntegrationAction,
} from "@/actions/integrations";

// Espelha INTEGRATION_EVENTS do @wayline/db — mantido local p/ não puxar o
// pacote server (postgres/crypto) para o bundle client.
const INTEGRATION_EVENTS = ["task.completed", "proposal.accepted", "contract.signed", "invoice.paid"] as const;

const EVENT_LABEL: Record<string, string> = {
  "task.completed": "Tarefa concluída",
  "proposal.accepted": "Proposta aceita",
  "contract.signed": "Contrato assinado",
  "invoice.paid": "Fatura paga",
};

const KIND_LABEL: Record<IntegrationKind, string> = {
  webhook: "Webhook",
  slack: "Slack",
  discord: "Discord",
};

const URL_HINT: Record<IntegrationKind, string> = {
  webhook: "https://seu-endpoint.com/webhook",
  slack: "https://hooks.slack.com/services/…",
  discord: "https://discord.com/api/webhooks/…",
};

export function IntegrationsModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [items, setItems] = React.useState<IntegrationDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [kind, setKind] = React.useState<IntegrationKind>("webhook");
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [events, setEvents] = React.useState<string[]>([...INTEGRATION_EVENTS]);
  const [busy, setBusy] = React.useState(false);
  const [testMsg, setTestMsg] = React.useState<Record<string, string>>({});
  const [copied, setCopied] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    listIntegrationsAction(orgId)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    reload();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, reload]);

  function toggleEvent(ev: string) {
    setEvents((s) => (s.includes(ev) ? s.filter((x) => x !== ev) : [...s, ev]));
  }

  async function add() {
    if (!/^https:\/\//i.test(url.trim()) || events.length === 0 || busy) return;
    setBusy(true);
    const ok = await createIntegrationAction(orgId, { kind, name, url: url.trim(), events }).catch(() => false);
    setBusy(false);
    if (ok) {
      setAdding(false);
      setName("");
      setUrl("");
      setEvents([...INTEGRATION_EVENTS]);
      setKind("webhook");
      reload();
    }
  }

  async function toggleActive(it: IntegrationDTO) {
    setItems((s) => s.map((x) => (x.id === it.id ? { ...x, active: !x.active } : x)));
    await updateIntegrationAction(orgId, it.id, { active: !it.active }).catch(() => {});
  }

  async function remove(id: string) {
    setItems((s) => s.filter((x) => x.id !== id));
    await deleteIntegrationAction(orgId, id).catch(() => {});
  }

  async function test(id: string) {
    setTestMsg((s) => ({ ...s, [id]: "…" }));
    const status = await testIntegrationAction(orgId, id).catch(() => "error");
    setTestMsg((s) => ({ ...s, [id]: status }));
    reload();
  }

  function copySecret(secret: string, id: string) {
    navigator.clipboard?.writeText(secret).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 font-display text-h3 font-bold">
            <Plug className="size-4" /> Integrações
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-4 text-dense text-muted">
            Envie eventos do Wayline (tarefa concluída, proposta aceita, fatura paga…) para um webhook, canal do Slack ou Discord. Conecte Zapier/Make/n8n via webhook.
          </p>

          {loading ? (
            <p className="py-6 text-center text-dense text-subtle">Carregando…</p>
          ) : items.length === 0 && !adding ? (
            <p className="py-6 text-center text-dense text-subtle">Nenhuma integração ainda.</p>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="rounded-lg border border-border bg-canvas p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-ui font-semibold text-foreground">
                        {it.name}
                        <span className="rounded-pill bg-elevated px-2 py-0.5 text-[10px] font-bold uppercase text-subtle">{KIND_LABEL[it.kind]}</span>
                        {!it.active && <span className="text-[10px] font-bold uppercase text-subtle">pausada</span>}
                      </p>
                      <p className="mt-0.5 truncate text-dense text-subtle">{it.url}</p>
                      <p className="mt-1 flex flex-wrap gap-1">
                        {it.events.map((ev) => (
                          <span key={ev} className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand">{EVENT_LABEL[ev] ?? ev}</span>
                        ))}
                      </p>
                      {it.kind === "webhook" && (
                        <button type="button" onClick={() => copySecret(it.secret, it.id)} className="mt-1.5 flex items-center gap-1 text-[11px] text-subtle hover:text-foreground">
                          {copied === it.id ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                          {copied === it.id ? "Segredo copiado" : "Copiar segredo de assinatura"}
                        </button>
                      )}
                      {(testMsg[it.id] || it.lastStatus) && (
                        <p className={cn("mt-1 text-[11px]", (testMsg[it.id] ?? it.lastStatus ?? "").startsWith("2") ? "text-success" : "text-subtle")}>
                          Última entrega: {testMsg[it.id] ?? it.lastStatus}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => test(it.id)} title="Enviar teste" className="flex size-7 items-center justify-center rounded text-subtle hover:bg-elevated hover:text-foreground">
                        <Send className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => toggleActive(it)} title={it.active ? "Pausar" : "Ativar"} className={cn("h-5 w-9 rounded-full p-0.5 transition-colors", it.active ? "bg-brand" : "bg-elevated")}>
                        <span className={cn("block size-4 rounded-full bg-white transition-transform", it.active && "translate-x-4")} />
                      </button>
                      <button type="button" onClick={() => remove(it.id)} title="Excluir" className="flex size-7 items-center justify-center rounded text-subtle hover:bg-elevated hover:text-danger">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {adding ? (
            <div className="mt-3 space-y-3 rounded-lg border border-border bg-canvas p-4">
              <div className="flex gap-1 rounded-lg border border-border p-0.5">
                {(["webhook", "slack", "discord"] as IntegrationKind[]).map((k) => (
                  <button key={k} type="button" onClick={() => setKind(k)}
                    className={cn("flex-1 rounded-md px-3 h-8 text-dense font-medium transition-colors", kind === k ? "bg-brand text-white" : "text-muted hover:text-foreground")}>
                    {KIND_LABEL[k]}
                  </button>
                ))}
              </div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (ex.: Canal #vendas)" />
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={URL_HINT[kind]} />
              <div>
                <p className="mb-1.5 text-dense font-medium text-muted">Eventos</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {INTEGRATION_EVENTS.map((ev) => (
                    <label key={ev} className="flex cursor-pointer items-center gap-2 text-dense text-foreground">
                      <input type="checkbox" checked={events.includes(ev)} onChange={() => toggleEvent(ev)} className="accent-brand" />
                      {EVENT_LABEL[ev]}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={add} disabled={busy || !/^https:\/\//i.test(url.trim()) || events.length === 0}>
                  {busy ? "Salvando…" : "Adicionar"}
                </Button>
                <button type="button" onClick={() => setAdding(false)} className="text-dense text-subtle hover:text-foreground">Cancelar</button>
                {url && !/^https:\/\//i.test(url.trim()) && <span className="text-[11px] text-danger">A URL precisa ser HTTPS.</span>}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)}
              className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-dense text-muted hover:border-brand-40 hover:text-foreground">
              <Plus className="size-4" /> Nova integração
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
