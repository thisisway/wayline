"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import type { AssignedComment } from "@wayline/db";
import { switchList } from "@/actions/org";

function timeAgo(value: Date): string {
  const s = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export function AssignedCommentsDrawer({
  items,
  onClose,
}: {
  items: AssignedComment[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function open(c: AssignedComment) {
    startTransition(async () => {
      if (c.listId) await switchList(c.listId);
      router.push(`/app?task=${c.taskId}`);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-dark/50 animate-fade-in" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-brand" />
            <h2 className="font-display text-h3 font-bold">Assigned Comments</h2>
            <span className="text-dense font-semibold text-muted">{items.length}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="p-4 text-center text-ui text-muted">Nenhum comentário atribuído a você.</p>
          ) : (
            items.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={pending}
                onClick={() => open(c)}
                className="flex w-full flex-col gap-1 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-elevated"
              >
                <p className="line-clamp-2 text-ui text-foreground">{c.body}</p>
                <p className="text-[11px] text-subtle">
                  {c.authorName} · <span className="font-medium">{c.taskTitle}</span> ·{" "}
                  {timeAgo(c.createdAt)}
                </p>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
