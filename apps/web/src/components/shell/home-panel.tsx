"use client";

import * as React from "react";
import {
  Briefcase,
  ChevronDown,
  Copy,
  FileSignature,
  FileText,
  Image as ImageIcon,
  Inbox,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  Package,
  Plus,
  Reply,
  type LucideIcon,
} from "lucide-react";
import type { NavSpace } from "@wayline/db";
import { Input, SidebarItem, cn } from "@wayline/ui";
import {
  createListAction,
  createSpaceAction,
  duplicateListAction,
  switchList,
} from "@/actions/org";
import { homeItems } from "@/mock/data";
import type { HomeItem } from "@/mock/types";

const homeIcon: Record<HomeItem["icon"], LucideIcon> = {
  inbox: Inbox,
  reply: Reply,
  comment: MessageSquare,
  check: ListChecks,
  more: MoreHorizontal,
};

/** Input inline: Enter confirma, Escape/blur cancela. */
function InlineAdd({
  placeholder,
  indent,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  indent?: boolean;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = React.useState("");
  return (
    <div className={cn("py-0.5", indent ? "pl-8 pr-2" : "px-2")}>
      <Input
        autoFocus
        value={value}
        placeholder={placeholder}
        className="h-8 text-dense"
        onChange={(e) => setValue(e.target.value)}
        onBlur={onCancel}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const v = value.trim();
            if (v) onSubmit(v);
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
      />
    </div>
  );
}

export function HomePanel({
  nav,
  activeListId,
  activeOrgId,
  myTasksCount,
  inboxUnread,
  assignedCount,
  repliesCount,
  onOpenMyTasks,
  onOpenInbox,
  onOpenAssigned,
  onOpenReplies,
  isAdmin,
  salesEnabled = false,
  onOpenClients,
  onOpenProposals,
  onOpenServices,
  onOpenPortfolio,
  onOpenContracts,
}: {
  nav: NavSpace[];
  activeListId: string;
  activeOrgId: string;
  myTasksCount: number;
  inboxUnread: number;
  assignedCount: number;
  repliesCount: number;
  onOpenMyTasks: () => void;
  onOpenInbox: () => void;
  onOpenAssigned: () => void;
  onOpenReplies: () => void;
  isAdmin: boolean;
  salesEnabled?: boolean;
  onOpenClients?: () => void;
  onOpenProposals?: () => void;
  onOpenServices?: () => void;
  onOpenPortfolio?: () => void;
  onOpenContracts?: () => void;
}) {
  const [, startTransition] = React.useTransition();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [addingSpace, setAddingSpace] = React.useState(false);
  const [addingListIn, setAddingListIn] = React.useState<string | null>(null);

  function selectList(id: string) {
    if (id === activeListId) return;
    startTransition(() => void switchList(id));
  }
  function addSpace(name: string) {
    setAddingSpace(false);
    startTransition(() => void createSpaceAction(activeOrgId, name));
  }
  function addList(spaceId: string, name: string) {
    setAddingListIn(null);
    startTransition(() => void createListAction(activeOrgId, spaceId, name));
  }
  function duplicateList(listId: string) {
    startTransition(() => void duplicateListAction(activeOrgId, listId));
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="font-display text-h3 font-bold">Home</h1>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          aria-label="Nova ação"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {homeItems.map((item) => {
          const Icon = homeIcon[item.icon];
          const count =
            item.id === "tasks"
              ? myTasksCount
              : item.id === "inbox"
                ? inboxUnread
                : item.id === "assigned"
                  ? assignedCount
                  : item.id === "replies"
                    ? repliesCount
                    : item.count;
          const onClick =
            item.id === "tasks"
              ? onOpenMyTasks
              : item.id === "inbox"
                ? onOpenInbox
                : item.id === "assigned"
                  ? onOpenAssigned
                  : item.id === "replies"
                    ? onOpenReplies
                    : undefined;
          return (
            <SidebarItem
              key={item.id}
              icon={<Icon />}
              label={item.label}
              count={count}
              onClick={onClick}
            />
          );
        })}

        {isAdmin && (
          <>
            <div className="px-2.5 pb-1 pt-4">
              <span className="text-label uppercase text-subtle">Comercial</span>
            </div>
            <SidebarItem icon={<Briefcase />} label="Clientes" onClick={onOpenClients} />
            {salesEnabled && (
              <>
                <SidebarItem icon={<FileText />} label="Propostas" onClick={onOpenProposals} />
                <SidebarItem icon={<Package />} label="Catálogo" onClick={onOpenServices} />
                <SidebarItem icon={<ImageIcon />} label="Portfólio" onClick={onOpenPortfolio} />
                <SidebarItem icon={<FileSignature />} label="Contratos" onClick={onOpenContracts} />
              </>
            )}
          </>
        )}

        <div className="flex items-center justify-between px-2.5 pb-1 pt-4">
          <span className="text-label uppercase text-subtle">Spaces</span>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAddingSpace(true)}
              aria-label="Novo space"
              className="flex size-5 items-center justify-center rounded text-subtle hover:bg-elevated hover:text-foreground"
            >
              <Plus className="size-3.5" />
            </button>
          )}
        </div>

        {nav.length === 0 && !addingSpace && (
          <p className="px-2.5 py-2 text-dense text-subtle">Nenhum space ainda.</p>
        )}

        {nav.map((space) => {
          const isOpen = !collapsed[space.id];
          return (
            <div key={space.id}>
              <div className="group flex w-full items-center gap-2 rounded-md px-2.5 h-8 text-dense font-semibold text-foreground transition-colors hover:bg-elevated">
                <button
                  type="button"
                  onClick={() => setCollapsed((s) => ({ ...s, [space.id]: isOpen }))}
                  className="flex flex-1 items-center gap-2 truncate"
                >
                  <ChevronDown
                    className={cn(
                      "size-3.5 shrink-0 text-subtle transition-transform",
                      !isOpen && "-rotate-90",
                    )}
                  />
                  <span
                    className="flex size-4 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: space.color }}
                  >
                    {space.icon ?? space.name[0]}
                  </span>
                  <span className="truncate text-left">{space.name}</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setCollapsed((s) => ({ ...s, [space.id]: false }));
                      setAddingListIn(space.id);
                    }}
                    aria-label={`Nova lista em ${space.name}`}
                    className="flex size-5 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  >
                    <Plus className="size-3.5" />
                  </button>
                )}
              </div>

              {isOpen && (
                <>
                  {space.lists.map((list) => {
                    const active = list.id === activeListId;
                    return (
                      <div
                        key={list.id}
                        className={cn(
                          "group flex h-8 items-center gap-1 rounded-md pl-8 pr-1.5 text-dense transition-colors",
                          active
                            ? "bg-brand/10 font-medium text-brand"
                            : "text-muted hover:bg-elevated hover:text-foreground",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => selectList(list.id)}
                          className="min-w-0 flex-1 truncate text-left"
                        >
                          {list.name}
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => duplicateList(list.id)}
                            aria-label={`Duplicar ${list.name}`}
                            title="Duplicar lista (estrutura, sem tarefas)"
                            className="flex size-5 shrink-0 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                          >
                            <Copy className="size-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {addingListIn === space.id && (
                    <InlineAdd
                      indent
                      placeholder="Nome da lista"
                      onSubmit={(name) => addList(space.id, name)}
                      onCancel={() => setAddingListIn(null)}
                    />
                  )}
                  {space.lists.length === 0 && addingListIn !== space.id && (
                    <p className="pl-8 py-1 text-[12px] text-subtle">Sem listas</p>
                  )}
                </>
              )}
            </div>
          );
        })}

        {addingSpace && (
          <InlineAdd
            placeholder="Nome do space"
            onSubmit={addSpace}
            onCancel={() => setAddingSpace(false)}
          />
        )}
      </div>
    </aside>
  );
}
