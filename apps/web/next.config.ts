import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Imagem Docker enxuta (Easypanel): standalone só no build do container.
  // Local no Windows, gerar standalone falha por symlink (precisa Dev Mode),
  // então ativamos apenas quando BUILD_STANDALONE=1 (ver Dockerfile).
  ...(process.env.BUILD_STANDALONE === "1"
    ? {
        output: "standalone" as const,
        outputFileTracingRoot: path.join(rootDir, "../../"),
      }
    : {}),
  // Consome os pacotes do monorepo direto do TS (sem build step).
  transpilePackages: ["@wayline/ui", "@wayline/db"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
