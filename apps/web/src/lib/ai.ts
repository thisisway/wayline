import "server-only";

/**
 * Integração de IA — suporta **OpenAI (GPT)** e **Anthropic (Claude)**, via REST
 * (sem SDK, dependency-free). 100% opcional: sem chave, `aiEnabled()` é false.
 *
 * Envs:
 *   OPENAI_API_KEY     — usa GPT (OpenAI)
 *   ANTHROPIC_API_KEY  — usa Claude (Anthropic)
 *   AI_PROVIDER        — (opcional) força "openai" ou "anthropic"
 *   AI_MODEL           — (opcional) id do modelo; default por provedor
 *
 * Resolução: AI_PROVIDER (se setado) → senão OPENAI_API_KEY → senão Anthropic.
 */
type Provider = "openai" | "anthropic";

function resolveProvider(): Provider {
  const p = process.env.AI_PROVIDER?.toLowerCase();
  if (p === "openai" || p === "anthropic") return p;
  if (process.env.OPENAI_API_KEY) return "openai";
  return "anthropic";
}

function keyFor(provider: Provider): string | undefined {
  return provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
}

function modelFor(provider: Provider): string {
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  return provider === "openai" ? "gpt-4o-mini" : "claude-sonnet-5";
}

export function aiEnabled(): boolean {
  return Boolean(keyFor(resolveProvider()));
}

async function complete(system: string, user: string, maxTokens = 512): Promise<string | null> {
  const provider = resolveProvider();
  const key = keyFor(provider);
  if (!key) return null;
  try {
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: modelFor(provider),
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content ?? null;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelFor(provider),
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    return data.content?.find((b) => b.type === "text")?.text ?? null;
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

/** Resume uma thread de comentários (2-3 frases, pt-BR, sem markdown). */
export async function summarizeComments(lines: string[]): Promise<string | null> {
  if (lines.length === 0) return null;
  const system =
    "Resuma a conversa a seguir em 2 a 3 frases objetivas, em português do Brasil, destacando " +
    "decisões, pedidos do cliente e pendências. Sem markdown, apenas o texto.";
  const raw = await complete(system, lines.join("\n").slice(0, 6000), 300);
  return raw?.trim() || null;
}

/** Escreve/melhora a descrição de uma tarefa (2-4 frases, pt-BR, sem markdown). */
export async function writeDescription(
  title: string,
  current: string | null,
): Promise<string | null> {
  const system =
    "Você é um assistente de uma agência de marketing. Escreva uma descrição de tarefa clara e " +
    "objetiva em português do Brasil, em 2 a 4 frases. Sem títulos, sem markdown, apenas o texto.";
  const user = current?.trim()
    ? `Título: ${title}\nRascunho atual: ${current.trim()}\nMelhore e complete a descrição.`
    : `Título: ${title}\nEscreva a descrição.`;
  const raw = await complete(system, user, 300);
  return raw?.trim() || null;
}

/** Gera 2-3 insights executivos a partir das tarefas do board (pt-BR). */
export async function summarizeBoard(lines: string[]): Promise<string[]> {
  if (lines.length === 0) return [];
  const system =
    "Você é um diretor de operações de uma agência de marketing. Com base na lista de tarefas " +
    "(coluna/status e prazo), escreva de 2 a 3 insights executivos curtos e úteis em português do " +
    "Brasil: progresso, riscos/atrasos e próximo passo. Responda APENAS com um array JSON de strings curtas.";
  const raw = await complete(system, lines.join("\n").slice(0, 6000), 400);
  return raw ? parseStringArray(raw) : [];
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
