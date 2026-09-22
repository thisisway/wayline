# Mapa de entidades

| Conceito da agência | Na Wayline | Observações |
|---|---|---|
| Cliente | `client` | Ligado a projetos (listas) e tarefas. Busque por nome. |
| **Projeto** | **List (board)** | Tem `clientId`, colunas de status e tarefas. É a unidade de trabalho. |
| Space / Folder | agrupadores | Organizam listas; não são "o projeto" no MCP. |
| Tarefa | `task` | title, description, status, priority, dueDate, responsáveis, tags. |
| Status | `status` (por lista) | Colunas do board (ex.: A fazer / Fazendo / Feito). Use `get_project`. |
| Prioridade | enum | `urgent | high | normal | low`. |
| Prazo | `dueDate` | `YYYY-MM-DD`. |
| Responsável | membro (user) | Múltiplos por tarefa. Ache em `list_members`. |
| **Setor/Departamento** | **tag na tarefa** | Ex.: `Social Media`, `Dev`, `Design`, `Conteúdo`, `Tráfego`, `SEO`. |
| Comentário | `comment` | Histórico da tarefa; carregue só quando necessário. |
| Briefing/Contexto | brief da lista | `get_project_context`. |

## Notas

- "Setor" não é uma entidade separada: é uma **tag** da tarefa. Para "enviar ao
  setor responsável", marque a tarefa com a tag do setor e (fase 2) atribua ao
  membro correspondente.
- Subtarefas existem (task.parentId), mas `list_project_tasks` mostra só as de
  topo. `get_task` traz o total/concluídas de subtarefas.
- Nunca use IDs adivinhados. Sempre obtenha o ID por uma busca antes de usá-lo.
