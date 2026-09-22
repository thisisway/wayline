# Ferramentas do MCP da Wayline

Todas retornam JSON compacto. `orgId` é opcional em todas — se omitido, usa a
primeira org do usuário; passe-o explicitamente quando o usuário tiver várias.

## Descoberta / leitura (Fase 1)

| Ferramenta | Quando usar | Devolve |
|---|---|---|
| `whoami` | Início de tudo; descobrir `orgId`. | usuário, escopo, orgs (id+nome) |
| `search_clients {q?, limit?}` | Achar um cliente pelo nome. | clientes (id+nome) |
| `list_client_projects {clientId}` | Ver os projetos de um cliente. | projetos (id+nome) |
| `search_projects {q?, limit?}` | Achar um projeto pelo nome (com cliente). | projetos (id, nome, client) |
| `get_project {projectId}` | Cliente, **colunas de status** e total de tarefas. | resumo do projeto |
| `list_project_tasks {projectId, statusId?, assigneeId?, priority?, limit?, offset?}` | Ver tarefas (filtradas/paginadas). | linhas compactas |
| `get_task {taskId}` | Detalhe de uma tarefa específica. | descrição, responsáveis, prazo, tags, subtarefas |
| `list_task_comments {taskId}` | Só quando precisar do histórico. | autor + texto |
| `list_members {q?}` | Achar um responsável pelo nome. | membros (id, nome, email) |
| `get_project_context {projectId}` | Entender o projeto (brief) antes de agir. | texto do brief (compacto) |

## Dicas

- Para saber os **statusIds** de um projeto, chame `get_project` — ele traz as colunas.
- Para atribuir/filtrar por responsável, pegue o `id` em `list_members`.
- `priority` ∈ `urgent | high | normal | low`. `dueDate` vem como `YYYY-MM-DD`.

## Escrita (Fase 2 — ainda não disponível)

`create_task`, `create_tasks_bulk`, `update_task`, `assign_task`, `add_comment`,
`add_project_context`, `delete_task` (com confirmação). Não invente essas
ferramentas enquanto não existirem; se o usuário pedir uma ação de escrita,
explique que a fase de escrita ainda não está habilitada.
