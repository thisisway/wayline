"use client";

import * as React from "react";
import {
  Bold,
  CheckSquare,
  ChevronRight,
  Code,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List as ListIcon,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  StickyNote,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  type LucideIcon,
} from "lucide-react";
import type { PageDoc, PageNode } from "@wayline/db";
import { cn } from "@wayline/ui";
import {
  convertPageToTaskAction,
  createPageAction,
  deletePageAction,
  getPageAction,
  listPagesAction,
  renamePageAction,
  savePageContentAction,
} from "@/actions/pages";

type SaveState = "idle" | "saving" | "saved";

export function DocsView({
  orgId,
  convertStatusId,
}: {
  orgId: string;
  /** Primeira coluna da lista ativa — destino ao "converter em tarefa". */
  convertStatusId?: string;
}) {
  const [tree, setTree] = React.useState<PageNode[] | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    try {
      const list = await listPagesAction(orgId);
      setTree(list);
      setError(null);
      return list;
    } catch {
      setError(
        "Não foi possível carregar as páginas. A migração 0025 (tabela pages) já foi aplicada no banco?",
      );
      return [];
    }
  }, [orgId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const childrenOf = React.useMemo(() => {
    const map = new Map<string | null, PageNode[]>();
    for (const p of tree ?? []) {
      const key = p.parentId;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [tree]);

  const workspaceRoots = (childrenOf.get(null) ?? []).filter((p) => !p.personal);
  const personalRoots = (childrenOf.get(null) ?? []).filter((p) => p.personal);

  async function create(personal: boolean, parentId: string | null) {
    try {
      const page = await createPageAction(orgId, { personal, parentId });
      if (!page) {
        setError("Não foi possível criar a página (sem sessão ou permissão).");
        return;
      }
      if (parentId) setExpanded((e) => ({ ...e, [parentId]: true }));
      await reload();
      setSelectedId(page.id);
    } catch {
      setError(
        "Erro ao criar a página. Verifique se a migração 0025 (tabela pages) foi aplicada no banco.",
      );
    }
  }

  async function remove(id: string) {
    await deletePageAction(orgId, id);
    if (selectedId === id) setSelectedId(null);
    await reload();
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* Sidebar de páginas */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
        {error && (
          <p className="m-2 rounded-md border border-danger/30 bg-danger/10 px-2.5 py-2 text-dense text-danger">
            {error}
          </p>
        )}
        <div className="flex-1 overflow-y-auto p-2">
          <Section
            label="Workspace"
            hint="Docs compartilhados"
            onAdd={() => create(false, null)}
          >
            {workspaceRoots.length === 0 && <Empty text="Nenhum documento" />}
            {workspaceRoots.map((p) => (
              <PageRow
                key={p.id}
                node={p}
                depth={0}
                childrenOf={childrenOf}
                expanded={expanded}
                setExpanded={setExpanded}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAddSub={(pid) => create(false, pid)}
                onDelete={remove}
              />
            ))}
          </Section>

          <Section
            label="Meus (privado)"
            hint="Só você vê"
            icon={<StickyNote className="size-3.5" />}
            onAdd={() => create(true, null)}
          >
            {personalRoots.length === 0 && <Empty text="Nenhuma nota" />}
            {personalRoots.map((p) => (
              <PageRow
                key={p.id}
                node={p}
                depth={0}
                childrenOf={childrenOf}
                expanded={expanded}
                setExpanded={setExpanded}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAddSub={(pid) => create(true, pid)}
                onDelete={remove}
              />
            ))}
          </Section>
        </div>
      </aside>

      {/* Editor */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {selectedId ? (
          <Editor
            key={selectedId}
            orgId={orgId}
            pageId={selectedId}
            convertStatusId={convertStatusId}
            onRenamed={reload}
            onConverted={() => undefined}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-elevated text-muted">
              <FileText className="size-6" />
            </span>
            <div>
              <p className="font-display text-h3 font-bold">Docs & Notas</p>
              <p className="mt-1 max-w-sm text-ui text-muted">
                Selecione um documento à esquerda ou crie um novo. Documentos do{" "}
                <strong>Workspace</strong> são compartilhados; <strong>Meus</strong> são
                privados (e viram tarefa com um clique).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  hint,
  icon,
  onAdd,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="group flex items-center gap-1.5 px-1.5 pb-1">
        {icon}
        <span className="text-label uppercase text-subtle" title={hint}>
          {label}
        </span>
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Novo em ${label}`}
          className="ml-auto flex size-5 items-center justify-center rounded text-subtle hover:bg-elevated hover:text-foreground"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-2 py-1 text-dense text-subtle">{text}</p>;
}

function PageRow({
  node,
  depth,
  childrenOf,
  expanded,
  setExpanded,
  selectedId,
  onSelect,
  onAddSub,
  onDelete,
}: {
  node: PageNode;
  depth: number;
  childrenOf: Map<string | null, PageNode[]>;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddSub: (parentId: string) => void;
  onDelete: (id: string) => void;
}) {
  const kids = childrenOf.get(node.id) ?? [];
  const isOpen = expanded[node.id];
  const active = selectedId === node.id;

  return (
    <div>
      <div
        className={cn(
          "group flex h-8 items-center gap-1 rounded-md pr-1 text-dense transition-colors",
          active ? "bg-brand/10 font-medium text-brand" : "text-muted hover:bg-elevated hover:text-foreground",
        )}
        style={{ paddingLeft: 6 + depth * 12 }}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => ({ ...e, [node.id]: !isOpen }))}
          className={cn("flex size-4 shrink-0 items-center justify-center", !kids.length && "invisible")}
          aria-label={isOpen ? "Recolher" : "Expandir"}
        >
          <ChevronRight className={cn("size-3.5 transition-transform", isOpen && "rotate-90")} />
        </button>
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left"
        >
          <span className="shrink-0 text-subtle">{node.icon ?? "📄"}</span>
          <span className="truncate">{node.title}</span>
        </button>
        <button
          type="button"
          onClick={() => onAddSub(node.id)}
          aria-label="Nova subpágina"
          className="flex size-5 shrink-0 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          <Plus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(node.id)}
          aria-label="Excluir"
          className="flex size-5 shrink-0 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {isOpen &&
        kids.map((k) => (
          <PageRow
            key={k.id}
            node={k}
            depth={depth + 1}
            childrenOf={childrenOf}
            expanded={expanded}
            setExpanded={setExpanded}
            selectedId={selectedId}
            onSelect={onSelect}
            onAddSub={onAddSub}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      // preventDefault mantém a seleção no editor ao clicar.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-foreground [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

type ExecFn = (cmd: string, value?: string) => void;
interface SlashBlock {
  id: string;
  label: string;
  icon: LucideIcon;
  run: (exec: ExecFn) => void;
}

/** Blocos do menu "/" (estilo Notion). */
const SLASH_BLOCKS: SlashBlock[] = [
  { id: "text", label: "Texto", icon: Type, run: (e) => e("formatBlock", "<p>") },
  { id: "h1", label: "Título 1", icon: Heading1, run: (e) => e("formatBlock", "<h1>") },
  { id: "h2", label: "Título 2", icon: Heading2, run: (e) => e("formatBlock", "<h2>") },
  { id: "h3", label: "Título 3", icon: Heading3, run: (e) => e("formatBlock", "<h3>") },
  { id: "bullet", label: "Lista com marcadores", icon: ListIcon, run: (e) => e("insertUnorderedList") },
  { id: "numbered", label: "Lista numerada", icon: ListOrdered, run: (e) => e("insertOrderedList") },
  { id: "quote", label: "Citação", icon: Quote, run: (e) => e("formatBlock", "<blockquote>") },
  { id: "code", label: "Código", icon: Code, run: (e) => e("formatBlock", "<pre>") },
  { id: "divider", label: "Divisor", icon: Minus, run: (e) => e("insertHorizontalRule") },
];

function Editor({
  orgId,
  pageId,
  convertStatusId,
  onRenamed,
  onConverted,
}: {
  orgId: string;
  pageId: string;
  convertStatusId?: string;
  onRenamed: () => void;
  onConverted: () => void;
}) {
  const [doc, setDoc] = React.useState<PageDoc | null>(null);
  const [title, setTitle] = React.useState("");
  const [save, setSave] = React.useState<SaveState>("idle");
  const [converted, setConverted] = React.useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Menu "/" (comandos de bloco)
  const [slashOpen, setSlashOpen] = React.useState(false);
  const [slashQuery, setSlashQuery] = React.useState("");
  const [slashPos, setSlashPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [slashIndex, setSlashIndex] = React.useState(0);
  const filtered = SLASH_BLOCKS.filter((b) =>
    b.label.toLowerCase().includes(slashQuery.toLowerCase()),
  );

  function detectSlash() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return setSlashOpen(false);
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (!editorRef.current.contains(node) || node.nodeType !== Node.TEXT_NODE) {
      return setSlashOpen(false);
    }
    const text = node.textContent ?? "";
    const caret = range.startOffset;
    const slash = text.lastIndexOf("/", caret - 1);
    if (slash === -1) return setSlashOpen(false);
    const before = slash === 0 ? "" : text[slash - 1] ?? "";
    if (before && !/\s/.test(before)) return setSlashOpen(false); // "/" no meio de palavra
    const q = text.slice(slash + 1, caret);
    if (/\s/.test(q)) return setSlashOpen(false);
    const rect = range.getBoundingClientRect();
    setSlashPos({ top: rect.bottom + 4, left: rect.left });
    setSlashQuery(q);
    setSlashIndex(0);
    setSlashOpen(true);
  }

  function applyBlock(block: SlashBlock) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      const caret = range.startOffset;
      const remove = slashQuery.length + 1; // "/" + query
      if (node.nodeType === Node.TEXT_NODE && caret >= remove) {
        const r = document.createRange();
        r.setStart(node, caret - remove);
        r.setEnd(node, caret);
        r.deleteContents();
        const c = document.createRange();
        c.setStart(node, caret - remove);
        c.collapse(true);
        sel.removeAllRanges();
        sel.addRange(c);
      }
    }
    block.run(exec);
    setSlashOpen(false);
  }

  function onEditorKeyDown(e: React.KeyboardEvent) {
    if (!slashOpen || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSlashIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSlashIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      applyBlock(filtered[slashIndex] ?? filtered[0]!);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSlashOpen(false);
    }
  }

  function onEditorKeyUp(e: React.KeyboardEvent) {
    if (slashOpen && ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) return;
    detectSlash();
  }

  function addLink() {
    const url = window.prompt("URL do link:");
    if (url) exec("createLink", url);
  }

  React.useEffect(() => {
    let alive = true;
    setDoc(null);
    setConverted(false);
    setSlashOpen(false);
    getPageAction(orgId, pageId).then((d) => {
      if (!alive || !d) return;
      setDoc(d);
      setTitle(d.title);
      if (editorRef.current) editorRef.current.innerHTML = d.content || "";
    });
    return () => {
      alive = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [orgId, pageId]);

  function scheduleSave() {
    setSave("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const html = editorRef.current?.innerHTML ?? "";
      await savePageContentAction(orgId, pageId, html);
      setSave("saved");
    }, 700);
  }

  async function commitTitle() {
    const t = title.trim() || "Sem título";
    if (doc && t !== doc.title) {
      await renamePageAction(orgId, pageId, t);
      setDoc({ ...doc, title: t });
      onRenamed();
    }
  }

  function exec(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    scheduleSave();
  }

  async function convert() {
    if (!convertStatusId || !doc) return;
    const ok = await convertPageToTaskAction(orgId, pageId, convertStatusId);
    if (ok) {
      setConverted(true);
      onConverted();
    }
  }

  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center text-ui text-subtle">
        Carregando…
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-8 py-6">
      {/* Cabeçalho: status de salvamento + ações */}
      <div className="mb-2 flex items-center gap-3 text-dense text-subtle">
        <span className="flex items-center gap-1.5">
          {doc.personal ? (
            <>
              <StickyNote className="size-3.5" /> Nota privada
            </>
          ) : (
            <>
              <FileText className="size-3.5" /> Documento do workspace
            </>
          )}
        </span>
        <span className="ml-auto">
          {save === "saving" ? "Salvando…" : save === "saved" ? "Salvo" : ""}
        </span>
        {convertStatusId && (
          <button
            type="button"
            onClick={convert}
            disabled={converted}
            className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 h-8 font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground disabled:opacity-60"
          >
            <CheckSquare className="size-3.5" />
            {converted ? "Tarefa criada" : "Converter em tarefa"}
          </button>
        )}
      </div>

      {/* Título */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            editorRef.current?.focus();
          }
        }}
        placeholder="Sem título"
        className="mb-2 w-full bg-transparent font-display text-h1 font-bold text-foreground outline-none placeholder:text-subtle"
      />

      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap items-center gap-0.5 border-b border-border pb-2">
        <ToolbarButton title="Texto" onClick={() => exec("formatBlock", "<p>")}>
          <Type />
        </ToolbarButton>
        <ToolbarButton title="Título 1" onClick={() => exec("formatBlock", "<h1>")}>
          <Heading1 />
        </ToolbarButton>
        <ToolbarButton title="Título 2" onClick={() => exec("formatBlock", "<h2>")}>
          <Heading2 />
        </ToolbarButton>
        <ToolbarButton title="Título 3" onClick={() => exec("formatBlock", "<h3>")}>
          <Heading3 />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton title="Negrito" onClick={() => exec("bold")}>
          <Bold />
        </ToolbarButton>
        <ToolbarButton title="Itálico" onClick={() => exec("italic")}>
          <Italic />
        </ToolbarButton>
        <ToolbarButton title="Sublinhado" onClick={() => exec("underline")}>
          <Underline />
        </ToolbarButton>
        <ToolbarButton title="Tachado" onClick={() => exec("strikeThrough")}>
          <Strikethrough />
        </ToolbarButton>
        <ToolbarButton title="Link" onClick={addLink}>
          <Link2 />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton title="Lista com marcadores" onClick={() => exec("insertUnorderedList")}>
          <ListIcon />
        </ToolbarButton>
        <ToolbarButton title="Lista numerada" onClick={() => exec("insertOrderedList")}>
          <ListOrdered />
        </ToolbarButton>
        <ToolbarButton title="Citação" onClick={() => exec("formatBlock", "<blockquote>")}>
          <Quote />
        </ToolbarButton>
        <ToolbarButton title="Código" onClick={() => exec("formatBlock", "<pre>")}>
          <Code />
        </ToolbarButton>
        <ToolbarButton title="Divisor" onClick={() => exec("insertHorizontalRule")}>
          <Minus />
        </ToolbarButton>
        <span className="ml-auto hidden items-center gap-1 text-[11px] text-subtle sm:flex">
          Digite <kbd className="rounded border border-border px-1">/</kbd> para blocos
        </span>
      </div>

      {/* Conteúdo editável */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={scheduleSave}
        onKeyDown={onEditorKeyDown}
        onKeyUp={onEditorKeyUp}
        onBlur={() => setSlashOpen(false)}
        data-placeholder="Escreva ou digite / para comandos…"
        className="prose-doc min-h-0 flex-1 pb-16 text-ui leading-relaxed text-foreground outline-none"
      />

      {/* Menu "/" */}
      {slashOpen && filtered.length > 0 && (
        <div
          className="fixed z-50 max-h-72 w-64 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-xl"
          style={{ top: slashPos.top, left: slashPos.left }}
        >
          {filtered.map((b, i) => {
            const Icon = b.icon;
            return (
              <button
                key={b.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBlock(b)}
                onMouseEnter={() => setSlashIndex(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-dense",
                  i === slashIndex ? "bg-brand/10 text-brand" : "text-muted hover:bg-elevated",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {b.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
