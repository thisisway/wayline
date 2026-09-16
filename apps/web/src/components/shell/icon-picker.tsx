"use client";

import * as React from "react";
import {
  ImageIcon,
  X,
  // ícones oferecidos no seletor (também usados pra renderizar `lucide:Nome`)
  Rocket, Target, BarChart3, LineChart, PieChart, TrendingUp, Activity, Zap,
  Flame, Star, Heart, Bookmark, Flag, Bell, Calendar, Clock, CircleCheck,
  ListChecks, Folder, FileText, Briefcase, Layers, Package, Tag, Link,
  Settings, Wrench, Palette, Brush, PenTool, Lightbulb, Search, Lock, Key,
  Globe, Cloud, Database, Server, Code, Terminal, Cpu, Smartphone, Monitor,
  Camera, Video, Music, Headphones, Megaphone, Mail, MessageSquare, Users,
  User, Building2, ShoppingCart, DollarSign, CreditCard, Wallet, Trophy,
  Award, Gift, Coffee, Compass, Map, Home, Sparkles, Kanban, Gauge, Filter,
  Inbox, Send, type LucideIcon,
} from "lucide-react";
import { cn } from "@wayline/ui";

/** Um ícone é imagem quando é um data URL. */
export function isImageIcon(icon?: string | null): boolean {
  return !!icon && icon.startsWith("data:");
}
/** Um ícone é um ícone Lucide quando começa com `lucide:`. */
function isLucideIcon(icon?: string | null): boolean {
  return !!icon && icon.startsWith("lucide:");
}
/** Contém pelo menos um caractere de emoji? (distingue emoji de letra-fallback) */
function isEmoji(s?: string | null): boolean {
  return !!s && /\p{Extended_Pictographic}/u.test(s);
}

/** Catálogo de ícones Lucide oferecidos (nome Lucide → componente). */
export const LUCIDE_ICONS: Record<string, LucideIcon> = {
  Rocket, Target, BarChart3, LineChart, PieChart, TrendingUp, Activity, Zap,
  Flame, Star, Heart, Bookmark, Flag, Bell, Calendar, Clock, CircleCheck,
  ListChecks, Folder, FileText, Briefcase, Layers, Package, Tag, Link,
  Settings, Wrench, Palette, Brush, PenTool, Lightbulb, Search, Lock, Key,
  Globe, Cloud, Database, Server, Code, Terminal, Cpu, Smartphone, Monitor,
  Camera, Video, Music, Headphones, Megaphone, Mail, MessageSquare, Users,
  User, Building2, ShoppingCart, DollarSign, CreditCard, Wallet, Trophy,
  Award, Gift, Coffee, Compass, Map, Home, Sparkles, Kanban, Gauge, Filter,
  Inbox, Send,
};

