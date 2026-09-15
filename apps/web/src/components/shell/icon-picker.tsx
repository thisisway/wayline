"use client";

import * as React from "react";
import { ImageIcon, X } from "lucide-react";
import { cn } from "@wayline/ui";

/** Um ícone é imagem quando é um data URL; senão é emoji/texto. */
export function isImageIcon(icon?: string | null): boolean {
  return !!icon && icon.startsWith("data:");
}

/** Renderiza o conteúdo de um ícone: imagem (data URL) ou emoji/letra. */
export function IconContent({ icon, fallback }: { icon?: string | null; fallback: string }) {
  if (isImageIcon(icon)) {
    return <img src={icon!} alt="" className="size-full rounded object-cover" />;
  }
  return <>{icon ?? fallback}</>;
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

const EMOJIS = [
  "🚀", "🎯", "📊", "📈", "💡", "🎨", "📝", "✅", "📁", "📌",
  "🔥", "⭐", "💼", "🧩", "⚙️", "🌐", "📣", "💬", "🏷️", "📅",
  "💰", "🎬", "📷", "🎧", "🖥️", "📱", "🛠️", "🧠", "🏆", "🎉",
  "🚩", "📦", "🗂️", "🧭", "🔒", "🔑", "❤️", "🌟",
];

export const ICON_COLORS = [
  "#1D66FF", "#7C5CFF", "#0EA5E9", "#17C86A", "#FFB800",
  "#F97316", "#FF3B30", "#EC4899", "#94A3B8",
];

/** Popover de personalização: grade de emojis + (opcional) cores. */
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
  onPickEmoji: (emoji: string) => void;
  onPickColor?: (color: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [err, setErr] = React.useState<string | null>(null);

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
    // Timeout evita fechar no mesmo clique que abriu.
    const t = setTimeout(() => window.addEventListener("mousedown", onClick), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      clearTimeout(t);
    };
  }, [onClose]);

  // Mantém o popover dentro da tela.
  const left = Math.min(anchor.x, (typeof window !== "undefined" ? window.innerWidth : 1000) - 288);
  const top = Math.min(anchor.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 320);

  return (
    <div
      ref={ref}
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
      className="fixed z-[70] w-[272px] rounded-lg border border-border bg-surface p-2 shadow-xl"
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
      <div className="grid grid-cols-8 gap-0.5">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onPickEmoji(e)}
            className="flex size-8 items-center justify-center rounded text-lg hover:bg-elevated"
          >
            {e}
          </button>
        ))}
      </div>
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
