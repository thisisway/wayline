"use client";

import * as React from "react";
import { Bug, Check, LifeBuoy, Lightbulb, MessageSquare, RotateCcw, X } from "lucide-react";
import type { SupportTicketDTO } from "@wayline/db";
import { Badge, Button, Input, cn } from "@wayline/ui";
import {
  setSupportAlertWhatsappAction,
  setSupportTicketStatusAction,
  setSupportWhatsappUrlAction,
} from "@/actions/support";
import { SupportThread } from "@/components/shell/support-thread";

const CAT: Record<string, { label: string; icon: typeof Bug; variant: "brand" | "danger" | "success" }> = {
  support: { label: "Suporte", icon: LifeBuoy, variant: "brand" },
  bug: { label: "Bug", icon: Bug, variant: "danger" },
  idea: { label: "Sugestão", icon: Lightbulb, variant: "success" },
};

function timeAgo(value: Date): string {
  const d = new Date(value);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function SupportPanel({
  tickets,
  whatsappUrl,
  alertWhatsapp,
}: {
  tickets: SupportTicketDTO[];
  whatsappUrl: string | null;
  alertWhatsapp: string | null;
}) {
  const [rows, setRows] = React.useState(tickets);
  const [url, setUrl] = React.useState(whatsappUrl ?? "");
  const [savingUrl, setSavingUrl] = React.useState(false);
  const [urlMsg, setUrlMsg] = React.useState<string | null>(null);
  const [alertNum, setAlertNum] = React.useState(alertWhatsapp ?? "");
  const [savingAlert, setSavingAlert] = React.useState(false);
  const [alertMsg, setAlertMsg] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"open" | "all">("open");
  const [openId, setOpenId] = React.useState<string | null>(null);

  async function saveUrl() {
    setSavingUrl(true);
    const ok = await setSupportWhatsappUrlAction(url).catch(() => false);
    setSavingUrl(false);
    setUrlMsg(ok ? "Link salvo." : "Link inválido (use http(s)://).");
    setTimeout(() => setUrlMsg(null), 2500);
  }

  async function saveAlert() {
    setSavingAlert(true);
    const ok = await setSupportAlertWhatsappAction(alertNum).catch(() => false);
    setSavingAlert(false);
    setAlertMsg(ok ? "Número salvo." : "Número inválido (use DDI+DDD, ex.: 5511999999999).");
    setTimeout(() => setAlertMsg(null), 2500);
  }

  async function toggle(t: SupportTicketDTO) {
    const next = t.status === "open" ? "closed" : "open";
    setRows((rs) => rs.map((r) => (r.id === t.id ? { ...r, status: next } : r)));
    await setSupportTicketStatusAction(t.id, next).catch(() => {});
  }

  const shown = rows.filter((t) => (filter === "open" ? t.status === "open" : true));
  const openCount = rows.filter((t) => t.status === "open").length;

  return (
    <div>
      <h2 className="mb-1 font-display text-h2 font-bold">Suporte</h2>
      <p className="mb-6 text-dense text-muted">
        Chamados abertos pelos usuários (suporte, bugs e sugestões) e o link do grupo de WhatsApp.
      </p>

      {/* Config do WhatsApp */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-2 text-label uppercase text-subtle">Grupo do WhatsApp</h3>
        <div className="flex items-center gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://chat.whatsapp.com/…"
            className="flex-1"
          />
          <Button onClick={saveUrl} disabled={savingUrl}>
            {savingUrl ? "Salvando…" : "Salvar link"}
          </Button>
        </div>
        {urlMsg && <p className="mt-1.5 text-dense text-muted">{urlMsg}</p>}
        <p className="mt-1.5 text-[11px] text-subtle">
          Aparece como botão “Entrar” no modal de Suporte dos usuários. Deixe vazio para ocultar.
        </p>
      </div>

      {/* Número de alerta (novo chamado) */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-2 text-label uppercase text-subtle">Alerta de novo chamado (WhatsApp)</h3>
        <div className="flex items-center gap-2">
          <Input
            value={alertNum}
            onChange={(e) => setAlertNum(e.target.value)}
            placeholder="5511999999999 (DDI + DDD + número)"
            className="flex-1"
          />
          <Button onClick={saveAlert} disabled={savingAlert}>
            {savingAlert ? "Salvando…" : "Salvar número"}
          </Button>
        </div>
        {alertMsg && <p className="mt-1.5 text-dense text-muted">{alertMsg}</p>}
        <p className="mt-1.5 text-[11px] text-subtle">
          Recebe uma mensagem a cada chamado aberto. Requer as envs do WhatsApp Cloud API
          (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID). Deixe vazio para desativar.
        </p>
      </div>

      {/* Filtro */}
      <div className="mb-3 flex items-center gap-2">
        {(["open", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-3 h-8 text-dense font-medium transition-colors",
              filter === f ? "bg-brand/10 text-brand" : "text-muted hover:bg-elevated",
            )}
          >
            {f === "open" ? `Abertos (${openCount})` : `Todos (${rows.length})`}
          </button>
        ))}
      </div>

      {/* Lista */}
      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-dense text-subtle">
          {filter === "open" ? "Nenhum chamado aberto. 🎉" : "Nenhum chamado ainda."}
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((t) => {
            const cat = CAT[t.category] ?? CAT.support!;
            const Icon = cat.icon;
            const closed = t.status === "closed";
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-xl border border-border bg-surface p-4",
                  closed && "opacity-60",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={cat.variant} size="sm">
                        {cat.label}
                      </Badge>
                      {t.subject && (
                        <span className="text-ui font-semibold text-foreground">{t.subject}</span>
                      )}
                      {closed && (
                        <Badge variant="neutral" size="sm">
                          Resolvido
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-dense text-foreground">{t.message}</p>
                    {t.attachmentUrl && (
                      <img
                        src={t.attachmentUrl}
                        alt="Anexo"
                        className="mt-2 max-h-40 rounded-lg border border-border"
                      />
                    )}
                    <p className="mt-2 text-[11px] text-subtle">
                      {t.userName || "Alguém"}
                      {t.userEmail && ` · ${t.userEmail}`}
                      {t.orgName && ` · ${t.orgName}`} · {timeAgo(t.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button size="sm" onClick={() => setOpenId(t.id)}>
                      <MessageSquare className="size-4" /> Responder
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => toggle(t)}>
                      {closed ? (
                        <>
                          <RotateCcw className="size-4" /> Reabrir
                        </>
                      ) : (
                        <>
                          <Check className="size-4" /> Resolver
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal da conversa */}
      {openId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
          onClick={() => setOpenId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setOpenId(null)}
                aria-label="Fechar"
                className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <SupportThread ticketId={openId} onChanged={() => { /* status muda no card ao fechar */ }} />
          </div>
        </div>
      )}
    </div>
  );
}
