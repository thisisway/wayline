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
import { ImageIcon, MessageSquare, Wallet, X } from "lucide-react";
import type { AnnotationDTO, ClientPortal, PublicCommentDTO } from "@wayline/db";
import { Button, Input, cn } from "@wayline/ui";
import {
  portalAddAnnotationAction,
  portalAddCommentAction,
  portalAnnotationsAction,
  portalApproveAction,
  portalCommentsAction,
  portalImagesAction,
  type ProofImage,
} from "@/actions/client-portal";

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
const INV_STATUS: Record<string, string> = {
  draft: "Rascunho", sent: "Em aberto", paid: "Paga", canceled: "Cancelada",
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
  const [proofTask, setProofTask] = React.useState<string | null>(null);

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
                        <div key={t.id} className={cn("bg-surface", i > 0 && "border-t border-border")}>
                        <div className="flex flex-wrap items-center gap-3 p-3">
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
                          {t.imageCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setProofTask(t.id)}
                              className="flex items-center gap-1 rounded-md border border-border px-2 h-7 text-[11px] font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
                            >
                              <ImageIcon className="size-3.5" /> Revisar criativo ({t.imageCount})
                            </button>
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
                        <TaskComments token={token} taskId={t.id} authorName={name} />
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

        {/* Faturas */}
        {portal.invoices.length > 0 && (
          <Section icon={Wallet} title="Faturas">
            <div className="space-y-2">
              {portal.invoices.map((iv) => (
                <DocRow
                  key={iv.id}
                  href={`/fatura/${iv.token}`}
                  title={iv.title}
                  tag={INV_STATUS[iv.status] ?? iv.status}
                  value={iv.valueCents > 0 ? brl(iv.valueCents) : undefined}
                />
              ))}
            </div>
          </Section>
        )}

        <p className="mt-8 text-center text-[11px] text-subtle">Portal do cliente · {brandName}</p>
      </div>

      {proofTask && (
        <ProofViewer token={token} taskId={proofTask} authorName={name} onClose={() => setProofTask(null)} />
      )}
    </div>
  );
}

