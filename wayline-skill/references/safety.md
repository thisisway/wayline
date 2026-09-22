# Segurança, confirmação e ambiguidade

## Permissões
O token roda com a identidade e permissões do usuário. Se uma leitura devolver
`403`/`not_found`, o usuário não tem acesso àquele recurso — informe isso, não
tente contornar.

## Níveis de operação
- **Leitura** (`whoami`, `search_*`, `get_*`, `list_*`): pode executar livremente.
- **Escrita** (fase 2: `create_*`, `update_*`, `assign_*`, `add_*`): confirme o
  alvo (projeto/tarefa) antes; resuma o que fará; execute; devolva resumo.
- **Destrutivo** (fase 2: `delete_*`): **sempre** peça confirmação explícita e
  só execute com o sinal de confirmação. Nunca exclua "por dedução".

## Ambiguidade — pare e pergunte
Antes de agir sobre um cliente/projeto, verifique se a escolha é única:
- **1 correspondência evidente** → continue.
- **Várias plausíveis** (nomes parecidos, mesmo cliente com vários projetos) →
  liste as opções (nome + a que cliente pertence) e **pergunte qual**.
- **Nenhuma** → diga que não encontrou e peça mais detalhes.

Exemplo: pedido "adicione no projeto do Cliente X", mas existem
"Site Institucional — X" e "Landing Page — X" → pergunte em qual.

## Ao terminar
Sempre devolva um **resumo curto** (1–3 linhas): o que consultou/fez, em qual
projeto, e IDs relevantes se úteis para o próximo passo.
