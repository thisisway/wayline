"use client";

import * as React from "react";
import { Trash2, UserPlus, X } from "lucide-react";
import type { WorkspaceMember } from "@wayline/db";
import { Avatar, Badge, Button, Input, cn } from "@wayline/ui";
import { addMemberAction, listMembersAction, removeMemberAction } from "@/actions/org";

const STATUS_MSG: Record<string, { text: string; ok: boolean }> = {
  added: { text: "Membro adicionado.", ok: true },
  already: { text: "Esse usuário já é membro.", ok: false },
  not_found: { text: "Nenhum usuário com esse email. Peça para criar uma conta primeiro.", ok: false },
};

export function MembersModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [members, setMembers] = React.useState<WorkspaceMember[] | null>(null);
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ text: string; ok: boolean } | null>(null);

  const reload = React.useCallback(() => {
    listMembersAction(orgId).then(setMembers);
  }, [orgId]);

  React.useEffect(() => {
    reload();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reload, onClose]);

  async function add() {
    const value = email.trim();
    if (!value || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const status = await addMemberAction(orgId, value);
      setMsg(STATUS_MSG[status] ?? null);
      if (status === "added") {
        setEmail("");
        reload();
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    await removeMemberAction(orgId, userId);
    reload();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-display text-h3 font-bold">Membros do workspace</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2 border-b border-border p-5">
          <div className="flex items-center gap-2">
            <Input
              type="email"
              value={email}
              placeholder="email@doteammate.com"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Button onClick={add} disabled={!email.trim() || busy}>
              <UserPlus className="size-4" />
              Adicionar
            </Button>
          </div>
          {msg && (
            <p className={cn("text-dense", msg.ok ? "text-success" : "text-muted")}>{msg.text}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {members === null ? (
            <p className="p-2 text-dense text-subtle">Carregando…</p>
          ) : (
            members.map((m) => (
              <div
                key={m.userId}
                className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-elevated"
              >
                <Avatar name={m.name} src={m.avatarUrl ?? undefined} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ui font-medium text-foreground">{m.name}</p>
                  <p className="truncate text-dense text-subtle">{m.email}</p>
                </div>
                <Badge variant={m.role === "owner" ? "brand" : "neutral"} size="sm">
                  {m.role}
                </Badge>
                {m.role !== "owner" && (
                  <button
                    type="button"
                    onClick={() => remove(m.userId)}
                    aria-label={`Remover ${m.name}`}
                    className="flex size-7 items-center justify-center rounded-md text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
