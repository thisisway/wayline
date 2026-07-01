# Wayline — imagem de produção do app web (monorepo pnpm + Turborepo).
# Build a partir da RAIZ do repositório. Alvo: Easypanel (Dockerfile build).

# Node 22: exigido pelo pnpm 11.8 (usa node:sqlite, ausente no Node 20).
FROM node:22-alpine AS base
# sharp e alguns binários precisam do shim de libc no Alpine.
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app

# ---- Instala dependências (camada cacheável pelos manifests) ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm turbo run build --filter=@wayline/web

# ---- Runner (só o necessário) ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Saída standalone do Next (inclui node_modules mínimo + server.js).
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
