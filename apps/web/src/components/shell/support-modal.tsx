"use client";

import * as React from "react";
import {
  ArrowLeft,
  Bug,
  ChevronRight,
  ImagePlus,
  LifeBuoy,
  Lightbulb,
  MessageCircle,
  Plus,
  Send,
  X,
} from "lucide-react";
import type { SupportTicketDTO } from "@wayline/db";
import { Badge, Button, Input, cn } from "@wayline/ui";
import {
  createSupportTicketAction,
  myTicketsAction,
  supportWhatsappUrlAction,
} from "@/actions/support";
import { fileToImageDataUrl } from "@/lib/image-file";
import { SupportThread } from "@/components/shell/support-thread";

const CATEGORIES = [
  { id: "support", label: "Suporte", icon: LifeBuoy },
  { id: "bug", label: "Reportar bug", icon: Bug },
  { id: "idea", label: "Sugestão", icon: Lightbulb },
] as const;

const CAT_LABEL: Record<string, string> = { support: "Suporte", bug: "Bug", idea: "Sugestão" };

type Mode = { view: "list" } | { view: "new" } | { view: "thread"; id: string };

export function SupportModal({
  orgId,
  orgName,
  onClose,
  initialTicketId,
}: {
  orgId: string;
  orgName: string;
  onClose: () => void;
  initialTicketId?: string | null;
}) {
  const [mode, setMode] = React.useState<Mode>(
    initialTicketId ? { view: "thread", id: initialTicketId } : { view: "list" },
  );
  const [tickets, setTickets] = React.useState<SupportTicketDTO[] | null>(null);
  const [whatsapp, setWhatsapp] = React.useState<string | null>(null);

  // Formulário de novo chamado
  const [category, setCategory] = React.useState("support");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [attachment, setAttachment] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reload = React.useCallback(() => myTicketsAction(orgId).then(setTickets), [orgId]);

  React.useEffect(() => {
    reload();
    supportWhatsappUrlAction().then(setWhatsapp);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reload, onClose]);

  async function pick(file?: File) {
    if (!file) return;
    try {
      setAttachment(await fileToImageDataUrl(file, 900));
    } catch {
      /* ignora */
    }
  }

  async function submit() {
    if (!message.trim() || saving) return;
    setSaving(true);
    const ok = await createSupportTicketAction(orgId, orgName, {
      category,
      subject,
      message,
      attachmentUrl: attachment,
    }).catch(() => false);
    setSaving(false);
    if (ok) {
      setSubject("");
      setMessage("");
      setAttachment(null);
      setCategory("support");
      await reload();
      setMode({ view: "list" });
    }
  }

  const title =
    mode.view === "new" ? "Novo chamado" : mode.view === "thread" ? "Conversa" : "Suporte";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[86vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          {mode.view !== "list" && (
            <button
              type="button"
              onClick={() => setMode({ view: "list" })}
              aria-label="Voltar"
              className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <h2 className="flex flex-1 items-center gap-2 font-display text-ui font-bold">
            <LifeBuoy className="size-4" /> {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* LISTA */}
        {mode.view === "list" && (
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-3 transition-colors hover:bg-success/10"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <MessageCircle className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-ui font-semibold text-foreground">Grupo do WhatsApp</p>
                  <p className="text-dense text-muted">Entre na comunidade e fale com a gente.</p>
                </div>
                <span className="shrink-0 rounded-md bg-success px-2.5 py-1 text-dense font-semibold text-white">
                  Entrar
                </span>
              </a>
            )}

            <Button onClick={() => setMode({ view: "new" })} className="w-full">
              <Plus className="size-4" /> Abrir novo chamado
            </Button>

            <div>
              <span className="text-label uppercase text-subtle">Seus chamados</span>
              {tickets === null ? (
                <p className="mt-2 text-dense text-subtle">Carregando…</p>
              ) : tickets.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-border p-4 text-center text-dense text-subtle">
                  Você ainda não abriu chamados.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {tickets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setMode({ view: "thread", id: t.id })}
                      className="group flex w-full items-center gap-3 rounded-lg border border-border bg-canvas p-3 text-left transition-colors hover:border-brand-40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral" size="sm">
                            {CAT_LABEL[t.category] ?? "Suporte"}
                          </Badge>
                          <span className="truncate text-ui font-medium text-foreground">
                            {t.subject || "Chamado"}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-dense text-muted">{t.message}</p>
                      </div>
                      <Badge variant={t.status === "closed" ? "success" : "brand"} size="sm">
                        {t.status === "closed" ? "Resolvido" : "Aberto"}
                      </Badge>
                      <ChevronRight className="size-4 shrink-0 text-subtle" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* NOVO CHAMADO */}
        {mode.view === "new" && (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div>
                <span className="text-dense font-medium text-muted">Sobre o que é?</span>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    const on = category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(c.id)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-dense font-medium transition-colors",
                          on
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border text-muted hover:bg-elevated hover:text-foreground",
                        )}
                      >
                        <Icon className="size-5" />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <span className="text-dense font-medium text-muted">Assunto</span>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Resumo em uma linha"
                  className="mt-1"
                />
              </label>

              <label className="block">
                <span className="text-dense font-medium text-muted">Descrição</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Detalhe o que aconteceu, o que esperava e como reproduzir…"
                  className="mt-1 h-32 w-full resize-y rounded-md border border-border bg-canvas p-2.5 text-ui text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pick(e.target.files?.[0])}
                />
                {attachment ? (
                  <div className="relative inline-block">
                    <img
                      src={attachment}
                      alt="Anexo"
                      className="max-h-32 rounded-md border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-dark text-white"
                      aria-label="Remover anexo"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-md border border-border px-2.5 h-9 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
                  >
                    <ImagePlus className="size-4" /> Anexar print
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
              <p className="text-[11px] text-subtle">Enviado para a equipe da plataforma.</p>
              <Button onClick={submit} disabled={!message.trim() || saving}>
                <Send className="size-4" /> {saving ? "Enviando…" : "Enviar chamado"}
              </Button>
            </div>
          </>
        )}

        {/* THREAD */}
        {mode.view === "thread" && (
          <div className="flex min-h-0 flex-1 flex-col p-5">
            <SupportThread ticketId={mode.id} onChanged={reload} showAutoResolveHint />
          </div>
        )}
      </div>
    </div>
  );
}
