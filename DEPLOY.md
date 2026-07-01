# Deploy — Wayline (Easypanel)

Deploy do `apps/web` via **Dockerfile** na raiz do monorepo. VPS no **Brasil**
(LGPD/latência, conforme blueprint).

> Fase 0: o app é mock/estático. O objetivo do deploy agora é ter **URL de
> preview** + **pipeline validado** (push → build → deploy) + **Postgres
> provisionado** pronto para a Fase 1.

## 1. GitHub

Repositório **privado** criado por você. Depois de criado, conecte o local:

```bash
git remote add origin git@github.com:<voce>/wayline.git   # ou https://
git branch -M main
git push -u origin main
```

## 2. Easypanel — App (Next.js)

1. **Create → App** no projeto Wayline.
2. **Source: GitHub** → conecte a GitHub App do Easypanel e escolha o repo `wayline` (branch `main`).
3. **Build:**
   - Método: **Dockerfile**
   - Dockerfile Path: `Dockerfile`
   - Build Context: `/` (raiz do repo)
4. **Deploy / Runtime:**
   - Porta exposta: **3000** (o container escuta em `0.0.0.0:3000`)
   - Sem variáveis de ambiente obrigatórias nesta fase.
5. **Deploy.** Pushes na `main` disparam rebuild automático.

O `Dockerfile` usa saída `standalone` do Next (`BUILD_STANDALONE=1` só dentro do
container), gerando uma imagem enxuta.

## 3. Easypanel — Postgres (provisionar agora, ligar na Fase 1)

1. **Create → Postgres** no mesmo projeto.
2. Anote nome do serviço, usuário, senha e database.
3. Dentro da rede do Easypanel, o host é o **nome do serviço** (ex.: `wayline-db`);
   a connection string interna fica:
   ```
   postgres://<user>:<senha>@<nome-do-servico>:5432/<database>
   ```
4. Guarde isso — na Fase 1 vira a env `DATABASE_URL` do app e o Drizzle passa a
   conectar de fato (hoje `packages/db` só tem o schema, sem conexão).

> Não expor a porta do Postgres publicamente. Comunicação app↔banco pela rede
> interna do Easypanel.

## 4. Checklist pós-deploy

- [ ] Build do Docker concluído sem erro no log do Easypanel
- [ ] URL de preview abre em `/` e redireciona para `/app`
- [ ] Board, painéis flutuantes e dark mode renderizando
- [ ] Serviço Postgres criado (vazio) e credenciais guardadas

## Notas técnicas

- **Standalone + monorepo:** `outputFileTracingRoot` aponta para a raiz para o
  Next empacotar as deps do workspace. `server.js` fica em `apps/web/server.js`
  dentro do standalone (ver `CMD` do Dockerfile).
- **Alpine + sharp:** `libc6-compat` instalado na imagem base.
- **Cache de build:** os `package.json` são copiados antes do código para
  aproveitar o cache de camadas do Docker no `pnpm install`.
