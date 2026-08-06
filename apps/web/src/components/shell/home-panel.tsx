"use client";

import * as React from "react";
import {
  ChevronDown,
  Copy,
  Folder,
  FolderPlus,
  Inbox,
  ListChecks,
  MessageSquare,
  LayoutTemplate,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Reply,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { TemplatesModal } from "@/components/shell/templates-modal";
import type { NavFolder, NavList, NavSpace } from "@wayline/db";
import { Input, SidebarItem, cn } from "@wayline/ui";
import {
  createFolderAction,
  createListAction,
  createSpaceAction,
  deleteFolderAction,
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
  onCollapse,
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
  onCollapse?: () => void;
}) {
  const [, startTransition] = React.useTransition();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [addingSpace, setAddingSpace] = React.useState(false);
  const [addingListIn, setAddingListIn] = React.useState<string | null>(null);
  const [addingFolderIn, setAddingFolderIn] = React.useState<string | null>(null);
  const [addingListInFolder, setAddingListInFolder] = React.useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);

  function selectList(id: string) {
    if (id === activeListId) return;
    startTransition(() => void switchList(id));
  }
  function addSpace(name: string) {
    setAddingSpace(false);
    startTransition(() => void createSpaceAction(activeOrgId, name));
  }
  function addList(spaceId: string, name: string, folderId: string | null = null) {
    setAddingListIn(null);
    setAddingListInFolder(null);
    startTransition(() => void createListAction(activeOrgId, spaceId, name, folderId));
  }
  function addFolder(spaceId: string, name: string) {
    setAddingFolderIn(null);
    startTransition(() => void createFolderAction(activeOrgId, spaceId, name));
  }
  function removeFolder(folderId: string) {
    startTransition(() => void deleteFolderAction(activeOrgId, folderId));
  }
  function duplicateList(listId: string) {
    startTransition(() => void duplicateListAction(activeOrgId, listId));
  }

  /** Linha de uma lista (usada solta no space e dentro de pastas). */
  function ListRow({ list, indent }: { list: NavList; indent: string }) {
    const active = list.id === activeListId;
    return (
      <div
        className={cn(
          "group flex h-8 items-center gap-1 rounded-md pr-1.5 text-dense transition-colors",
          indent,
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
  }

  /** Uma pasta com suas listas (colapsável). */
  function FolderRow({ folder, spaceId }: { folder: NavFolder; spaceId: string }) {
    const open = !collapsed[folder.id];
    return (
      <div>
        <div className="group flex h-8 items-center gap-1 rounded-md pl-6 pr-1.5 text-dense text-muted transition-colors hover:bg-elevated">
          <button
            type="button"
            onClick={() => setCollapsed((s) => ({ ...s, [folder.id]: open }))}
            className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left"
          >
            <ChevronDown
              className={cn("size-3 shrink-0 text-subtle transition-transform", !open && "-rotate-90")}
            />
            <Folder className="size-3.5 shrink-0 text-subtle" />
            <span className="truncate">{folder.name}</span>
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => {
                  setCollapsed((s) => ({ ...s, [folder.id]: false }));
                  setAddingListInFolder(folder.id);
                }}
                aria-label={`Nova lista em ${folder.name}`}
                title="Nova lista na pasta"
                className="flex size-5 shrink-0 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              >
                <Plus className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeFolder(folder.id)}
                aria-label={`Excluir pasta ${folder.name}`}
                title="Excluir pasta (as listas voltam pro space)"
                className="flex size-5 shrink-0 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>
        {open && (
          <>
            {folder.lists.map((list) => (
              <ListRow key={list.id} list={list} indent="pl-12" />
            ))}
            {addingListInFolder === folder.id && (
              <div className="pl-12 pr-2 py-0.5">
                <InlineAdd
                  placeholder="Nome da lista"
                  onSubmit={(name) => addList(spaceId, name, folder.id)}
                  onCancel={() => setAddingListInFolder(null)}
                />
              </div>
            )}
            {folder.lists.length === 0 && addingListInFolder !== folder.id && (
              <p className="pl-12 py-1 text-[12px] text-subtle">Pasta vazia</p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="font-display text-h3 font-bold">Home</h1>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
            aria-label="Nova ação"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={onCollapse}
            title="Recolher menu"
            aria-label="Recolher menu"
            className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>
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

        <div className="flex items-center justify-between px-2.5 pb-1 pt-4">
          <span className="text-label uppercase text-subtle">Spaces</span>
          {isAdmin && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setTemplatesOpen(true)}
                aria-label="Criar de um template"
                title="Criar projeto de um template"
                className="flex size-5 items-center justify-center rounded text-subtle hover:bg-elevated hover:text-foreground"
              >
                <LayoutTemplate className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setAddingSpace(true)}
                aria-label="Novo space"
                className="flex size-5 items-center justify-center rounded text-subtle hover:bg-elevated hover:text-foreground"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
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
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCollapsed((s) => ({ ...s, [space.id]: false }));
                        setAddingFolderIn(space.id);
                      }}
                      aria-label={`Nova pasta em ${space.name}`}
                      title="Nova pasta"
                      className="flex size-5 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                    >
                      <FolderPlus className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCollapsed((s) => ({ ...s, [space.id]: false }));
                        setAddingListIn(space.id);
                      }}
                      aria-label={`Nova lista em ${space.name}`}
                      title="Nova lista"
                      className="flex size-5 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </>
                )}
              </div>

              {isOpen && (
                <>
                  {space.folders.map((folder) => (
                    <FolderRow key={folder.id} folder={folder} spaceId={space.id} />
                  ))}
                  {addingFolderIn === space.id && (
                    <InlineAdd
                      indent
                      placeholder="Nome da pasta"
                      onSubmit={(name) => addFolder(space.id, name)}
                      onCancel={() => setAddingFolderIn(null)}
                    />
                  )}
                  {space.lists.map((list) => (
                    <ListRow key={list.id} list={list} indent="pl-8" />
                  ))}
                  {addingListIn === space.id && (
                    <InlineAdd
                      indent
                      placeholder="Nome da lista"
                      onSubmit={(name) => addList(space.id, name)}
                      onCancel={() => setAddingListIn(null)}
                    />
                  )}
                  {space.folders.length === 0 &&
                    space.lists.length === 0 &&
                    addingListIn !== space.id &&
                    addingFolderIn !== space.id && (
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

      {templatesOpen && (
        <TemplatesModal
          orgId={activeOrgId}
          spaces={nav.map((s) => ({ id: s.id, name: s.name }))}
          activeListId={activeListId}
          isAdmin={isAdmin}
          onClose={() => setTemplatesOpen(false)}
        />
      )}
    </aside>
  );
}
