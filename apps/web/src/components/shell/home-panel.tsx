"use client";

import * as React from "react";
import {
  ChevronDown,
  Inbox,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Reply,
  type LucideIcon,
} from "lucide-react";
import type { NavSpace } from "@wayline/db";
import { Input, SidebarItem, cn } from "@wayline/ui";
import { createListAction, createSpaceAction, switchList } from "@/actions/org";
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
}: {
  nav: NavSpace[];
  activeListId: string;
  activeOrgId: string;
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
          return (
            <SidebarItem
              key={item.id}
              icon={<Icon />}
              label={item.label}
              count={item.count}
              active={item.id === "tasks"}
            />
          );
        })}

        <div className="flex items-center justify-between px-2.5 pb-1 pt-4">
          <span className="text-label uppercase text-subtle">Spaces</span>
          <button
            type="button"
            onClick={() => setAddingSpace(true)}
            aria-label="Novo space"
            className="flex size-5 items-center justify-center rounded text-subtle hover:bg-elevated hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
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
              </div>

              {isOpen && (
                <>
                  {space.lists.map((list) => (
                    <SidebarItem
                      key={list.id}
                      label={list.name}
                      indent
                      active={list.id === activeListId}
                      onClick={() => selectList(list.id)}
                    />
                  ))}
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
