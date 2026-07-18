"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import type { PlatformBranding } from "@wayline/db";
import { Button, Input, cn } from "@wayline/ui";
import { setPlatformBrandingAction } from "@/actions/admin";

const SWATCHES = ["#1D66FF", "#7C5CFF", "#17C86A", "#FF3B30", "#FFB800", "#0EA5E9", "#EC4899", "#0B1023"];

/** Redimensiona a imagem preservando o aspecto (PNG, mantém transparência). */
function fileToImageDataUrl(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("ctx"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function BrandingPanel({ initial }: { initial: PlatformBranding }) {
  const router = useRouter();
  const [logo, setLogo] = React.useState(initial.logoUrl ?? "");
  const [color, setColor] = React.useState(initial.brandColor ?? "");
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setMsg({ text: "Selecione uma imagem (máx. 10MB).", ok: false });
      return;
    }
    try {
      setMsg(null);
      setLogo(await fileToImageDataUrl(file));
    } catch {
      setMsg({ text: "Não foi possível processar a imagem.", ok: false });
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setMsg(null);
    const res = await setPlatformBrandingAction({
      logoUrl: logo || null,
      brandColor: color || null,
    }).catch(() => "error" as const);
    setSaving(false);
    if (res === "ok") {
      setMsg({ text: "Marca salva. Recarregue para ver em todo o sistema.", ok: true });
      router.refresh();
    } else if (res === "invalid") {
      setMsg({ text: "Cor inválida — use um hex como #1D66FF.", ok: false });
    } else {
      setMsg({ text: "Não foi possível salvar.", ok: false });
    }
  }

  const previewStyle = color
    ? ({ backgroundColor: color } as React.CSSProperties)
    : { backgroundColor: "#1D66FF" };

  return (
    <div className="max-w-2xl">
      <h2 className="mb-1 font-display text-h2 font-bold">Marca da plataforma</h2>
      <p className="mb-6 text-dense text-muted">
        Logo e cor de destaque de <strong>todo o sistema</strong> (barra lateral, botões,
        destaques). Aplica-se a todos os workspaces.
      </p>

      <div className="space-y-6 rounded-xl border border-border bg-surface p-5">
        {/* Logo */}
        <div>
          <label className="text-label uppercase text-subtle">Logotipo</label>
          <div className="mt-2 flex items-center gap-3">
            <span
              className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg font-display text-h3 font-extrabold text-white"
              style={previewStyle}
            >
              {logo ? (
                <img src={logo} alt="Logo" className="size-full object-contain" />
              ) : (
                "W"
              )}
            </span>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Enviar logo
            </Button>
            {logo && (
              <button
                type="button"
                onClick={() => setLogo("")}
                className="text-dense font-medium text-subtle transition-colors hover:text-danger"
              >
                Remover
              </button>
            )}
          </div>
        </div>

        {/* Cor */}
        <div>
          <label className="text-label uppercase text-subtle">Cor de destaque</label>
          <div className="mt-2 flex items-center gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={cn(
                  "size-7 rounded-full border-2 transition-transform hover:scale-110",
                  color.toLowerCase() === c.toLowerCase() ? "border-foreground" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#1D66FF"
              className="h-9 w-32"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar marca"}
          </Button>
          {msg && (
            <span className={cn("text-dense", msg.ok ? "text-success" : "text-danger")}>
              {msg.text}
            </span>
          )}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-subtle">
        Deixe vazio para voltar ao padrão Wayline (Way Blue + logo “W”).
      </p>
    </div>
  );
}
