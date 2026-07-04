"use client";

import * as React from "react";
import { Download, FileText, ImageIcon, Trash2, Upload } from "lucide-react";
import type { AttachmentDTO } from "@wayline/db";
import { cn } from "@wayline/ui";
import {
  attachmentsEnabledAction,
  confirmUploadAction,
  createUploadUrlAction,
  deleteAttachmentAction,
  downloadUrlAction,
  listAttachmentsAction,
  previewUrlAction,
} from "@/actions/attachments";

const fieldLabel = "text-label uppercase text-subtle";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isImage = (ct: string) => ct.startsWith("image/");

/** Miniatura de imagem (busca a URL de preview sob demanda). */
function Thumb({ orgId, att }: { orgId: string; att: AttachmentDTO }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    previewUrlAction(orgId, att.id).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [orgId, att.id]);

  if (!url) {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-elevated text-muted">
        <ImageIcon className="size-4" />
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => window.open(url, "_blank")}
      className="size-9 shrink-0 overflow-hidden rounded-md bg-elevated"
      aria-label="Ver imagem"
    >
      <img src={url} alt={att.fileName} className="size-full object-cover" />
    </button>
  );
}

export function AttachmentsSection({
  orgId,
  taskId,
  onCountChange,
}: {
  orgId: string;
  taskId: string;
  onCountChange?: (count: number) => void;
}) {
  const [items, setItems] = React.useState<AttachmentDTO[] | null>(null);
  const [enabled, setEnabled] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const itemsRef = React.useRef<AttachmentDTO[]>([]);
  itemsRef.current = items ?? [];

  React.useEffect(() => {
    let alive = true;
    listAttachmentsAction(orgId, taskId).then((a) => alive && setItems(a));
    attachmentsEnabledAction().then((e) => alive && setEnabled(e));
    return () => {
      alive = false;
    };
  }, [orgId, taskId]);

  async function uploadOne(file: File): Promise<AttachmentDTO | null> {
    const target = await createUploadUrlAction(orgId, taskId, file.name, file.type, file.size);
    if ("error" in target) {
      setError(target.error);
      return null;
    }
    const put = await fetch(target.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
    if (!put.ok) {
      setError("Falha no upload (verifique o CORS do bucket).");
      return null;
    }
    return confirmUploadAction(orgId, taskId, target.key, file.name, file.type, file.size);
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0 || !enabled) return;
    setError(null);
    setBusy(true);
    try {
      const added: AttachmentDTO[] = [];
      for (const file of files) {
        const dto = await uploadOne(file);
        if (dto) added.push(dto);
      }
      if (added.length) {
        const next = [...itemsRef.current, ...added];
        setItems(next);
        onCountChange?.(next.length);
      }
    } catch {
      setError("Não foi possível enviar o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    void uploadFiles(files);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    void uploadFiles(Array.from(e.dataTransfer.files ?? []));
  }

  function onPaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.files ?? []);
    if (files.length) {
      e.preventDefault();
      void uploadFiles(files);
    }
  }

  async function download(a: AttachmentDTO) {
    const url = await downloadUrlAction(orgId, a.id);
    if (url) window.open(url, "_blank");
  }

  async function remove(id: string) {
    const next = itemsRef.current.filter((a) => a.id !== id);
    setItems(next);
    onCountChange?.(next.length);
    await deleteAttachmentAction(orgId, id).catch(() => {});
  }

  return (
    <div
      className="border-t border-border px-5 py-4"
      onPaste={onPaste}
      onDragOver={(e) => {
        if (!enabled) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={fieldLabel}>Anexos {items ? `(${items.length})` : ""}</span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || !enabled}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-md px-2 text-dense font-medium transition-colors",
            enabled ? "text-brand hover:bg-brand/10" : "cursor-not-allowed text-subtle",
          )}
        >
          <Upload className="size-4" />
          {busy ? "Enviando…" : "Enviar"}
        </button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={onInput} />
      </div>

      {!enabled && (
        <p className="mb-2 text-dense text-subtle">Storage não configurado neste ambiente.</p>
      )}
      {error && <p className="mb-2 text-dense text-danger">{error}</p>}

      <div
        className={cn(
          "rounded-lg transition-colors",
          dragging && "outline outline-2 outline-dashed outline-brand/50 bg-brand/5",
        )}
      >
        {items === null ? (
          <p className="px-1 py-1.5 text-dense text-subtle">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="px-1 py-3 text-center text-dense text-subtle">
            {enabled ? "Arraste arquivos aqui, cole ou clique em Enviar." : "Nenhum anexo."}
          </p>
        ) : (
          <div className="space-y-1">
            {items.map((a) => (
              <div key={a.id} className="group flex items-center gap-2.5 rounded-md px-1 py-1.5">
                {isImage(a.contentType) ? (
                  <Thumb orgId={orgId} att={a} />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-elevated text-muted">
                    <FileText className="size-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ui text-foreground">{a.fileName}</p>
                  <p className="text-[11px] text-subtle">{fmtSize(a.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => download(a)}
                  aria-label="Baixar"
                  className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
                >
                  <Download className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  aria-label="Excluir anexo"
                  className="flex size-7 items-center justify-center rounded-md text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {items !== null && items.length > 0 && enabled && (
        <p className="mt-2 text-[11px] text-subtle">
          Arraste ou cole para adicionar · até 25MB por arquivo.
        </p>
      )}
    </div>
  );
}