/** Visualizador de proofing: imagem + pins de anotação clicáveis. */
function ProofViewer({
  token,
  taskId,
  authorName,
  onClose,
}: {
  token: string;
  taskId: string;
  authorName: string;
  onClose: () => void;
}) {
  const [images, setImages] = React.useState<ProofImage[] | null>(null);
  const [idx, setIdx] = React.useState(0);
  const [pins, setPins] = React.useState<AnnotationDTO[]>([]);
  const [draft, setDraft] = React.useState<{ x: number; y: number } | null>(null);
  const [body, setBody] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [active, setActive] = React.useState<string | null>(null);

  const current = images?.[idx];

  React.useEffect(() => {
    portalImagesAction(token, taskId).then(setImages);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [token, taskId, onClose]);

  React.useEffect(() => {
    if (current) portalAnnotationsAction(token, taskId, current.id).then(setPins);
    setDraft(null);
    setActive(null);
  }, [current, token, taskId]);

  function onImageClick(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setDraft({ x, y });
    setBody("");
  }

  async function saveDraft() {
    if (!draft || !current || !body.trim() || !authorName.trim() || saving) return;
    setSaving(true);
    const created = await portalAddAnnotationAction({
      token, taskId, attachmentId: current.id, x: draft.x, y: draft.y, name: authorName, body,
    }).catch(() => null);
    setSaving(false);
    if (created) {
      setPins((p) => [...p, created]);
      setDraft(null);
      setBody("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/70 p-4 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Imagem + pins */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-canvas p-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-md bg-surface/80 text-subtle backdrop-blur hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          {images === null ? (
            <p className="text-dense text-subtle">Carregando…</p>
          ) : !current ? (
            <p className="text-dense text-subtle">Nenhuma imagem nesta entrega.</p>
          ) : (
            <div className="relative inline-block max-h-full" onClick={onImageClick}>
              <img src={current.url} alt={current.fileName} className="max-h-[80vh] w-auto cursor-crosshair select-none rounded-md" />
              {pins.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActive(active === p.id ? null : p.id); }}
                  className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white ring-2 ring-white"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  title={p.body}
                >
                  {i + 1}
                </button>
              ))}
              {draft && (
                <span className="wl-pulse-ring absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/60" style={{ left: `${draft.x}%`, top: `${draft.y}%` }} />
              )}
            </div>
          )}
        </div>

        {/* Painel de anotações */}
        <div className="flex w-full shrink-0 flex-col border-t border-border md:w-80 md:border-l md:border-t-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-ui font-bold">Revisão</p>
            <p className="text-[11px] text-subtle">Clique na imagem para marcar um ponto.</p>
          </div>

          {/* thumbnails */}
          {images && images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-b border-border p-2">
              {images.map((im, i) => (
                <button key={im.id} type="button" onClick={() => setIdx(i)} className={cn("h-12 w-12 shrink-0 overflow-hidden rounded border-2", i === idx ? "border-brand" : "border-transparent")}>
                  <img src={im.url} alt={im.fileName} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {pins.length === 0 ? (
              <p className="text-dense text-subtle">Sem anotações ainda.</p>
            ) : (
              pins.map((p, i) => (
                <div key={p.id} className={cn("rounded-lg border p-2", active === p.id ? "border-brand bg-brand/5" : "border-border")}>
                  <p className="text-[11px] font-semibold text-muted">
                    <span className="mr-1 inline-flex size-4 items-center justify-center rounded-full bg-brand text-[9px] text-white">{i + 1}</span>
                    {p.name}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-dense text-foreground">{p.body}</p>
                </div>
              ))
            )}
          </div>

          {/* Form do pin em rascunho */}
          {draft && (
            <div className="space-y-2 border-t border-border p-3">
              <p className="text-[11px] font-medium text-muted">Comentário para o ponto marcado</p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={authorName.trim() ? "O que ajustar aqui?" : "Informe seu nome no portal para anotar"}
                disabled={!authorName.trim()}
                className="h-16 w-full resize-none rounded-md border border-border bg-canvas p-2 text-dense text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setDraft(null)}>Cancelar</Button>
                <Button size="sm" onClick={saveDraft} disabled={!body.trim() || !authorName.trim() || saving}>Adicionar</Button>
              </div>
            </div>
          )}
        </div>
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

function TaskComments({ token, taskId, authorName }: { token: string; taskId: string; authorName: string }) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<PublicCommentDTO[] | null>(null);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (open && items === null) portalCommentsAction(token, taskId).then(setItems);
  }, [open, items, token, taskId]);

  async function send() {
    if (!body.trim() || !authorName.trim() || sending) return;
    setSending(true);
    const c = await portalAddCommentAction(token, taskId, authorName, body).catch(() => null);
    setSending(false);
    if (c) {
      setItems((xs) => [...(xs ?? []), c]);
      setBody("");
    }
  }

  return (
    <div className="border-t border-border/60 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-dense font-medium text-muted transition-colors hover:text-foreground"
      >
        <MessageSquare className="size-3.5" />
        {open ? "Ocultar comentários" : "Comentários"}
        {items && items.length > 0 && <span className="text-subtle">({items.length})</span>}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {items === null ? (
            <p className="text-[11px] text-subtle">Carregando…</p>
          ) : (
            items.map((c) => (
              <div key={c.id} className="rounded-lg bg-canvas px-3 py-2">
                <p className="text-[11px] font-semibold text-muted">
                  {c.name} · {new Date(c.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="whitespace-pre-wrap text-dense text-foreground">{c.body}</p>
              </div>
            ))
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={authorName.trim() ? "Escreva um comentário…" : "Informe seu nome acima para comentar"}
              disabled={!authorName.trim()}
              className="h-14 flex-1 resize-none rounded-md border border-border bg-canvas p-2 text-dense text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
            <Button size="sm" onClick={send} disabled={!body.trim() || !authorName.trim() || sending}>
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
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
