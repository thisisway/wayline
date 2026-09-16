"use client";

import * as React from "react";
import {
  ChevronDown,
  Copy,
  FileText,
  Folder,
  FolderPlus,
  Inbox,
  KeyRound,
  ListChecks,
  MessageSquare,
  LayoutTemplate,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Plus,
  Reply,
  Smile,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { TemplatesModal } from "@/components/shell/templates-modal";
import { IconPicker, IconContent } from "@/components/shell/icon-picker";
import type { NavAccess, NavDoc, NavFolder, NavList, NavSpace } from "@wayline/db";
import { Input, SidebarItem, cn } from "@wayline/ui";
import {
  createFolderAction,
  createListAction,
  createSpaceAction,
  deleteFolderAction,
  deleteListAction,
  deleteSpaceAction,
  duplicateListAction,
  moveListToFolderAction,
  renameFolderAction,
  renameListAction,
  renameSpaceAction,
  setListIconAction,
  setSpaceAppearanceAction,
  switchList,
} from "@/actions/org";
import { createSpaceDocAction, moveDocAction } from "@/actions/pages";
import {
  createAccessTableAction,
  deleteAccessTableAction,
  moveAccessTableAction,
  renameAccessTableAction,
} from "@/actions/access";
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

type RowMenuItem = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
};

/** Botão "..." que abre um menu de ações (estilo ClickUp). Posicionado fixo pra
 *  não ser cortado pelo overflow da sidebar. */
