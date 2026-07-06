import "server-only";

/**
 * Integração de IA (Claude) via REST — sem SDK, dependency-free. 100% opcional:
 * se faltar `ANTHROPIC_API_KEY`, `aiEnabled()` retorna false e nada é chamado.
 *
 * Envs:
 *   ANTHROPIC_API_KEY — chave da API Anthropic
 *   AI_MODEL          — (opcional) id do modelo; default claude-sonnet-5
 */
const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.AI_MODEL ?? "claude-sonnet-5";

export function aiEnabled(): boolean {
  return Boolean(apiKey);
}

async function complete(system: string, user: string, maxTokens = 512): Promise<string | null> {
  if (!aiEnabled()) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((b) => b.type === "text")?.text;
    return text ?? null;
  } catch {
    return null;
  }
}

/** Extrai um array JSON de strings de uma resposta (tolerante a cercas/ruído). */
function parseStringArray(raw: string): string[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    return [];
  }
}

/** Quebra uma tarefa em subtarefas concretas (títulos curtos, em pt-BR). */
export async function suggestSubtasks(
  title: string,
  description: string | null,
): Promise<string[]> {
  const system =
    "Você é um assistente de gestão de projetos de uma agência de marketing. " +
    "Quebre a tarefa do usuário em 3 a 6 subtarefas concretas e acionáveis, em português do Brasil. " +
    'Responda APENAS com um array JSON de strings curtas (ex.: ["Fazer X", "Revisar Y"]). Sem texto extra.';
  const user = description?.trim()
    ? `Tarefa: ${title}\nDescrição: ${description.trim()}`
    : `Tarefa: ${title}`;
  const raw = await complete(system, user, 400);
  return raw ? parseStringArray(raw) : [];
}
