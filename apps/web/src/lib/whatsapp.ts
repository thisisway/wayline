import "server-only";

/**
 * Envio de WhatsApp via API Cloud da Meta (REST, sem SDK). 100% opcional: se
 * faltarem as envs, `whatsappEnabled()` retorna false e nada é enviado.
 *
 * Envs:
 *   WHATSAPP_TOKEN          — token de acesso (System User / permanente)
 *   WHATSAPP_PHONE_ID       — ID do número remetente (Phone Number ID)
 *   WHATSAPP_API_VERSION    — (opcional) versão da Graph API, ex.: v21.0
 *   WHATSAPP_TEMPLATE       — (opcional) nome de um template aprovado; se
 *                             definido, envia como template (1 parâmetro de
 *                             corpo) — necessário para mensagens proativas
 *                             fora da janela de 24h. Sem ele, envia texto livre.
 *   WHATSAPP_TEMPLATE_LANG  — (opcional) idioma do template, padrão pt_BR
 */
const token = process.env.WHATSAPP_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_ID;
const version = process.env.WHATSAPP_API_VERSION || "v21.0";
const template = process.env.WHATSAPP_TEMPLATE;
const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || "pt_BR";

export function whatsappEnabled(): boolean {
  return Boolean(token && phoneId);
}

/** Envia um alerta de texto (ou template, se configurado) para um número E.164. */
export async function sendWhatsappAlert(to: string, body: string): Promise<boolean> {
  if (!whatsappEnabled() || !to) return false;
  const digits = to.replace(/\D/g, "");
  if (!digits) return false;

  const payload = template
    ? {
        messaging_product: "whatsapp",
        to: digits,
        type: "template",
        template: {
          name: template,
          language: { code: templateLang },
          components: [
            { type: "body", parameters: [{ type: "text", text: body.slice(0, 1000) }] },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: digits,
        type: "text",
        text: { body: body.slice(0, 4000) },
      };

  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