function RowMenu({ items, ariaLabel }: { items: RowMenuItem[]; ariaLabel: string }) {
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setPos(null);
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => window.addEventListener("mousedown", onClick), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      clearTimeout(t);
    };
  }, [pos]);

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setPos({ x: r.right, y: r.bottom + 4 });
        }}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded text-subtle transition-opacity hover:bg-elevated hover:text-foreground",
          pos ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <MoreHorizontal className="size-3.5" />
      </button>
      {pos && (
        <div
          ref={menuRef}
          style={{
            left: Math.max(8, Math.min(pos.x - 184, (typeof window !== "undefined" ? window.innerWidth : 1000) - 192)),
            top: Math.min(pos.y, (typeof window !== "undefined" ? window.innerHeight : 800) - items.length * 34 - 16),
          }}
          className="fixed z-[70] w-44 rounded-lg border border-border bg-surface p-1 shadow-xl"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPos(null);
                item.onClick();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 h-8 text-dense transition-colors hover:bg-elevated",
                item.danger ? "text-danger hover:text-danger" : "text-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
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
  onOpenDoc,
  onOpenAccess,
  onSelectList,
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
  onOpenDoc?: (pageId: string) => void;
  onOpenAccess?: (tableId: string, name: string) => void;
  /** Selecionou uma lista — volta pro board (reseta a view de docs/relatórios). */
  onSelectList?: () => void;
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
  const [renamingFolder, setRenamingFolder] = React.useState<string | null>(null);
  const [renamingSpace, setRenamingSpace] = React.useState<string | null>(null);
  const [renamingList, setRenamingList] = React.useState<string | null>(null);
  const [renamingAccess, setRenamingAccess] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<string | null>(null);
  const [iconPicker, setIconPicker] = React.useState<{
    kind: "space" | "list";
    id: string;
    color?: string;
    anchor: { x: number; y: number };
  } | null>(null);

  function openIconPicker(
    e: React.MouseEvent,
    kind: "space" | "list",
    id: string,
    color?: string,
  ) {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setIconPicker({ kind, id, color, anchor: { x: r.left, y: r.bottom + 4 } });
  }
  function applyIcon(icon: string | null) {
    if (!iconPicker) return;
    const { kind, id } = iconPicker;
    setIconPicker(null);
    if (kind === "space") {
      startTransition(() => void setSpaceAppearanceAction(activeOrgId, id, { icon }));
    } else {
      startTransition(() => void setListIconAction(activeOrgId, id, icon));
    }
  }
  function applySpaceColor(color: string) {
    if (!iconPicker || iconPicker.kind !== "space") return;
    setIconPicker((p) => (p ? { ...p, color } : p));
    startTransition(() => void setSpaceAppearanceAction(activeOrgId, iconPicker.id, { color }));
  }

  function selectList(id: string) {
    onSelectList?.(); // sempre volta pro board (mesmo se a lista já for a ativa)
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
  function renameFolderFn(folderId: string, name: string) {
    setRenamingFolder(null);
    const n = name.trim();
    if (n) startTransition(() => void renameFolderAction(activeOrgId, folderId, n));
  }
  function renameSpaceFn(spaceId: string, name: string) {
    setRenamingSpace(null);
    const n = name.trim();
    if (n) startTransition(() => void renameSpaceAction(activeOrgId, spaceId, n));
  }
  function removeSpace(spaceId: string, name: string) {
    if (!window.confirm(`Excluir o space "${name}" e todas as suas listas?`)) return;
    startTransition(() => void deleteSpaceAction(activeOrgId, spaceId));
  }
  function renameListFn(listId: string, name: string) {
    setRenamingList(null);
    const n = name.trim();
    if (n) startTransition(() => void renameListAction(activeOrgId, listId, n));
  }
  function removeList(listId: string, name: string) {
    if (!window.confirm(`Excluir a lista "${name}" e suas tarefas?`)) return;
    startTransition(() => void deleteListAction(activeOrgId, listId));
  }
  async function addAccess(spaceId: string, folderId: string | null = null) {
    const id = await createAccessTableAction(activeOrgId, spaceId, folderId);
    if (id) onOpenAccess?.(id, "Acessos");
  }
  function renameAccessFn(id: string, name: string) {
    setRenamingAccess(null);
    const n = name.trim();
    if (n) startTransition(() => void renameAccessTableAction(activeOrgId, id, n));
  }
  function removeAccess(id: string, name: string) {
    if (!window.confirm(`Excluir o cofre de acessos "${name}" e suas credenciais?`)) return;
    startTransition(() => void deleteAccessTableAction(activeOrgId, id));
  }
  /** Drop de uma lista/documento numa pasta (folderId) ou no space (null). */
  function onDropInto(e: React.DragEvent, spaceId: string, folderId: string | null) {
    e.preventDefault();
    setDropTarget(null);
    const [kind, id] = e.dataTransfer.getData("text/plain").split("|");
    if (!id) return;
    if (kind === "list") {
      startTransition(() => void moveListToFolderAction(activeOrgId, id, folderId, spaceId));
    } else if (kind === "doc") {
      startTransition(() => void moveDocAction(activeOrgId, id, spaceId, folderId));
    } else if (kind === "access") {
      startTransition(() => void moveAccessTableAction(activeOrgId, id, spaceId, folderId));
    }
  }
  function dragProps(kind: "list" | "doc" | "access", id: string) {
    if (!isAdmin) return {};
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.setData("text/plain", `${kind}|${id}`);
        e.dataTransfer.effectAllowed = "move";
      },
    };
  }
  function dropProps(spaceId: string, folderId: string | null, key: string) {
    if (!isAdmin) return {};
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        if (dropTarget !== key) setDropTarget(key);
      },
      onDragLeave: () => setDropTarget((t) => (t === key ? null : t)),
      onDrop: (e: React.DragEvent) => onDropInto(e, spaceId, folderId),
    };
  }
  async function addDoc(spaceId: string, folderId: string | null = null) {
    const id = await createSpaceDocAction(activeOrgId, spaceId, folderId);
    if (id) onOpenDoc?.(id);
  }
  function duplicateList(listId: string) {
    startTransition(() => void duplicateListAction(activeOrgId, listId));
  }

  /** Linha de um cofre de acessos (abre a tabela de credenciais). */
  function AccessRow({ access, indent }: { access: NavAccess; indent: string }) {
    return (
      <div
        {...dragProps("access", access.id)}
        className={cn(
          "group flex h-8 items-center gap-1 rounded-md pr-1.5 text-dense text-muted transition-colors hover:bg-elevated hover:text-foreground",
          indent,
        )}
      >
        {renamingAccess === access.id ? (
          <input
            autoFocus
            defaultValue={access.name}
            onKeyDown={(e) => {
              if (e.key === "Enter") renameAccessFn(access.id, e.currentTarget.value);
              else if (e.key === "Escape") setRenamingAccess(null);
            }}
            onBlur={(e) => renameAccessFn(access.id, e.currentTarget.value)}
            className="h-6 min-w-0 flex-1 rounded border border-brand bg-surface px-1.5 text-dense text-foreground focus-visible:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => onOpenAccess?.(access.id, access.name)}
            onDoubleClick={() => isAdmin && setRenamingAccess(access.id)}
            className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left"
          >
            <KeyRound className="size-3.5 shrink-0 text-subtle" />
            <span className="truncate">{access.name}</span>
          </button>
        )}
        {isAdmin && renamingAccess !== access.id && (
          <RowMenu
            ariaLabel={`Ações de ${access.name}`}
            items={[
              { label: "Renomear", icon: Pencil, onClick: () => setRenamingAccess(access.id) },
              {
                label: "Excluir",
                icon: Trash2,
                danger: true,
                onClick: () => removeAccess(access.id, access.name),
              },
            ]}
          />
        )}
      </div>
    );
  }

  /** Linha de um documento do space (abre no editor de docs). */
  function DocRow({ doc, indent }: { doc: NavDoc; indent: string }) {
    return (
      <button
        type="button"
        onClick={() => onOpenDoc?.(doc.id)}
        {...dragProps("doc", doc.id)}
        className={cn(
          "group flex h-8 w-full items-center gap-1.5 rounded-md pr-1.5 text-dense text-muted transition-colors hover:bg-elevated hover:text-foreground",
          indent,
        )}
      >
        {doc.icon ? (
          <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden leading-none">
            <IconContent icon={doc.icon} fallback="" />
          </span>
        ) : (
          <FileText className="size-3.5 shrink-0 text-subtle" />
        )}
        <span className="min-w-0 flex-1 truncate text-left">{doc.title}</span>
      </button>
    );
  }

  /** Linha de uma lista (usada solta no space e dentro de pastas). */
  function ListRow({ list, indent }: { list: NavList; indent: string }) {
    const active = list.id === activeListId;
    return (
      <div
        {...dragProps("list", list.id)}
        className={cn(
          "group flex h-8 items-center gap-1 rounded-md pr-1.5 text-dense transition-colors",
          indent,
          active
            ? "bg-brand/10 font-medium text-brand"
            : "text-muted hover:bg-elevated hover:text-foreground",
        )}
      >
        {isAdmin ? (
          <button
            type="button"
            onClick={(e) => openIconPicker(e, "list", list.id)}
            title="Ícone da lista"
            className={cn(
              "flex size-5 shrink-0 items-center justify-center overflow-hidden rounded text-[13px] leading-none hover:bg-elevated",
              !list.icon && "text-subtle opacity-0 group-hover:opacity-100",
            )}
          >
            {list.icon ? <IconContent icon={list.icon} fallback="" /> : <Smile className="size-3.5" />}
          </button>
        ) : (
          list.icon && (
            <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden text-[13px] leading-none">
              <IconContent icon={list.icon} fallback="" />
            </span>
          )
        )}
        {renamingList === list.id ? (
          <input
            autoFocus
            defaultValue={list.name}
            onKeyDown={(e) => {
              if (e.key === "Enter") renameListFn(list.id, e.currentTarget.value);
              else if (e.key === "Escape") setRenamingList(null);
            }}
            onBlur={(e) => renameListFn(list.id, e.currentTarget.value)}
            className="h-6 min-w-0 flex-1 rounded border border-brand bg-surface px-1.5 text-dense text-foreground focus-visible:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => selectList(list.id)}
            onDoubleClick={() => isAdmin && setRenamingList(list.id)}
            title={isAdmin ? "Duplo clique para renomear" : undefined}
            className="min-w-0 flex-1 truncate text-left"
          >
            {list.name}
          </button>
        )}
        {isAdmin && renamingList !== list.id && (
          <RowMenu
            ariaLabel={`Ações de ${list.name}`}
            items={[
              { label: "Renomear", icon: Pencil, onClick: () => setRenamingList(list.id) },
              { label: "Duplicar", icon: Copy, onClick: () => duplicateList(list.id) },
              {
                label: "Excluir",
                icon: Trash2,
                danger: true,
                onClick: () => removeList(list.id, list.name),
              },
            ]}
          />
        )}
      </div>
    );
  }

  /** Uma pasta com suas listas (colapsável). */
  function FolderRow({ folder, spaceId }: { folder: NavFolder; spaceId: string }) {
    const open = !collapsed[folder.id];
    return (
      <div>
        <div
          {...dropProps(spaceId, folder.id, `folder:${folder.id}`)}
          className={cn(
            "group flex h-8 items-center gap-1 rounded-md pl-6 pr-1.5 text-dense text-muted transition-colors hover:bg-elevated",
            dropTarget === `folder:${folder.id}` && "bg-brand/10 ring-1 ring-brand",
          )}
        >
          {renamingFolder === folder.id ? (
            <input
              autoFocus
              defaultValue={folder.name}
              onKeyDown={(e) => {
                if (e.key === "Enter") renameFolderFn(folder.id, e.currentTarget.value);
                else if (e.key === "Escape") setRenamingFolder(null);
              }}
              onBlur={(e) => renameFolderFn(folder.id, e.currentTarget.value)}
              className="h-6 min-w-0 flex-1 rounded border border-brand bg-surface px-1.5 text-dense text-foreground focus-visible:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed((s) => ({ ...s, [folder.id]: open }))}
              onDoubleClick={() => isAdmin && setRenamingFolder(folder.id)}
              title={isAdmin ? "Duplo-clique para renomear" : undefined}
              className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left"
            >
              <ChevronDown
                className={cn("size-3 shrink-0 text-subtle transition-transform", !open && "-rotate-90")}
              />
              <Folder className="size-3.5 shrink-0 text-subtle" />
              <span className="truncate">{folder.name}</span>
            </button>
          )}
          {isAdmin && renamingFolder !== folder.id && (
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
              <RowMenu
                ariaLabel={`Ações da pasta ${folder.name}`}
                items={[
                  { label: "Renomear", icon: Pencil, onClick: () => setRenamingFolder(folder.id) },
                  {
                    label: "Novo documento",
                    icon: FileText,
                    onClick: () => {
                      setCollapsed((s) => ({ ...s, [folder.id]: false }));
                      void addDoc(spaceId, folder.id);
                    },
                  },
                  {
                    label: "Nova lista",
                    icon: Plus,
                    onClick: () => {
                      setCollapsed((s) => ({ ...s, [folder.id]: false }));
                      setAddingListInFolder(folder.id);
                    },
                  },
                  {
                    label: "Cofre de acessos",
                    icon: KeyRound,
                    onClick: () => {
                      setCollapsed((s) => ({ ...s, [folder.id]: false }));
                      void addAccess(spaceId, folder.id);
                    },
                  },
                  {
                    label: "Excluir pasta",
                    icon: Trash2,
                    danger: true,
                    onClick: () => removeFolder(folder.id),
                  },
                ]}
              />
            </>
          )}
        </div>
        {open && (
          <>
            {folder.lists.map((list) => (
              <ListRow key={list.id} list={list} indent="pl-12" />
            ))}
            {folder.docs.map((doc) => (
              <DocRow key={doc.id} doc={doc} indent="pl-12" />
            ))}
            {folder.accessTables.map((a) => (
              <AccessRow key={a.id} access={a} indent="pl-12" />
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
            {folder.lists.length === 0 &&
              folder.docs.length === 0 &&
              folder.accessTables.length === 0 &&
              addingListInFolder !== folder.id && (
                <p className="pl-12 py-1 text-[12px] text-subtle">Pasta vazia</p>
              )}
          </>
        )}
      </div>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-14 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-surface shadow-2xl lg:static lg:left-auto lg:z-auto lg:shadow-none">
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
              <div
                {...dropProps(space.id, null, `space:${space.id}`)}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-md px-2.5 h-8 text-dense font-semibold text-foreground transition-colors hover:bg-elevated",
                  dropTarget === `space:${space.id}` && "bg-brand/10 ring-1 ring-brand",
                )}
              >
                <button
                  type="button"
                  onClick={() => setCollapsed((s) => ({ ...s, [space.id]: isOpen }))}
                  aria-label={isOpen ? "Recolher" : "Expandir"}
                  className="flex shrink-0 items-center"
                >
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-subtle transition-transform",
                      !isOpen && "-rotate-90",
                    )}
                  />
                </button>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={(e) => openIconPicker(e, "space", space.id, space.color)}
                    title="Ícone e cor do space"
                    className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: space.color }}
                  >
                    <IconContent icon={space.icon} fallback={space.name[0] ?? "S"} />
                  </button>
                ) : (
                  <span
                    className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: space.color }}
                  >
                    <IconContent icon={space.icon} fallback={space.name[0] ?? "S"} />
                  </span>
                )}
                {renamingSpace === space.id ? (
                  <input
                    autoFocus
                    defaultValue={space.name}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renameSpaceFn(space.id, e.currentTarget.value);
                      else if (e.key === "Escape") setRenamingSpace(null);
                    }}
                    onBlur={(e) => renameSpaceFn(space.id, e.currentTarget.value)}
                    className="h-6 min-w-0 flex-1 rounded border border-brand bg-surface px-1.5 text-dense font-semibold text-foreground focus-visible:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setCollapsed((s) => ({ ...s, [space.id]: isOpen }))}
                    onDoubleClick={() => isAdmin && setRenamingSpace(space.id)}
                    title={isAdmin ? "Duplo clique para renomear" : undefined}
                    className="min-w-0 flex-1 truncate text-left"
                  >
                    {space.name}
                  </button>
                )}
                {isAdmin && renamingSpace !== space.id && (
                  <>
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
                    <RowMenu
                      ariaLabel={`Ações do space ${space.name}`}
                      items={[
                        { label: "Renomear", icon: Pencil, onClick: () => setRenamingSpace(space.id) },
                        {
                          label: "Nova lista",
                          icon: Plus,
                          onClick: () => {
                            setCollapsed((s) => ({ ...s, [space.id]: false }));
                            setAddingListIn(space.id);
                          },
                        },
                        {
                          label: "Nova pasta",
                          icon: FolderPlus,
                          onClick: () => {
                            setCollapsed((s) => ({ ...s, [space.id]: false }));
                            setAddingFolderIn(space.id);
                          },
                        },
                        {
                          label: "Novo documento",
                          icon: FileText,
                          onClick: () => {
                            setCollapsed((s) => ({ ...s, [space.id]: false }));
                            void addDoc(space.id);
                          },
                        },
                        {
                          label: "Cofre de acessos",
                          icon: KeyRound,
                          onClick: () => {
                            setCollapsed((s) => ({ ...s, [space.id]: false }));
                            void addAccess(space.id);
                          },
                        },
                        {
                          label: "Excluir space",
                          icon: Trash2,
                          danger: true,
                          onClick: () => removeSpace(space.id, space.name),
                        },
                      ]}
                    />
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
                  {space.docs.map((doc) => (
                    <DocRow key={doc.id} doc={doc} indent="pl-8" />
                  ))}
                  {space.accessTables.map((a) => (
                    <AccessRow key={a.id} access={a} indent="pl-8" />
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
                    space.docs.length === 0 &&
                    space.accessTables.length === 0 &&
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

      {iconPicker && (
        <IconPicker
          anchor={iconPicker.anchor}
          color={iconPicker.color}
          withColors={iconPicker.kind === "space"}
          onPickEmoji={(e) => applyIcon(e)}
          onPickColor={applySpaceColor}
          onRemove={() => applyIcon(null)}
          onClose={() => setIconPicker(null)}
        />
      )}
    </aside>
  );
}
