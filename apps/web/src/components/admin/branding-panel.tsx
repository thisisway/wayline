"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import type { PlatformBranding } from "@wayline/db";
import { Button, Input, cn } from "@wayline/ui";
import { setPlatformBrandingAction } from "@/actions/admin";

const SWATCHES = ["#1D66FF", "#7C5CFF", "#17C86A", "#FF3B30", "#FFB800", "#0EA5E9", "#EC4899", "#0B1023"];

/** Redimensiona a imagem preservando o aspecto (PNG, mantém transparência). */
function fileToImageDataUrl(file: File, max = 320): Promise<string> {
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

/** Um slot de upload de logo, com preview no fundo do tema correspondente. */
function LogoSlot({
  label,
  hint,
  value,
  dark,
  onChange,
  onError,
}: {
  label: string;
  hint: string;
  value: string;
  dark: boolean;
  onChange: (v: string) => void;
  onError: (msg: string) => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      onError("Selecione uma imagem (máx. 10MB).");
      return;
    }
    try {
      onChange(await fileToImageDataUrl(file));
    } catch {
      onError("Não foi possível processar a imagem.");
    }
  }
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-dense font-medium text-foreground">{label}</p>
      <p className="mb-2 text-[11px] text-subtle">{hint}</p>
      {/* Preview no fundo do tema */}
      <div
        className={cn(
          "mb-2 flex h-16 items-center justify-center rounded-md border",
          dark ? "border-white/10 bg-[#0B1023]" : "border-black/10 bg-[#F7F9FC]",
        )}
      >
        {value ? (
          <img src={value} alt="" className="max-h-10 max-w-[80%] object-contain" />
        ) : (
          <span className={cn("text-dense", dark ? "text-white/50" : "text-black/40")}>
            sem logo
          </span>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onPick} />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 h-8 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
        >
          <Upload className="size-3.5" /> Enviar
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11px] font-medium text-subtle transition-colors hover:text-danger"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}

export function BrandingPanel({ initial }: { initial: PlatformBranding }) {
  const router = useRouter();
  const [logoLight, setLogoLight] = React.useState(initial.logoUrl ?? "");
  const [logoDark, setLogoDark] = React.useState(initial.logoUrlDark ?? "");
  const [icon, setIcon] = React.useState(initial.iconUrl ?? "");
  const [favicon, setFavicon] = React.useState(initial.faviconUrl ?? "");
  const [color, setColor] = React.useState(initial.brandColor ?? "");
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ text: string; ok: boolean } | null>(null);
  const iconRef = React.useRef<HTMLInputElement>(null);
  const faviconRef = React.useRef<HTMLInputElement>(null);

  async function pickInto(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void,
    size: number,
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setMsg({ text: "Selecione uma imagem (máx. 5MB).", ok: false });
      return;
    }
    try {
      setter(await fileToImageDataUrl(file, size));
    } catch {
      setMsg({ text: "Não foi possível processar a imagem.", ok: false });
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setMsg(null);
    const res = await setPlatformBrandingAction({
      logoUrl: logoLight || null,
      logoUrlDark: logoDark || null,
      iconUrl: icon || null,
      faviconUrl: favicon || null,
      brandColor: color || null,
    }).catch(() => "error" as const);
    setSaving(false);
    if (res === "ok") {
      setMsg({ text: "Marca salva. Recarregue para ver em todo o sistema.", ok: true });
      router.refresh();
    } else if (res === "invalid") {
      setMsg({ text: "Cor inválida — use um hex como #1D66FF.", ok: false });
    } else {
      setMsg({
        text: "Não foi possível salvar. A migração das colunas de marca (0029/0030) já foi aplicada no banco?",
        ok: false,
      });
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="mb-1 font-display text-h2 font-bold">Marca da plataforma</h2>
      <p className="mb-6 text-dense text-muted">
        Logotipo e cor de destaque de <strong>todo o sistema</strong>. O logo troca
        automaticamente conforme o tema (claro/escuro) do usuário.
      </p>

      <div className="space-y-6 rounded-xl border border-border bg-surface p-5">
        {/* Logos claro/escuro */}
        <div>
          <label className="text-label uppercase text-subtle">Logotipo</label>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <LogoSlot
              label="Tema claro"
              hint="Para fundos claros (logo escuro/colorido)"
              value={logoLight}
              dark={false}
              onChange={setLogoLight}
              onError={(t) => setMsg({ text: t, ok: false })}
            />
            <LogoSlot
              label="Tema escuro"
              hint="Para fundos escuros (logo claro/branco)"
              value={logoDark}
              dark
              onChange={setLogoDark}
              onError={(t) => setMsg({ text: t, ok: false })}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-subtle">
            Se preencher só um, ele é usado nos dois temas.
          </p>
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

        {/* Ícone da barra lateral (símbolo) */}
        <div>
          <label className="text-label uppercase text-subtle">Ícone da barra lateral</label>
          <p className="mb-2 text-[11px] text-subtle">
            Símbolo quadrado para a barra lateral (espaço estreito, fundo escuro). Se vazio, usa o
            logo.
          </p>
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0B1023]">
              {icon ? (
                <img src={icon} alt="Ícone" className="size-full object-contain" />
              ) : (
                <span className="text-[10px] text-white/50">—</span>
              )}
            </span>
            <input
              ref={iconRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickInto(e, setIcon, 128)}
            />
            <button
              type="button"
              onClick={() => iconRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 h-8 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
            >
              <Upload className="size-3.5" /> Enviar ícone
            </button>
            {icon && (
              <button
                type="button"
                onClick={() => setIcon("")}
                className="text-[11px] font-medium text-subtle transition-colors hover:text-danger"
              >
                Remover
              </button>
            )}
          </div>
        </div>

        {/* Favicon */}
        <div>
          <label className="text-label uppercase text-subtle">Favicon</label>
          <p className="mb-2 text-[11px] text-subtle">Ícone da aba do navegador (quadrado).</p>
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-canvas">
              {favicon ? (
                <img src={favicon} alt="Favicon" className="size-full object-contain" />
              ) : (
                <span className="text-[10px] text-subtle">—</span>
              )}
            </span>
            <input
              ref={faviconRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickInto(e, setFavicon, 64)}
            />
            <button
              type="button"
              onClick={() => faviconRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 h-8 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
            >
              <Upload className="size-3.5" /> Enviar favicon
            </button>
            {favicon && (
              <button
                type="button"
                onClick={() => setFavicon("")}
                className="text-[11px] font-medium text-subtle transition-colors hover:text-danger"
              >
                Remover
              </button>
            )}
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
        Deixe tudo vazio para voltar ao padrão Wayline (Way Blue + logo “W”).
      </p>
    </div>
  );
}
