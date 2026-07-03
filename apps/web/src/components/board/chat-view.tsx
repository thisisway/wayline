"use client";

import * as React from "react";
import { Send } from "lucide-react";
import type { ChatMessage } from "@wayline/db";
import { Avatar, Button, cn } from "@wayline/ui";
import { listChatAction, sendChatAction } from "@/actions/chat";

function timeLabel(value: Date): string {
  const d = new Date(value);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Chat da lista (discussão do board), realtime via SSE ('chat'). */
export function ChatView({
  orgId,
  listId,
  currentUserId,
}: {
  orgId: string;
  listId: string;
  currentUserId: string | null;
}) {
  const [messages, setMessages] = React.useState<ChatMessage[] | null>(null);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const append = React.useCallback((m: ChatMessage) => {
    setMessages((prev) => {
      const list = prev ?? [];
      return list.some((x) => x.id === m.id) ? list : [...list, m];
    });
  }, []);

  // Carga inicial + assinatura realtime.
  React.useEffect(() => {
    let alive = true;
    listChatAction(orgId, listId).then((m) => alive && setMessages(m));

    const es = new EventSource(`/api/live?listId=${encodeURIComponent(listId)}`);
    es.addEventListener("chat", (e) => {
      try {
        append(JSON.parse((e as MessageEvent).data));
      } catch {
        /* ignora */
      }
    });
    return () => {
      alive = false;
      es.close();
    };
  }, [orgId, listId, append]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setBody("");
    try {
      const msg = await sendChatAction(orgId, listId, text);
      if (msg) append(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages === null ? (
          <p className="text-center text-dense text-subtle">Carregando…</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-ui text-muted">
            Nenhuma mensagem ainda. Comece a conversa sobre este board.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.author.id === currentUserId;
            return (
              <div key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
                <Avatar name={m.author.name} src={m.author.avatarUrl ?? undefined} size="sm" />
                <div className={cn("max-w-[75%]", mine && "items-end text-right")}>
                  <div className={cn("flex items-center gap-2", mine && "flex-row-reverse")}>
                    <span className="text-dense font-semibold text-foreground">
                      {mine ? "Você" : m.author.name}
                    </span>
                    <span className="text-[11px] text-subtle">{timeLabel(m.createdAt)}</span>
                  </div>
                  <div
                    className={cn(
                      "mt-1 inline-block whitespace-pre-wrap rounded-lg px-3 py-2 text-ui",
                      mine ? "bg-brand text-white" : "bg-elevated text-foreground",
                    )}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={currentUserId ? "Escreva uma mensagem…" : "Sem usuário"}
          disabled={!currentUserId || sending}
          className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-ui text-foreground outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          type="button"
          size="icon"
          onClick={() => void submit()}
          disabled={!currentUserId || sending || body.trim().length === 0}
          aria-label="Enviar"
        >
          <Send />
        </Button>
      </div>
    </div>
  );
}
