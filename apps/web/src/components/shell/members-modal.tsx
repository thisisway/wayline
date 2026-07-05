"use client";

import * as React from "react";
import { Check, Copy, Link2, Trash2, UserPlus, X } from "lucide-react";
import type { InvitationDTO, WorkspaceMember } from "@wayline/db";
import { Avatar, Badge, Button, Input, cn } from "@wayline/ui";
import { addMemberAction, listMembersAction, removeMemberAction } from "@/actions/org";
import {
  createInviteAction,
  listInvitesAction,
  revokeInviteAction,
  sendInviteByEmailAction,
} from "@/actions/invitations";

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
          <InviteSection orgId={orgId} />
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

function InviteSection({ orgId }: { orgId: string }) {
  const [invites, setInvites] = React.useState<InvitationDTO[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [emailMsg, setEmailMsg] = React.useState<{ text: string; ok: boolean } | null>(null);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    listInvitesAction(orgId).then(setInvites);
  }, [orgId]);

  async function sendByEmail() {
    const to = inviteEmail.trim();
    if (!to || sending) return;
    setSending(true);
    setEmailMsg(null);
    try {
      const status = await sendInviteByEmailAction(orgId, to);
      const map: Record<string, { text: string; ok: boolean }> = {
        sent: { text: `Convite enviado para ${to}.`, ok: true },
        disabled: { text: "Email não configurado neste ambiente.", ok: false },
        forbidden: { text: "Sem permissão.", ok: false },
        error: { text: "Não foi possível enviar. Tente o link.", ok: false },
      };
      setEmailMsg(map[status] ?? null);
      if (status === "sent") {
        setInviteEmail("");
        listInvitesAction(orgId).then(setInvites);
      }
    } finally {
      setSending(false);
    }
  }

  const linkFor = (token: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/invite/${token}` : "";

  async function generate() {
    if (busy) return;
    setBusy(true);
    try {
      const invite = await createInviteAction(orgId);
      if (invite) {
        setInvites((v) => [invite, ...(v ?? [])]);
        await copy(invite.token);
      }
    } finally {
      setBusy(false);
    }
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(linkFor(token));
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 1500);
    } catch {
      /* clipboard indisponível */
    }
  }

  async function revoke(id: string) {
    setInvites((v) => (v ?? []).filter((i) => i.id !== id));
    await revokeInviteAction(orgId, id).catch(() => {});
  }

  return (
    <div className="mt-1 space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-dense text-subtle">
          <Link2 className="size-3.5" /> Convite por link
        </span>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="text-dense font-medium text-brand hover:underline disabled:opacity-50"
        >
          {busy ? "Gerando…" : "Gerar link"}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="email"
          value={inviteEmail}
          placeholder="Enviar convite por email…"
          onChange={(e) => setInviteEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendByEmail()}
          className="h-9"
        />
        <Button
          variant="secondary"
          onClick={sendByEmail}
          disabled={!inviteEmail.trim() || sending}
        >
          {sending ? "Enviando…" : "Enviar"}
        </Button>
      </div>
      {emailMsg && (
        <p className={cn("text-dense", emailMsg.ok ? "text-success" : "text-muted")}>
          {emailMsg.text}
        </p>
      )}

      {invites && invites.length > 0 && (
        <div className="space-y-1">
          {invites.map((i) => (
            <div
              key={i.id}
              className="group flex items-center gap-2 rounded-md bg-elevated/60 px-2 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted">
                /invite/{i.token.slice(0, 10)}…
              </span>
              <button
                type="button"
                onClick={() => copy(i.token)}
                aria-label="Copiar link"
                className="flex items-center gap-1 rounded px-1.5 h-6 text-[11px] text-brand hover:bg-brand/10"
              >
                {copied === i.token ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied === i.token ? "Copiado" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={() => revoke(i.id)}
                aria-label="Revogar convite"
                className="text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-subtle">
        Qualquer pessoa com o link e uma conta entra como membro (expira em 7 dias).
      </p>
    </div>
  );
}
