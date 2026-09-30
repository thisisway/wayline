"use client";

import * as React from "react";
import { X } from "lucide-react";
import type { WorkspaceMember } from "@wayline/db";
import { Avatar, Button, Input } from "@wayline/ui";
import { toCents } from "@/lib/money";
import { listMembersAction } from "@/actions/org";
import { createQuickLeadAction } from "@/actions/proposals";

/** Cadastro rápido de lead (botão "Novo lead") — leve, sem abrir o editor completo de proposta. */
export function QuickLeadModal({
  orgId,
  currentUserId,
  onClose,
  onCreated,
}: {
  orgId: string;
  currentUserId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [members, setMembers] = React.useState<WorkspaceMember[]>([]);
  const [title, setTitle] = React.useState("");
  const [contactName, setContactName] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [value, setValue] = React.useState("");
  const [ownerId, setOwnerId] = React.useState(currentUserId ?? "");
  const [expectedCloseAt, setExpectedCloseAt] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    listMembersAction(orgId).then(setMembers);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orgId, onClose]);

  async function create() {
    if (!contactName.trim() || saving) return;
    setSaving(true);
    const id = await createQuickLeadAction(orgId, {
      title,
      contactName,
      contactEmail,
      contactPhone,
      estimatedValueCents: toCents(value || "0"),
      ownerId: ownerId || null,
      expectedCloseAtIso: expectedCloseAt || null,
    }).catch(() => null);
    setSaving(false);
    if (id) {
      onCreated();
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-display text-h3 font-bold">Novo lead</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título / empresa (opcional)"
          />
          <Input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Nome do contato"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="Email"
              type="email"
            />
            <Input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Telefone / WhatsApp"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-subtle">Valor estimado (R$)</label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-subtle">Previsão de fechamento</label>
              <Input
                type="date"
                value={expectedCloseAt}
                onChange={(e) => setExpectedCloseAt(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-subtle">Responsável</label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-ui text-foreground"
            >
              <option value="">Sem responsável</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
            {ownerId && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-subtle">
                <Avatar
                  name={members.find((m) => m.userId === ownerId)?.name ?? "?"}
                  src={members.find((m) => m.userId === ownerId)?.avatarUrl ?? undefined}
                  size="xs"
                />
                {members.find((m) => m.userId === ownerId)?.name}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={create} disabled={!contactName.trim() || saving}>
            Criar lead
          </Button>
        </div>
      </div>
    </div>
  );
}
