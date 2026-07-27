import "server-only";
import { headers } from "next/headers";

/**
 * Rate limiting simples em memória (janela fixa por IP+escopo). Suficiente para
 * um deploy de instância única (Easypanel). Não sobrevive a restart nem escala
 * horizontalmente — se um dia houver múltiplas instâncias, migrar para Redis.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

/** IP do cliente a partir dos headers do proxy (Easypanel/Cloudflare). */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim();
    return h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? "unknown";
  } catch {
    return "unknown";
  }
}

function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  // Limpeza ocasional para não vazar memória.
  if (store.size > 5000) {
    for (const [k, b] of store) if (b.resetAt < now) store.delete(k);
  }
  const b = store.get(key);
  if (!b || b.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

/**
 * Retorna `true` se a ação é permitida; `false` se estourou o limite.
 * Chaveia por escopo + IP (+ chave extra opcional, ex.: email no login).
 */
export async function rateLimit(
  scope: string,
  limit: number,
  windowMs: number,
  extraKey = "",
): Promise<boolean> {
  const ip = await clientIp();
  return hit(`${scope}:${ip}:${extraKey}`, limit, windowMs);
}

/** Versão síncrona quando o IP já é conhecido (ex.: no authorize do Auth.js). */
export function rateLimitByKey(scope: string, key: string, limit: number, windowMs: number): boolean {
  return hit(`${scope}:${key}`, limit, windowMs);
}

export const MIN = 60 * 1000;
