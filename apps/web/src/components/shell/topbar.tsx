"use client";

import { Bell, ChevronsUpDown, Command, LogOut, Search, Sparkles } from "lucide-react";
import { signOut } from "next-auth/react";
import { Avatar, Badge, Button } from "@wayline/ui";
import { activeWorkspace } from "@/mock/data";

export function Topbar({ userName }: { userName: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      {/* Seletor de workspace */}
      <button
        type="button"
        className="flex items-center gap-2 rounded-md px-2 h-9 transition-colors hover:bg-elevated"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-brand font-display text-dense font-bold text-white">
          {activeWorkspace.name[0]}
        </span>
        <span className="text-ui font-semibold">{activeWorkspace.name}</span>
        <Badge variant="brand" size="sm">
          {activeWorkspace.plan}
        </Badge>
        <ChevronsUpDown className="size-3.5 text-subtle" />
      </button>

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
