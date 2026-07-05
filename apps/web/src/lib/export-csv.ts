import type { BoardData } from "@wayline/db";

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};

function cell(v: string): string {
  return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("pt-BR") : "";
}

function fmtFieldValue(type: string, value: string): string {
  if (type === "checkbox") return value === "1" ? "Sim" : "Não";
  if (type === "date") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString("pt-BR");
  }
  return value;
}

/** Monta um CSV (delimitado por ;) das tarefas visíveis do board. */
export function boardToCsv(data: BoardData): string {
  // Campos customizados presentes (colunas dinâmicas).
  const cfNames: string[] = [];
  const cfType = new Map<string, string>();
  for (const col of data.columns) {
    for (const t of col.tasks) {
      for (const cf of t.customFields ?? []) {
        if (!cfType.has(cf.name)) {
          cfType.set(cf.name, cf.type);
          cfNames.push(cf.name);
        }
      }
    }
  }

  const header = [
    "Título",
    "Status",
    "Prioridade",
    "Responsáveis",
    "Cliente",
    "Início",
    "Prazo",
    "Tags",
    "Tempo (h)",
    "Subtarefas",
    ...cfNames,
  ];

  const rows: string[] = [header.map(cell).join(";")];

  for (const col of data.columns) {
    for (const t of col.tasks) {
      const cfByName = new Map((t.customFields ?? []).map((c) => [c.name, c]));
      const line = [
        t.title,
        col.name,
        PRIORITY_LABELS[t.priority] ?? t.priority,
        t.assignees.map((a) => a.name).join(", "),
        t.client?.name ?? "",
        fmtDate(t.startDate),
        fmtDate(t.dueDate),
        t.tags.map((tag) => tag.label).join(", "),
        t.trackedSeconds > 0 ? (t.trackedSeconds / 3600).toFixed(2) : "",
        t.subtaskTotal > 0 ? `${t.subtaskDone}/${t.subtaskTotal}` : "",
        ...cfNames.map((name) => {
          const cf = cfByName.get(name);
          return cf ? fmtFieldValue(cf.type, cf.value) : "";
        }),
      ];
      rows.push(line.map((v) => cell(String(v))).join(";"));
    }
  }

  return rows.join("\r\n");
}

/** Dispara o download de um CSV (BOM UTF-8 para o Excel PT-BR). */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
