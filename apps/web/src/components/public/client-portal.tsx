"use client";

import * as React from "react";
import {
  Briefcase,
  CalendarDays,
  Check,
  FileSignature,
  FileText,
  MessageCircleWarning,
  type LucideIcon,
} from "lucide-react";
import type { ClientPortal } from "@wayline/db";
import { Button, Input, cn } from "@wayline/ui";
import { portalApproveAction } from "@/actions/client-portal";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function due(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const PROP_STATUS: Record<string, string> = {
  draft: "Rascunho", sent: "Enviada", accepted: "Aceita", rejected: "Recusada",
};
const CTR_STATUS: Record<string, string> = {
  draft: "Rascunho", sent: "Enviado", signed: "Assinado", canceled: "Cancelado",
};

export function ClientPortalView({
  token,
  portal,
  brandName,
}: {
  token: string;
  portal: ClientPortal;
  brandName: string;
}) {
  const [deliverables, setDeliverables] = React.useState(portal.deliverables);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  // Agrupa entregas por projeto (lista).
  const byProject = React.useMemo(() => {
    const map = new Map<string, typeof deliverables>();
    for (const d of deliverables) {
      const k = d.listName || "Geral";
      const arr = map.get(k) ?? [];
      arr.push(d);
      map.set(k, arr);
    }
    return [...map.entries()];
  }, [deliverables]);

  async function approve(taskId: string, status: "approved" | "changes") {
    if (!name.trim()) return;
    setBusy(taskId + status);
    const ok = await portalApproveAction(token, taskId, status, name).catch(() => false);
    setBusy(null);
    if (ok) {
      setDeliverables((ds) => ds.map((d) => (d.id === taskId ? { ...d, approvalStatus: status } : d)));
    }
  }

  return (
    <div className="min-h-dvh bg-canvas px-4 py-8 text-foreground">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <span
            className="flex size-11 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: portal.color }}
          >
            <Briefcase className="size-5" />
          </span>
          <div>
            <p className="text-dense font-semibold uppercase tracking-wide text-subtle">{brandName}</p>
            <h1 className="font-display text-h2 font-bold leading-tight">{portal.clientName}</h1>
          </div>
        </div>

        {/* Entregas */}
        <Section icon={Check} title="Entregas">
          {deliverables.length === 0 ? (
            <Empty>Nenhuma entrega no momento.</Empty>
          ) : (
            <>
              <label className="mb-3 block">
                <span className="text-dense font-medium text-muted">Seu nome (para aprovar)</span>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como devemos registrar sua aprovação?" className="mt-1" />
              </label>
              <div className="space-y-4">
                {byProject.map(([project, tasks]) => (
                  <div key={project}>
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-subtle">{project}</p>
                    <div className="overflow-hidden rounded-xl border border-border">
                      {tasks.map((t, i) => (
                        <div key={t.id} className={cn("flex flex-wrap items-center gap-3 bg-surface p-3", i > 0 && "border-t border-border")}>
                          <span className="min-w-0 flex-1 text-ui font-medium">{t.title}</span>
                          <span
                            className="inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] font-bold uppercase"
                            style={{ backgroundColor: `${t.statusColor}1f`, color: t.statusColor }}
                          >
                            {t.statusName}
                          </span>
                          {t.dueDate && (
                            <span className="flex items-center gap-1 text-[11px] text-muted">
                              <CalendarDays className="size-3.5" /> {due(t.dueDate)}
                            </span>
                          )}
                          {t.approvalStatus === "approved" ? (
                            <span className="inline-flex items-center gap-1 rounded-pill bg-success/15 px-2.5 py-1 text-dense font-semibold text-success">
                              <Check className="size-3.5" /> Aprovado
                            </span>
                          ) : t.approvalStatus === "changes" ? (
                            <span className="inline-flex items-center gap-1 rounded-pill bg-warning/15 px-2.5 py-1 text-dense font-semibold text-warning">
                              <MessageCircleWarning className="size-3.5" /> Ajustes pedidos
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => approve(t.id, "approved")} disabled={!name.trim() || busy !== null}>
                                <Check className="size-4" /> Aprovar
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => approve(t.id, "changes")} disabled={!name.trim() || busy !== null}>
                                Pedir ajustes
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>

        {/* Propostas */}
        {portal.proposals.length > 0 && (
          <Section icon={FileText} title="Propostas">
            <div className="space-y-2">
              {portal.proposals.map((p) => (
                <DocRow key={p.id} href={`/proposta/${p.token}`} title={p.title} tag={PROP_STATUS[p.status] ?? p.status} />
              ))}
            </div>
          </Section>
        )}

        {/* Contratos */}
        {portal.contracts.length > 0 && (
          <Section icon={FileSignature} title="Contratos">
            <div className="space-y-2">
              {portal.contracts.map((c) => (
                <DocRow
                  key={c.id}
                  href={`/contrato/${c.token}`}
                  title={c.title}
                  tag={CTR_STATUS[c.status] ?? c.status}
                  value={c.valueCents > 0 ? brl(c.valueCents) : undefined}
                />
              ))}
            </div>
          </Section>
        )}

        <p className="mt-8 text-center text-[11px] text-subtle">Portal do cliente · {brandName}</p>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 font-display text-h3 font-bold">
        <Icon className="size-4 text-brand" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border p-4 text-center text-dense text-subtle">{children}</p>
  );
}

function DocRow({ href, title, tag, value }: { href: string; title: string; tag: string; value?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-brand-40"
    >
      <span className="min-w-0 flex-1 text-ui font-medium">{title}</span>
      {value && <span className="text-dense font-semibold text-foreground">{value}</span>}
      <span className="rounded-pill bg-elevated px-2.5 py-0.5 text-[11px] font-semibold text-muted">{tag}</span>
    </a>
  );
}
