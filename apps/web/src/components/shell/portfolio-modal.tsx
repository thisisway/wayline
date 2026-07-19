"use client";

import * as React from "react";
import { Image as ImageIcon, Plus, Trash2, Upload, X } from "lucide-react";
import type { PortfolioItemDTO } from "@wayline/db";
import { Button, Input, cn } from "@wayline/ui";
import {
  createPortfolioAction,
  deletePortfolioAction,
  listPortfolioAction,
  updatePortfolioAction,
} from "@/actions/portfolio";

function fileToImageDataUrl(file: File, max = 640): Promise<string> {
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
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function PortfolioModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [list, setList] = React.useState<PortfolioItemDTO[] | null>(null);
  const [sel, setSel] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [image, setImage] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reload = React.useCallback(() => listPortfolioAction(orgId).then(setList), [orgId]);
  React.useEffect(() => {
    reload();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orgId, reload, onClose]);

  function edit(p: PortfolioItemDTO) {
    setSel(p.id);
    setTitle(p.title);
    setLinkUrl(p.linkUrl ?? "");
    setImage(p.imageUrl);
    setMsg(null);
  }
  function blank() {
    setSel("new");
    setTitle("");
    setLinkUrl("");
    setImage("");
    setMsg(null);
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setMsg("Selecione uma imagem (máx. 10MB).");
      return;
    }
    try {
      setImage(await fileToImageDataUrl(file));
    } catch {
      setMsg("Não foi possível processar a imagem.");
    }
  }

  async function save() {
    if (!image || saving) return;
    setSaving(true);
    const input = { title, imageUrl: image, linkUrl: linkUrl || null };
    if (sel === "new") await createPortfolioAction(orgId, input).catch(() => null);
    else if (sel) await updatePortfolioAction(orgId, sel, input).catch(() => {});
    setSaving(false);
    setSel(null);
    reload();
  }
  async function remove(id: string) {
    await deletePortfolioAction(orgId, id);
    if (sel === id) setSel(null);
    reload();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 font-display text-h3 font-bold">
            <ImageIcon className="size-4.5" /> Portfólio
          </h2>
          <div className="flex items-center gap-2">
            {sel === null && (
              <Button size="sm" onClick={blank}>
                <Plus className="size-4" /> Novo case
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {sel !== null ? (
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border bg-canvas">
              {image ? (
                <img src={image} alt="Case" className="size-full object-cover" />
              ) : (
                <span className="text-dense text-subtle">Sem imagem</span>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" /> Enviar imagem
              </Button>
              {msg && <span className="text-dense text-danger">{msg}</span>}
            </div>
            <label className="block">
              <span className="text-dense font-medium text-muted">Título</span>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="Nome do cliente/projeto" />
            </label>
            <label className="block">
              <span className="text-dense font-medium text-muted">Link (opcional)</span>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="mt-1" placeholder="https://…" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSel(null)}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={!image || saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5">
            {list === null ? (
              <p className="text-dense text-subtle">Carregando…</p>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted">
                <ImageIcon className="size-8 text-subtle" />
                <p className="text-ui">Nenhum case ainda. Adicione seus trabalhos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {list.map((p) => (
                  <div key={p.id} className="group relative overflow-hidden rounded-lg border border-border">
                    <button type="button" onClick={() => edit(p)} className="block w-full">
                      <img src={p.imageUrl} alt={p.title} className="aspect-video w-full object-cover" />
                      <p className="truncate px-2 py-1.5 text-left text-dense font-medium text-foreground">
                        {p.title || "Sem título"}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      aria-label="Excluir"
                      className={cn(
                        "absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-md bg-surface/90 text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100",
                      )}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
