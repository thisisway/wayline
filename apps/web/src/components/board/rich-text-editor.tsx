"use client";

import * as React from "react";
import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  List as ListIcon,
  ListOrdered,
  Minus,
  Quote,
  Type,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@wayline/ui";

type Exec = (cmd: string, arg?: string) => void;
interface Block {
  id: string;
  label: string;
  icon: LucideIcon;
  keywords: string;
  run: (exec: Exec) => void;
}

const BLOCKS: Block[] = [
  { id: "text", label: "Texto normal", icon: Type, keywords: "texto paragrafo normal", run: (e) => e("formatBlock", "<p>") },
  { id: "h1", label: "Cabeçalho 1", icon: Heading1, keywords: "titulo h1 cabecalho grande", run: (e) => e("formatBlock", "<h1>") },
  { id: "h2", label: "Cabeçalho 2", icon: Heading2, keywords: "titulo h2 cabecalho medio", run: (e) => e("formatBlock", "<h2>") },
  { id: "h3", label: "Cabeçalho 3", icon: Heading3, keywords: "titulo h3 cabecalho pequeno", run: (e) => e("formatBlock", "<h3>") },
  { id: "bullet", label: "Lista com marcadores", icon: ListIcon, keywords: "lista bullet marcador", run: (e) => e("insertUnorderedList") },
  { id: "numbered", label: "Lista numerada", icon: ListOrdered, keywords: "lista numerada ordem", run: (e) => e("insertOrderedList") },
  { id: "quote", label: "Citação", icon: Quote, keywords: "citacao quote aspas", run: (e) => e("formatBlock", "<blockquote>") },
  { id: "code", label: "Código", icon: Code, keywords: "codigo code bloco", run: (e) => e("formatBlock", "<pre>") },
  { id: "divider", label: "Divisor", icon: Minus, keywords: "divisor linha separador hr", run: (e) => e("insertHorizontalRule") },
];

/** Texto simples (legado) → HTML; HTML existente passa direto. */
function toHtml(v: string): string {
  if (!v) return "";
  if (/<[a-z][\s\S]*>/i.test(v)) return v;
  const esc = v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Query da barra `/` no ponto do cursor (ou null se não há barra ativa). */
function slashQuery(): string | null {
  const s = window.getSelection();
  if (!s || !s.isCollapsed || !s.anchorNode) return null;
  const before = (s.anchorNode.textContent ?? "").slice(0, s.anchorOffset);
  const m = before.match(/(?:^|\s)\/([\p{L}0-9]*)$/u);
  return m ? (m[1] ?? "") : null;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [menu, setMenu] = React.useState<{ x: number; y: number; query: string } | null>(null);
  const [sel, setSel] = React.useState(0);

  // Sincroniza valor externo (ex.: "Gerar com IA") sem atropelar a digitação.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = toHtml(value);
    if (document.activeElement !== el && el.innerHTML !== html) el.innerHTML = html;
  }, [value]);

  function emit() {
    let html = ref.current?.innerHTML ?? "";
    // Editor "visualmente vazio" (só <br>/<p></p>/espaços) → string vazia.
    if (html.replace(/<br\s*\/?>|<\/?(?:p|div)>|&nbsp;|\s/gi, "") === "") html = "";
    onChange(html);
  }
  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  }

  const filtered = React.useMemo(() => {
    if (!menu) return BLOCKS;
    const q = menu.query.toLowerCase();
    if (!q) return BLOCKS;
    return BLOCKS.filter((b) => b.label.toLowerCase().includes(q) || b.keywords.includes(q));
  }, [menu]);

  function refreshMenu() {
    const q = slashQuery();
    if (q === null) {
      setMenu(null);
      return;
    }
    const range = window.getSelection()?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();
    if (rect) {
      setSel(0);
      setMenu({ x: rect.left, y: rect.bottom + 4, query: q });
    }
  }

  function apply(block: Block) {
    // Apaga o "/consulta" digitado antes de inserir o bloco.
    const s = window.getSelection() as (Selection & { modify?: (a: string, b: string, c: string) => void }) | null;
    const len = menu ? menu.query.length + 1 : 0;
    if (s && s.modify) {
      for (let i = 0; i < len; i++) s.modify("extend", "backward", "character");
      document.execCommand("delete");
    }
    block.run(exec);
    setMenu(null);
    emit();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!menu) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const b = filtered[sel];
      if (b) apply(b);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMenu(null);
    }
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        data-ph={placeholder ?? ""}
        onInput={() => {
          emit();
          refreshMenu();
        }}
        onKeyUp={refreshMenu}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setMenu(null), 120)}
        className={cn(
          "min-h-[7rem] w-full rounded-md bg-transparent px-2 py-1.5 text-ui text-foreground transition-colors hover:bg-elevated/40 focus:outline-none focus-visible:outline-none",
          "[&:empty]:before:pointer-events-none [&:empty]:before:text-subtle [&:empty]:before:content-[attr(data-ph)]",
          "[&_h1]:mb-1 [&_h1]:text-h3 [&_h1]:font-bold [&_h2]:mb-1 [&_h2]:text-ui [&_h2]:font-bold [&_h3]:font-semibold",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted",
          "[&_pre]:rounded [&_pre]:bg-elevated [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-dense",
          "[&_hr]:my-2 [&_hr]:border-border [&_a]:text-brand [&_a]:underline",
          className,
        )}
      />

      {menu && filtered.length > 0 && (
        <div
          style={{ left: menu.x, top: menu.y }}
          className="fixed z-[60] w-56 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl"
        >
          <p className="px-2 pb-1 pt-1 text-label uppercase text-subtle">Blocos</p>
          {filtered.map((b, i) => {
            const Icon = b.icon;
            return (
              <button
                key={b.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  apply(b);
                }}
                onMouseEnter={() => setSel(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 h-8 text-dense text-foreground",
                  i === sel ? "bg-elevated" : "hover:bg-elevated",
                )}
              >
                <Icon className="size-3.5 text-subtle" />
                {b.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
