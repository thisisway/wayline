"use client";

import * as React from "react";
import { Clock, ImagePlus, Send, X } from "lucide-react";
import type { TicketThread } from "@wayline/db";
import { Badge, Button, cn } from "@wayline/ui";
import { replyTicketAction, ticketThreadAction } from "@/actions/support";
import { fileToImageDataUrl } from "@/lib/image-file";

const CAT_LABEL: Record<string, string> = { support: "Suporte", bug: "Bug", idea: "Sugestão" };
const AUTO_RESOLVE_HOURS = 42;

function when(d: Date): string {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Conversa de um chamado. Reutilizado no modal do usuário e no painel admin. */
export function SupportThread({
  ticketId,
  onChanged,
  showAutoResolveHint = false,
}: {
  ticketId: string;
  onChanged?: () => void;
  showAutoResolveHint?: boolean;
}) {
  const [thread, setThread] = React.useState<TicketThread | null>(null);
  const [body, setBody] = React.useState("");
  const [attachment, setAttachment] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(() => {
    ticketThreadAction(ticketId).then(setThread);
  }, [ticketId]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length]);

  async function pick(file?: File) {
    if (!file) return;
    try {
      setAttachment(await fileToImageDataUrl(file, 900));
    } catch {
      /* ignora arquivos inválidos */
    }
  }

  async function send() {
    if (sending || (!body.trim() && !attachment)) return;
    setSending(true);
    const ok = await replyTicketAction(ticketId, body, attachment).catch(() => false);
    setSending(false);
    if (ok) {
      setBody("");
      setAttachment(null);
      load();
      onChanged?.();
    }
  }

  if (!thread) {
    return <p className="p-4 text-center text-dense text-subtle">Carregando…</p>;
  }

  const { ticket, messages } = thread;
  const closed = ticket.status === "closed";

  // Aviso de auto-resolução: última mensagem do suporte, chamado aberto.
  const last = messages[messages.length - 1];
  const awaitingUser = !closed && !!last && last.isAdmin;
  let hoursLeft = 0;
  if (awaitingUser && last) {
    const elapsed = (Date.now() - new Date(last.createdAt).getTime()) / 3_600_000;
    hoursLeft = Math.max(0, Math.ceil(AUTO_RESOLVE_HOURS - elapsed));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 border-b border-border px-1 pb-2">
        <Badge variant="neutral" size="sm">
          {CAT_LABEL[ticket.category] ?? "Suporte"}
        </Badge>
        <span className="truncate text-ui font-semibold text-foreground">
          {ticket.subject || "Chamado"}
        </span>
        <Badge variant={closed ? "success" : "brand"} size="sm">
          {closed ? "Resolvido" : "Aberto"}
        </Badge>
      </div>

      {/* Mensagens */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-3">
        {/* Mensagem inicial */}
        <Bubble
          admin={false}
          author={ticket.userName || "Você"}
          body={ticket.message}
          attachment={ticket.attachmentUrl}
          at={ticket.createdAt}
        />
        {messages.map((m) => (
          <Bubble
            key={m.id}
            admin={m.isAdmin}
            author={m.authorName}
            body={m.body}
            attachment={m.attachmentUrl}
            at={m.createdAt}
          />
        ))}
        <div ref={endRef} />
      </div>

      {/* Aviso de auto-resolução (só para o usuário) */}
      {showAutoResolveHint && awaitingUser && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-dense text-muted">
          <Clock className="size-4 shrink-0 text-warning" />
          <span>
            Este chamado será resolvido automaticamente em ~{hoursLeft}h se você não responder.
          </span>
        </div>
      )}

      {/* Resposta */}
      <div className="border-t border-border pt-2">
        {attachment && (
          <div className="relative mb-2 inline-block">
            <img src={attachment} alt="Anexo" className="max-h-24 rounded-md border border-border" />
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-dark text-white"
              aria-label="Remover anexo"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
            placeholder="Escreva uma resposta…"
            className="h-16 flex-1 resize-none rounded-md border border-border bg-canvas p-2.5 text-ui text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Anexar imagem/print"
            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-muted hover:bg-elevated hover:text-foreground"
          >
            <ImagePlus className="size-4" />
          </button>
          <Button onClick={send} disabled={sending || (!body.trim() && !attachment)} className="shrink-0">
            <Send className="size-4" /> {sending ? "…" : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  admin,
  author,
  body,
  attachment,
  at,
}: {
  admin: boolean;
  author: string;
  body: string;
  attachment: string | null;
  at: Date;
}) {
  return (
    <div className={cn("flex", admin ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2",
          admin ? "bg-elevated text-foreground" : "bg-brand/10 text-foreground",
        )}
      >
        <p className="mb-0.5 text-[11px] font-semibold text-muted">
          {admin ? "Suporte" : author} · {when(at)}
        </p>
        {body && <p className="whitespace-pre-wrap text-dense">{body}</p>}
        {attachment && (
          <img
            src={attachment}
            alt="Anexo"
            className="mt-2 max-h-64 rounded-lg border border-border"
          />
        )}
      </div>
    </div>
  );
}
