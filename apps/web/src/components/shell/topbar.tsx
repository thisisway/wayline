"use client";

import * as React from "react";
import {
  Bell,
  Briefcase,
  Check,
  ChevronsUpDown,
  Command,
  FileSignature,
  FileText,
  Image as ImageIcon,
  LogOut,
  Package,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Shield } from "lucide-react";
import type { UserOrg } from "@wayline/db";
import { Avatar, Badge, Button, Input, cn } from "@wayline/ui";
import { createWorkspace, switchOrg } from "@/actions/org";
import { effectivePlan } from "@/lib/plans";
import { MembersModal } from "@/components/shell/members-modal";
import { ClientsModal } from "@/components/shell/clients-modal";
import { ProposalsModal } from "@/components/shell/proposals-modal";
import { ServicesModal } from "@/components/shell/services-modal";
import { PortfolioModal } from "@/components/shell/portfolio-modal";
import { ContractsModal } from "@/components/shell/contracts-modal";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export function Topbar({
  userName,
  userAvatar,
  orgs,
  activeOrgId,
  inboxUnread = 0,
  onOpenInbox,
  onOpenSearch,
  onOpenBrain,
  onOpenPlans,
  isAdmin = false,
  isPlatformAdmin = false,
  modules = [],
}: {
  userName: string;
  userAvatar?: string;
  orgs: UserOrg[];
  activeOrgId: string;
  inboxUnread?: number;
  onOpenInbox?: () => void;
  onOpenSearch?: () => void;
  onOpenBrain?: () => void;
  onOpenPlans?: () => void;
  isAdmin?: boolean;
  isPlatformAdmin?: boolean;
  modules?: string[];
}) {
  const [showMembers, setShowMembers] = React.useState(false);
  const [showClients, setShowClients] = React.useState(false);
  const [showProposals, setShowProposals] = React.useState(false);
  const [showServices, setShowServices] = React.useState(false);
  const [showPortfolio, setShowPortfolio] = React.useState(false);
  const [showContracts, setShowContracts] = React.useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      <WorkspaceSwitcher
        orgs={orgs}
        activeOrgId={activeOrgId}
        onOpenPlans={onOpenPlans}
        isPlatformAdmin={isPlatformAdmin}
      />
      {showMembers && (
        <MembersModal
          orgId={activeOrgId}
          isAdmin={isAdmin}
          onClose={() => setShowMembers(false)}
        />
      )}
      {showClients && (
        <ClientsModal orgId={activeOrgId} onClose={() => setShowClients(false)} />
      )}
      {showProposals && (
        <ProposalsModal orgId={activeOrgId} onClose={() => setShowProposals(false)} />
      )}
      {showServices && (
        <ServicesModal orgId={activeOrgId} onClose={() => setShowServices(false)} />
      )}
      {showPortfolio && (
        <PortfolioModal orgId={activeOrgId} onClose={() => setShowPortfolio(false)} />
      )}
      {showContracts && (
        <ContractsModal orgId={activeOrgId} onClose={() => setShowContracts(false)} />
      )}

      {/* Busca global (⌘K) */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="mx-auto flex w-full max-w-md items-center gap-2 rounded-md border border-border bg-canvas px-3 h-9 text-muted transition-colors hover:border-brand-40"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left text-ui text-subtle">Buscar tarefas…</span>
        <kbd className="flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[11px] text-subtle">
          <Command className="size-3" />K
        </kbd>
      </button>

      {/* Ações */}
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={onOpenBrain}>
          <Sparkles className="size-4" />
          Wayline Brain
        </Button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowClients(true)}
            aria-label="Clientes"
            title="Clientes"
            className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <Briefcase className="size-4.5" />
          </button>
        )}
        {isAdmin && modules.includes("sales") && (
          <button
            type="button"
            onClick={() => setShowProposals(true)}
            aria-label="Propostas"
            title="Propostas comerciais"
            className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <FileText className="size-4.5" />
          </button>
        )}
        {isAdmin && modules.includes("sales") && (
          <button
            type="button"
            onClick={() => setShowServices(true)}
            aria-label="Catálogo"
            title="Catálogo de serviços"
            className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <Package className="size-4.5" />
          </button>
        )}
        {isAdmin && modules.includes("sales") && (
          <button
            type="button"
            onClick={() => setShowPortfolio(true)}
            aria-label="Portfólio"
            title="Portfólio (cases)"
            className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <ImageIcon className="size-4.5" />
          </button>
        )}
        {isAdmin && modules.includes("sales") && (
          <button
            type="button"
            onClick={() => setShowContracts(true)}
            aria-label="Contratos"
            title="Contratos"
            className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <FileSignature className="size-4.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowMembers(true)}
          aria-label="Membros"
          title="Membros do workspace"
          className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
        >
          <Users className="size-4.5" />
        </button>
        <button
          type="button"
          onClick={onOpenInbox}
          aria-label="Notificações"
          title="Notificações"
          className="relative flex size-9 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
        >
          <Bell className="size-4.5" />
          {inboxUnread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-surface">
              {inboxUnread > 9 ? "9+" : inboxUnread}
            </span>
          )}
        </button>
        <ThemeToggle />
        <Avatar name={userName} src={userAvatar} size="md" title={userName} />
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

function WorkspaceSwitcher({
  orgs,
  activeOrgId,
  onOpenPlans,
  isPlatformAdmin = false,
}: {
  orgs: UserOrg[];
  activeOrgId: string;
  onOpenPlans?: () => void;
  isPlatformAdmin?: boolean;
}) {
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
          {effectivePlan(active.plan, active.trialEndsAt).name}
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
              onOpenPlans?.();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 h-9 text-ui font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
          >
            <span className="flex size-6 items-center justify-center rounded-md border border-dashed border-border">
              <Sparkles className="size-3.5" />
            </span>
            Planos &amp; Upgrade
          </button>
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
          {isPlatformAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-2 h-9 text-ui font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
            >
              <span className="flex size-6 items-center justify-center rounded-md border border-dashed border-border">
                <Shield className="size-3.5" />
              </span>
              Admin da plataforma
            </Link>
          )}
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
