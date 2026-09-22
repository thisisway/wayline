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

async function api(path) {
  if (!TOKEN) return { error: "missing_token", hint: "Defina WAYLINE_API_TOKEN." };
  try {
    const res = await fetch(BASE + path, {
      headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
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

await server.connect(new StdioServerTransport());
