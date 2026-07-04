"use client";

import * as React from "react";
import { Download, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import type { AttachmentDTO } from "@wayline/db";
import { cn } from "@wayline/ui";
import {
  attachmentsEnabledAction,
  confirmUploadAction,
  createUploadUrlAction,
  deleteAttachmentAction,
  downloadUrlAction,
  listAttachmentsAction,
} from "@/actions/attachments";

const fieldLabel = "text-label uppercase text-subtle";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let alive = true;
    listAttachmentsAction(orgId, taskId).then((a) => alive && setItems(a));
    attachmentsEnabledAction().then((e) => alive && setEnabled(e));
    return () => {
      alive = false;
    };
  }, [orgId, taskId]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const target = await createUploadUrlAction(
        orgId,
        taskId,
        file.name,
        file.type,
        file.size,
      );
      if ("error" in target) {
        setError(target.error);
        return;
      }
      const put = await fetch(target.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!put.ok) {
        setError("Falha no upload (verifique o CORS do bucket).");
        return;
      }
      const dto = await confirmUploadAction(
        orgId,
        taskId,
        target.key,
        file.name,
        file.type,
        file.size,
      );
      if (dto) {
        const next = [...(items ?? []), dto];
        setItems(next);
        onCountChange?.(next.length);
      }
    } catch {
      setError("Não foi possível enviar o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  async function download(a: AttachmentDTO) {
    const url = await downloadUrlAction(orgId, a.id);
    if (url) window.open(url, "_blank");
  }

  async function remove(id: string) {
    const next = (items ?? []).filter((a) => a.id !== id);
    setItems(next);
    onCountChange?.(next.length);
    await deleteAttachmentAction(orgId, id).catch(() => {});
  }

  return (
    <div className="border-t border-border px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className={fieldLabel}>Anexos {items ? `(${items.length})` : ""}</span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || !enabled}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 h-8 text-dense font-medium transition-colors",
            enabled
              ? "text-brand hover:bg-brand/10"
              : "cursor-not-allowed text-subtle",
          )}
        >
          <Upload className="size-4" />
          {busy ? "Enviando…" : "Enviar"}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={onFile} />
      </div>

      {!enabled && (
        <p className="mb-2 text-dense text-subtle">Storage não configurado neste ambiente.</p>
      )}
      {error && <p className="mb-2 text-dense text-danger">{error}</p>}

      <div className="space-y-1">
        {items === null ? (
          <p className="text-dense text-subtle">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="text-dense text-subtle">Nenhum anexo.</p>
        ) : (
          items.map((a) => (
            <div key={a.id} className="group flex items-center gap-2.5 rounded-md px-1 py-1.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-elevated text-muted">
                <FileText className="size-4" />
              </span>
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
          ))
        )}
      </div>

      {items !== null && items.length === 0 && enabled && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-subtle">
          <Paperclip className="size-3" /> Até 25MB por arquivo.
        </p>
      )}
    </div>
  );
}
