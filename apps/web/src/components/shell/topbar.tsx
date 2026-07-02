"use client";

import * as React from "react";
import {
  Bell,
  Check,
  ChevronsUpDown,
  Command,
  LogOut,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { signOut } from "next-auth/react";
import type { UserOrg } from "@wayline/db";
import { Avatar, Badge, Button, Input, cn } from "@wayline/ui";
import { createWorkspace, switchOrg } from "@/actions/org";

export function Topbar({
  userName,
  orgs,
  activeOrgId,
}: {
  userName: string;
  orgs: UserOrg[];
  activeOrgId: string;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      <WorkspaceSwitcher orgs={orgs} activeOrgId={activeOrgId} />

      {/* Busca global */}
      <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-md border border-border bg-canvas px-3 h-9 text-muted transition-colors focus-within:border-brand">
        <Search className="size-4" />
        <input
          placeholder="Buscar tarefas, docs, clientes…"
          className="w-full bg-transparent text-ui text-foreground outline-none placeholder:text-subtle"
        />
        <kbd className="flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[11px] text-subtle">
          <Command className="size-3" />K
        </kbd>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm">
          <Sparkles className="size-4" />
          Wayline Brain
        </Button>
        <button
          type="button"
          aria-label="Notificações"
          className="relative flex size-9 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
        >
          <Bell className="size-4.5" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-danger ring-2 ring-surface" />
        </button>
        <Avatar name={userName} size="md" title={userName} />
        <button
          type="button"
          onClick={() => signOut({ redirectTo: "/login" })}
          aria-label="Sair"
          title="Sair"
          className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-danger"
        >
          <LogOut className="size-4.5" />
        </button>
      </div>
    </header>
  );
}

function WorkspaceSwitcher({ orgs, activeOrgId }: { orgs: UserOrg[]; activeOrgId: string }) {
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const active = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!active) return null;

  function select(id: string) {
    setOpen(false);
    if (id === activeOrgId) return;
    startTransition(() => {
      void switchOrg(id);
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="flex items-center gap-2 rounded-md px-2 h-9 transition-colors hover:bg-elevated"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-brand font-display text-dense font-bold text-white">
          {active.name[0]}
        </span>
        <span className="text-ui font-semibold">{active.name}</span>
        <Badge variant="brand" size="sm">
          {active.plan}
        </Badge>
        <ChevronsUpDown className="size-3.5 text-subtle" />
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 w-64 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg animate-fade-in">
          <p className="px-2 py-1.5 text-label uppercase text-subtle">Workspaces</p>
          {orgs.map((o) => {
            const isActive = o.id === activeOrgId;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => select(o.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 h-9 text-ui transition-colors hover:bg-elevated",
                  isActive && "bg-elevated",
                )}
              >
                <span className="flex size-6 items-center justify-center rounded-md bg-brand font-display text-dense font-bold text-white">
                  {o.name[0]}
                </span>
                <span className="flex-1 truncate text-left font-medium">{o.name}</span>
                <span className="text-[11px] capitalize text-subtle">{o.role}</span>
                {isActive && <Check className="size-4 text-brand" />}
              </button>
            );
          })}

          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setCreating(true);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 h-9 text-ui font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
          >
            <span className="flex size-6 items-center justify-center rounded-md border border-dashed border-border">
              <Plus className="size-3.5" />
            </span>
            Criar workspace
          </button>
        </div>
      )}

      {creating && <CreateWorkspaceModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function CreateWorkspaceModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed || pending) return;
    startTransition(async () => {
      await createWorkspace(trimmed);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="font-display text-h3 font-bold">Novo workspace</h2>
        </div>
        <div className="space-y-3 p-5">
          <div className="space-y-1.5">
            <label className="text-label uppercase text-subtle" htmlFor="ws-name">
              Nome
            </label>
            <Input
              id="ws-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Ex.: Minha Agência"
            />
          </div>
          <p className="text-dense text-subtle">
            Cria um espaço isolado com um board padrão (colunas A fazer / Fazendo / Feito).
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!name.trim() || pending}>
              {pending ? "Criando…" : "Criar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
