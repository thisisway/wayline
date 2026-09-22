# Wayline MCP

Servidor MCP (Model Context Protocol) que expõe a Wayline para agentes de IA.
Fala com a API HTTP `/api/v1` da Wayline usando um **token pessoal** — todas as
ações respeitam as permissões do usuário dono do token. Leitura + escrita
(criar/atualizar/atribuir/comentar) e exclusão com confirmação. As ações da IA
ficam na auditoria da tarefa como "IA · <token>".

## Instalação

```bash
cd mcp-server
npm install
```

## Token

Na Wayline: **Configurações → Acesso de IA (MCP) → Gerar** (escolha *Leitura* para
o modo atual). Copie o token `wl_…` (só aparece uma vez).

## Registrar no Claude Code / Desktop

```bash
claude mcp add wayline \
  --env WAYLINE_API_TOKEN=wl_seu_token \
  --env WAYLINE_API_URL=https://app.wayline.com.br/api/v1 \
  -- node /caminho/absoluto/mcp-server/index.mjs
```

No Claude Desktop, o equivalente no `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wayline": {
      "command": "node",
      "args": ["/caminho/absoluto/mcp-server/index.mjs"],
      "env": {
        "WAYLINE_API_TOKEN": "wl_seu_token",
        "WAYLINE_API_URL": "https://app.wayline.com.br/api/v1"
      }
    }
  }
}
```

Para escrita, gere o token com escopo **Leitura + escrita**.

## Ferramentas

Leitura: `whoami`, `search_clients`, `list_client_projects`, `search_projects`,
`get_project`, `list_project_tasks`, `get_task`, `list_task_comments`,
`list_members`, `get_project_context`.

Escrita: `create_task`, `create_tasks_bulk`, `update_task`, `assign_task`,
`add_comment`, `add_project_context`, `delete_task` (confirmação).

Todas devolvem JSON compacto (id + poucos campos). Use IDs para as chamadas
seguintes e carregue detalhes só quando precisar. A **Skill `wayline`**
(`/wayline-skill`) ensina o fluxo recomendado.
