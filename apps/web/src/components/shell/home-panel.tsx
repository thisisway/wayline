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
import { SidebarItem, cn } from "@wayline/ui";
import { switchList } from "@/actions/org";
import { homeItems } from "@/mock/data";
import type { HomeItem } from "@/mock/types";

const homeIcon: Record<HomeItem["icon"], LucideIcon> = {
  inbox: Inbox,
  reply: Reply,
  comment: MessageSquare,
  check: ListChecks,
  more: MoreHorizontal,
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pb-1 pt-4 text-label uppercase text-subtle">{children}</div>
  );
}

export function HomePanel({ nav, activeListId }: { nav: NavSpace[]; activeListId: string }) {
  const [, startTransition] = React.useTransition();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  function selectList(id: string) {
    if (id === activeListId) return;
    startTransition(() => {
      void switchList(id);
    });
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

        <SectionLabel>Spaces</SectionLabel>

        {nav.length === 0 && (
          <p className="px-2.5 py-2 text-dense text-subtle">Nenhum space ainda.</p>
        )}

        {nav.map((space) => {
          const isOpen = !collapsed[space.id];
          return (
            <div key={space.id}>
              <button
                type="button"
                onClick={() => setCollapsed((s) => ({ ...s, [space.id]: isOpen }))}
                className="group flex w-full items-center gap-2 rounded-md px-2.5 h-8 text-dense font-semibold text-foreground transition-colors hover:bg-elevated"
              >
                <ChevronDown
                  className={cn(
                    "size-3.5 text-subtle transition-transform",
                    !isOpen && "-rotate-90",
                  )}
                />
                <span
                  className="flex size-4 items-center justify-center rounded text-[10px] font-bold text-white"
                  style={{ backgroundColor: space.color }}
                >
                  {space.icon ?? space.name[0]}
                </span>
                <span className="flex-1 truncate text-left">{space.name}</span>
                <Plus className="size-3.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
              </button>

              {isOpen &&
                (space.lists.length === 0 ? (
                  <p className="pl-8 py-1 text-[12px] text-subtle">Sem listas</p>
                ) : (
                  space.lists.map((list) => (
                    <SidebarItem
                      key={list.id}
                      label={list.name}
                      indent
                      active={list.id === activeListId}
                      onClick={() => selectList(list.id)}
                    />
                  ))
                ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