// --- Twemoji (emojis estilo Twitter, CC-BY 4.0, servidos por CDN) ------------
/** Converte um emoji unicode nos codepoints usados no nome do arquivo Twemoji. */
function toCodePoint(str: string): string {
  const r: string[] = [];
  let p = 0;
  for (let i = 0; i < str.length; ) {
    const c = str.charCodeAt(i++);
    if (p) {
      r.push((0x10000 + ((p - 0xd800) << 10) + (c - 0xdc00)).toString(16));
      p = 0;
    } else if (c >= 0xd800 && c <= 0xdbff) {
      p = c;
    } else {
      r.push(c.toString(16));
    }
  }
  return r.join("-");
}
function twemojiUrl(emoji: string): string {
  // Twemoji remove todos os seletores de variação (FE0F) do nome do arquivo.
  const cp = toCodePoint(emoji.includes("️") ? emoji.replace(/️/g, "") : emoji);
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${cp}.svg`;
}

/** Emoji renderizado como imagem Twemoji; cai pro emoji nativo se a imagem falhar. */
function Twemoji({ emoji, className }: { emoji: string; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) return <>{emoji}</>;
  return (
    <img
      src={twemojiUrl(emoji)}
      alt={emoji}
      draggable={false}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

/** Renderiza o conteúdo de um ícone: imagem enviada, ícone Lucide, emoji (Twemoji) ou letra. */
export function IconContent({ icon, fallback }: { icon?: string | null; fallback: string }) {
  if (isImageIcon(icon)) {
    return <img src={icon!} alt="" className="size-full rounded object-cover" />;
  }
  if (isLucideIcon(icon)) {
    const Ico = LUCIDE_ICONS[icon!.slice(7)];
    if (Ico) return <Ico className="size-full p-px" strokeWidth={2.25} />;
  }
  const value = icon ?? fallback;
  if (isEmoji(value)) return <Twemoji emoji={value} className="size-full object-contain" />;
  return <>{value}</>;
}

/**
 * Rasteriza qualquer PNG/JPG/SVG num PNG quadrado 64×64 (recorte central),
 * devolvendo um data URL pequeno. Rejeita arquivos grandes ou de tipo inválido.
 */
function processToIcon(file: File): Promise<string | null> {
  const ok = ["image/png", "image/jpeg", "image/svg+xml"].includes(file.type);
  if (!ok) return Promise.resolve(null);
  const maxIn = file.type === "image/svg+xml" ? 200 * 1024 : 3 * 1024 * 1024;
  if (file.size > maxIn) return Promise.resolve(null);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        const w = img.width || size;
        const h = img.height || size;
        const side = Math.min(w, h);
        ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Emojis por categoria (unicode nativo; renderizados via Twemoji). */
const EMOJI_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Expressões",
    items: "😀 😄 😁 😅 😂 🙂 😉 😊 😍 😘 😎 🤔 🤨 😐 😴 😇 🥳 😢 😡 🤯 🤗 🙌 👍 👎 👏 🙏 💪 👀 🧠".split(" "),
  },
  {
    label: "Trabalho & objetos",
    items: "💼 📁 📂 🗂️ 📌 📎 📝 📅 📆 🗓️ 📊 📈 📉 📋 🖊️ ✏️ 📐 💡 🔍 🔒 🔑 🗝️ ⚙️ 🛠️ 🔧 🖥️ 💻 📱 ⌨️ 🖨️ 💾 📷 🎥 🎬 🎧 🎨 🖌️ 🧩 📦 🏷️ 🔗".split(" "),
  },
  {
    label: "Símbolos",
    items: "✅ ❌ ⭐ 🌟 🔥 ⚡ 💥 ✨ 🚀 🎯 🏆 🥇 🚩 ⚠️ ❗ ❓ 💯 ♻️ ✔️ ➕ 💰 💵 💳 📢 📣 🔔 ❤️ 🧡 💛 💚 💙 💜 🖤".split(" "),
  },
  {
    label: "Mundo & mais",
    items: "🌐 🌍 🌱 🌳 🌵 🌸 🌺 🌈 ☀️ 🌙 ⛅ ❄️ 💧 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ ☕ 🍕 🎉 🎁 🏅".split(" "),
  },
];

const LUCIDE_NAMES = Object.keys(LUCIDE_ICONS);

export const ICON_COLORS = [
  "#1D66FF", "#7C5CFF", "#0EA5E9", "#17C86A", "#FFB800",
  "#F97316", "#FF3B30", "#EC4899", "#94A3B8",
];

/** Popover de personalização: emojis (Twitter) + ícones (Lucide) + upload + cores. */
export function IconPicker({
  anchor,
  color,
  withColors,
  onPickEmoji,
  onPickColor,
  onRemove,
  onClose,
}: {
  anchor: { x: number; y: number };
  color?: string;
  withColors?: boolean;
  /** Recebe a string do ícone: emoji, `lucide:Nome` ou data URL. */
  onPickEmoji: (icon: string) => void;
  onPickColor?: (color: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"emoji" | "icons">("emoji");
  const [query, setQuery] = React.useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    const dataUrl = await processToIcon(file).catch(() => null);
    if (dataUrl) onPickEmoji(dataUrl);
    else setErr("Use PNG, JPG ou SVG (máx. 3MB / 200KB SVG).");
  }

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => window.addEventListener("mousedown", onClick), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      clearTimeout(t);
    };
  }, [onClose]);

  const icons = query
    ? LUCIDE_NAMES.filter((n) => n.toLowerCase().includes(query.toLowerCase()))
    : LUCIDE_NAMES;

  // Mantém o popover dentro da tela.
  const w = 296;
  const left = Math.min(anchor.x, (typeof window !== "undefined" ? window.innerWidth : 1000) - w - 8);
  const top = Math.min(anchor.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 380);

  return (
    <div
      ref={ref}
      style={{ left: Math.max(8, left), top: Math.max(8, top), width: w }}
      className="fixed z-[70] rounded-lg border border-border bg-surface p-2 shadow-xl"
    >
      {withColors && onPickColor && (
        <div className="mb-2 flex flex-wrap gap-1.5 border-b border-border px-1 pb-2">
          {ICON_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onPickColor(c)}
              aria-label={`Cor ${c}`}
              className={cn(
                "size-5 rounded-full border-2 transition-transform hover:scale-110",
                color === c ? "border-foreground" : "border-transparent",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      <div className="mb-2 flex gap-1 rounded-md bg-elevated p-0.5">
        {(["emoji", "icons"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded px-2 h-7 text-dense font-medium transition-colors",
              tab === t ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
            )}
          >
            {t === "emoji" ? "Emoji" : "Ícones"}
          </button>
        ))}
      </div>

      {tab === "emoji" ? (
        <div className="max-h-[220px] overflow-y-auto pr-0.5">
          {EMOJI_GROUPS.map((g) => (
            <div key={g.label} className="mb-1.5">
              <p className="px-1 pb-1 text-label uppercase text-subtle">{g.label}</p>
              <div className="grid grid-cols-8 gap-0.5">
                {g.items.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => onPickEmoji(e)}
                    className="flex size-8 items-center justify-center rounded p-1 hover:bg-elevated"
                  >
                    <Twemoji emoji={e} className="size-full object-contain" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ícone…"
            className="mb-1.5 h-8 w-full rounded-md border border-border bg-surface px-2 text-dense text-foreground placeholder:text-subtle/60 focus-visible:border-brand focus-visible:outline-none"
          />
          <div className="grid max-h-[184px] grid-cols-8 gap-0.5 overflow-y-auto pr-0.5">
            {icons.map((name) => {
              const Ico = LUCIDE_ICONS[name]!;
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => onPickEmoji(`lucide:${name}`)}
                  className="flex size-8 items-center justify-center rounded text-muted hover:bg-elevated hover:text-foreground"
                >
                  <Ico className="size-4" />
                </button>
              );
            })}
            {icons.length === 0 && (
              <p className="col-span-8 px-1 py-2 text-dense text-subtle">Nada encontrado.</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-1 border-t border-border pt-1.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden"
          onChange={onFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-1.5 rounded px-2 h-8 text-dense text-muted hover:bg-elevated hover:text-foreground"
        >
          <ImageIcon className="size-3.5" /> Enviar imagem (PNG/JPG/SVG)
        </button>
        {err && <p className="px-1 pt-1 text-[11px] text-danger">{err}</p>}
        <button
          type="button"
          onClick={onRemove}
          className="flex w-full items-center justify-center gap-1.5 rounded px-2 h-8 text-dense text-subtle hover:text-foreground"
        >
          <X className="size-3.5" /> Remover ícone
        </button>
      </div>
    </div>
  );
}
