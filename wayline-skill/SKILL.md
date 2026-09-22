---
name: wayline
description: Use ao operar a Wayline (work-OS de agência) via MCP — para consultar clientes, projetos, tarefas, responsáveis, status, prazos, comentários e briefings, e (fase 2) criar/atualizar tarefas. Ensina o fluxo de descoberta progressiva, economia de tokens, tratamento de ambiguidade e quando pedir confirmação. Acione sempre que o pedido envolver gerenciar trabalho/tarefas de um cliente ou projeto na Wayline.
---

# Wayline (via MCP)

A **Wayline** é um work-OS de agência. Hierarquia: **Space → (Folder) → List → Task**.
Para o MCP, **projeto = List** (um board, ex.: "Site Cliente X"), que tem cliente,
colunas de **status** e **tarefas**. **Setor** (Social Media, Dev, Design…) é
representado por **tags** na tarefa. Responsáveis são membros da org.

## Princípio central: descoberta progressiva

Nunca peça "tudo". Vá do geral ao específico, guardando **IDs** para as próximas
chamadas. Caminho de ouro:

```
whoami → (orgId)
search_clients("Nome") → (clientId)
list_client_projects(clientId) → (projectId)
get_project(projectId) → (statusIds, total)
[só se preciso] get_project_context / list_project_tasks / list_members
→ agir
```

## Regras de economia de token (importantes)

- Prefira **buscar** (`search_*`) a listar tudo. Use `limit` pequeno e pagine com `offset`.
- Listas devolvem **id + nome**; só chame `get_*` quando precisar do detalhe daquele item.
- Não peça `list_task_comments`, `get_project_context` ou `get_task` "por via das dúvidas" — só quando a tarefa exigir.
- Reutilize os **IDs** já obtidos; não re-busque o que já sabe.

## Ambiguidade → pergunte, não adivinhe

Se houver mais de um cliente/projeto plausível (ex.: "Site Institucional — X" e
"Landing Page — X") e o pedido não desambiguar, **liste as opções e pergunte**.
Só siga sozinho quando houver **uma** correspondência evidente.

## Segurança e confirmação

- O token roda com as permissões do usuário — você nunca vê o que ele não veria.
- **Fase 1 é somente leitura.** Ações de escrita (criar/atualizar/atribuir) e,
  sobretudo, **destrutivas** (excluir) exigem confirmação explícita do usuário
  antes de executar. Ao final de qualquer ação, devolva um **resumo curto**.

## Documentação modular (carregue só quando precisar)

- `references/tools.md` — catálogo das ferramentas e quando usar cada uma.
- `references/workflows.md` — receitas prontas (ex.: "crie as tarefas do site do Cliente X").
- `references/entities.md` — mapa de dados (cliente, projeto=List, status, tags=setor…).
- `references/safety.md` — regras de confirmação e ambiguidade em detalhe.
