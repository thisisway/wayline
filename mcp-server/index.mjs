#!/usr/bin/env node
/**
 * Servidor MCP da Wayline (stdio). Expõe ferramentas pequenas e compactas para
 * um agente de IA descobrir e operar a Wayline via a API HTTP /api/v1.
 *
 * Config por variáveis de ambiente:
 *   WAYLINE_API_URL    base da API (default https://app.wayline.com.br/api/v1)
 *   WAYLINE_API_TOKEN  token pessoal (Configurações → Acesso de IA)
 *
 * Fase 1: somente leitura/descoberta. Escrita entra na fase 2.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.WAYLINE_API_URL || "https://app.wayline.com.br/api/v1").replace(/\/$/, "");
const TOKEN = process.env.WAYLINE_API_TOKEN || "";

function qs(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function api(path, opts = {}) {
  if (!TOKEN) return { error: "missing_token", hint: "Defina WAYLINE_API_TOKEN." };
  try {
    const res = await fetch(BASE + path, {
      method: opts.method || "GET",
      headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) return { error: res.status, body: text.slice(0, 300) };
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text.slice(0, 300) };
    }
  } catch (e) {
    return { error: "network", message: String(e).slice(0, 200) };
  }
}

const ok = (data) => ({ content: [{ type: "text", text: JSON.stringify(data) }] });

const server = new McpServer({ name: "wayline", version: "1.0.0" });

server.tool(
  "whoami",
  "Identidade do token e os workspaces (orgs) disponíveis. Comece por aqui para pegar o orgId.",
  {},
  async () => ok(await api("/whoami")),
);

server.tool(
  "search_clients",
  "Busca clientes por nome (compacto: id + nome). Use antes de acessar projetos.",
  { q: z.string().optional(), orgId: z.string().optional(), limit: z.number().optional() },
  async ({ q, orgId, limit }) => ok(await api(`/clients${qs({ q, orgId, limit })}`)),
);

server.tool(
  "list_client_projects",
  "Lista os projetos (listas/boards) de um cliente. Use o clientId de search_clients.",
  { clientId: z.string(), orgId: z.string().optional() },
  async ({ clientId, orgId }) => ok(await api(`/clients/${clientId}/projects${qs({ orgId })}`)),
);

server.tool(
  "search_projects",
  "Busca projetos (listas) por nome, com o cliente de cada um.",
  { q: z.string().optional(), orgId: z.string().optional(), limit: z.number().optional() },
  async ({ q, orgId, limit }) => ok(await api(`/projects${qs({ q, orgId, limit })}`)),
);

server.tool(
  "get_project",
  "Resumo de um projeto: cliente, colunas de status (para status das tarefas) e total de tarefas.",
  { projectId: z.string(), orgId: z.string().optional() },
  async ({ projectId, orgId }) => ok(await api(`/projects/${projectId}${qs({ orgId })}`)),
);

server.tool(
  "list_project_tasks",
  "Tarefas de um projeto (compactas). Filtre por statusId, assigneeId ou priority; pagine com limit/offset.",
  {
    projectId: z.string(),
    orgId: z.string().optional(),
    statusId: z.string().optional(),
    assigneeId: z.string().optional(),
    priority: z.enum(["urgent", "high", "normal", "low"]).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  },
  async ({ projectId, orgId, statusId, assigneeId, priority, limit, offset }) =>
    ok(await api(`/projects/${projectId}/tasks${qs({ orgId, statusId, assigneeId, priority, limit, offset })}`)),
);

server.tool(
  "get_task",
  "Detalhe compacto de uma tarefa (descrição, responsáveis, prazo, tags, subtarefas).",
  { taskId: z.string(), orgId: z.string().optional() },
  async ({ taskId, orgId }) => ok(await api(`/tasks/${taskId}${qs({ orgId })}`)),
);

server.tool(
  "list_task_comments",
  "Comentários de uma tarefa (autor + texto). Carregue só quando precisar do histórico.",
  { taskId: z.string(), orgId: z.string().optional() },
  async ({ taskId, orgId }) => ok(await api(`/tasks/${taskId}/comments${qs({ orgId })}`)),
);

server.tool(
  "list_members",
  "Membros da org (para achar responsáveis). Filtre por nome com q.",
  { orgId: z.string().optional(), q: z.string().optional() },
  async ({ orgId, q }) => ok(await api(`/members${qs({ orgId, q })}`)),
);

server.tool(
  "get_project_context",
  "Brief/contexto do projeto (texto compacto). Use para entender o projeto antes de agir.",
  { projectId: z.string(), orgId: z.string().optional() },
  async ({ projectId, orgId }) => ok(await api(`/projects/${projectId}/context${qs({ orgId })}`)),
);

// --- Escrita (fase 2). Requer token com escopo "Leitura + escrita". ---------
// Confirme o projeto/tarefa certos antes de escrever; destrutivo pede confirmação.

const taskShape = {
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(["urgent", "high", "normal", "low"]).optional(),
  dueDate: z.string().optional().describe("YYYY-MM-DD"),
  assigneeIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional().describe("setores/labels, ex.: ['Design','Dev']"),
  statusId: z.string().optional(),
};

server.tool(
  "create_task",
  "Cria uma tarefa num projeto. statusId opcional (default: 1ª coluna). tags = setores.",
  { projectId: z.string(), orgId: z.string().optional(), ...taskShape },
  async ({ orgId, ...body }) => ok(await api("/tasks", { method: "POST", body: { orgId, ...body } })),
);

server.tool(
  "create_tasks_bulk",
  "Cria várias tarefas de uma vez no mesmo projeto (máx. 50). Use para montar um plano inteiro.",
  {
    projectId: z.string(),
    orgId: z.string().optional(),
    statusId: z.string().optional(),
    tasks: z.array(z.object(taskShape)),
  },
  async ({ orgId, ...body }) =>
    ok(await api("/tasks/bulk", { method: "POST", body: { orgId, ...body } })),
);

server.tool(
  "update_task",
  "Atualiza campos de uma tarefa (parcial): title, description, priority, dueDate, statusId, tags, assigneeIds.",
  {
    taskId: z.string(),
    orgId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(["urgent", "high", "normal", "low"]).optional(),
    dueDate: z.string().optional(),
    statusId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    assigneeIds: z.array(z.string()).optional(),
  },
  async ({ taskId, orgId, ...body }) =>
    ok(await api(`/tasks/${taskId}`, { method: "PATCH", body: { orgId, ...body } })),
);

server.tool(
  "assign_task",
  "Define os responsáveis de uma tarefa (substitui a lista). Pegue os ids em list_members.",
  { taskId: z.string(), orgId: z.string().optional(), assigneeIds: z.array(z.string()) },
  async ({ taskId, orgId, assigneeIds }) =>
    ok(await api(`/tasks/${taskId}/assign`, { method: "POST", body: { orgId, assigneeIds } })),
);

server.tool(
  "add_comment",
  "Adiciona um comentário a uma tarefa.",
  { taskId: z.string(), orgId: z.string().optional(), body: z.string() },
  async ({ taskId, orgId, body }) =>
    ok(await api(`/tasks/${taskId}/comments`, { method: "POST", body: { orgId, body } })),
);

server.tool(
  "add_project_context",
  "Anexa uma nota ao brief/contexto do projeto.",
  { projectId: z.string(), orgId: z.string().optional(), note: z.string() },
  async ({ projectId, orgId, note }) =>
    ok(await api(`/projects/${projectId}/context`, { method: "POST", body: { orgId, note } })),
);

server.tool(
  "delete_task",
  "EXCLUI (soft) uma tarefa. Destrutivo: só chame após confirmação explícita do usuário; passe confirm:true.",
  { taskId: z.string(), orgId: z.string().optional(), confirm: z.boolean() },
  async ({ taskId, orgId, confirm }) => {
    if (confirm !== true) {
      return ok({ error: "confirmação obrigatória", hint: "Peça confirmação e chame com confirm:true." });
    }
    return ok(await api(`/tasks/${taskId}${qs({ orgId, confirm: "true" })}`, { method: "DELETE" }));
  },
);

// --- Subtarefas ------------------------------------------------------------
server.tool(
  "list_subtasks",
  "Lista as subtarefas de uma tarefa (id, título, concluída).",
  { taskId: z.string(), orgId: z.string().optional() },
  async ({ taskId, orgId }) => ok(await api(`/tasks/${taskId}/subtasks${qs({ orgId })}`)),
);

server.tool(
  "create_subtask",
  "Cria uma subtarefa dentro de uma tarefa.",
  { taskId: z.string(), orgId: z.string().optional(), title: z.string() },
  async ({ taskId, orgId, title }) =>
    ok(await api(`/tasks/${taskId}/subtasks`, { method: "POST", body: { orgId, title } })),
);

server.tool(
  "set_subtask_done",
  "Marca uma subtarefa como concluída/reaberta (e opcionalmente renomeia).",
  { subtaskId: z.string(), orgId: z.string().optional(), done: z.boolean().optional(), title: z.string().optional() },
  async ({ subtaskId, orgId, done, title }) =>
    ok(await api(`/subtasks/${subtaskId}`, { method: "PATCH", body: { orgId, done, title } })),
);

// --- Ações em lote ---------------------------------------------------------
server.tool(
  "bulk_set_status",
  "Move várias tarefas para um status de uma vez. Passe projectId para atualizar o board ao vivo.",
  { taskIds: z.array(z.string()), statusId: z.string(), orgId: z.string().optional(), projectId: z.string().optional() },
  async ({ taskIds, statusId, orgId, projectId }) =>
    ok(await api("/tasks/bulk-status", { method: "POST", body: { taskIds, statusId, orgId, projectId } })),
);

server.tool(
  "bulk_set_priority",
  "Define a prioridade (urgent|high|normal|low) de várias tarefas de uma vez.",
  {
    taskIds: z.array(z.string()),
    priority: z.enum(["urgent", "high", "normal", "low"]),
    orgId: z.string().optional(),
    projectId: z.string().optional(),
  },
  async ({ taskIds, priority, orgId, projectId }) =>
    ok(await api("/tasks/bulk-priority", { method: "POST", body: { taskIds, priority, orgId, projectId } })),
);

// --- Dependências entre tarefas -------------------------------------------
server.tool(
  "list_dependencies",
  "Dependências de uma tarefa: o que a bloqueia (blockedBy) e o que ela bloqueia (blocks).",
  { taskId: z.string(), orgId: z.string().optional() },
  async ({ taskId, orgId }) => ok(await api(`/tasks/${taskId}/dependencies${qs({ orgId })}`)),
);

server.tool(
  "add_dependency",
  "Faz uma tarefa depender de outra (taskId passa a ser bloqueada por dependsOnId). Use para ordenar etapas.",
  { taskId: z.string(), dependsOnId: z.string(), orgId: z.string().optional() },
  async ({ taskId, dependsOnId, orgId }) =>
    ok(await api(`/tasks/${taskId}/dependencies`, { method: "POST", body: { orgId, dependsOnId } })),
);

server.tool(
  "remove_dependency",
  "Remove uma dependência pelo depId (obtido em list_dependencies).",
  { depId: z.string(), orgId: z.string().optional() },
  async ({ depId, orgId }) =>
    ok(await api(`/dependencies/${depId}${qs({ orgId })}`, { method: "DELETE" })),
);

await server.connect(new StdioServerTransport());
