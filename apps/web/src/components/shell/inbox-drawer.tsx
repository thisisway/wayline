"use client";

import * as React from "react";
import { CheckCheck, Inbox, MessageSquare, UserPlus, X } from "lucide-react";
import type { NotificationDTO } from "@wayline/db";
import { cn } from "@wayline/ui";
import { markInboxReadAction, switchList } from "@/actions/org";

function timeAgo(value: Date): string {
  const s = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function message(n: NotificationDTO): string {
  if (n.type === "comment") return `${n.actorName} comentou em`;
  if (n.type === "assigned") return `${n.actorName} atribuiu você a`;
  return `${n.actorName} atualizou`;
}

export function InboxDrawer({
  orgId,
  items,
  onClose,
}: {
  orgId: string;
  items: NotificationDTO[];
  onClose: () => void;
}) {
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function open(n: NotificationDTO) {
    startTransition(() => {
      void markInboxReadAction(orgId);
      if (n.listId) void switchList(n.listId);
      onClose();
    });
  }

  function markAll() {
    startTransition(() => void markInboxReadAction(orgId));
  }

  const hasUnread = items.some((i) => !i.read);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-dark/50 animate-fade-in" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Inbox className="size-5 text-brand" />
            <h2 className="font-display text-h3 font-bold">Inbox</h2>
          </div>
          <div className="flex items-center gap-1">
            {hasUnread && (
              <button
                type="button"
                onClick={markAll}
                disabled={pending}
                className="flex items-center gap-1 rounded-md px-2 h-8 text-dense text-muted hover:bg-elevated hover:text-foreground"
              >
                <CheckCheck className="size-4" /> Marcar lidas
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="p-4 text-center text-ui text-muted">Nada por aqui ainda.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                disabled={pending}
                onClick={() => open(n)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-elevated",
                  !n.read && "bg-brand/[0.06]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                    n.type === "comment" ? "bg-brand/15 text-brand" : "bg-success/15 text-success",
                  )}
                >
                  {n.type === "comment" ? (
                    <MessageSquare className="size-4" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-dense text-foreground">
                    {message(n)} <span className="font-semibold">{n.taskTitle}</span>
                  </p>
                  <p className="text-[11px] text-subtle">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
