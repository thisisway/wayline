import "server-only";

/**
 * Envio de email via Resend (REST, sem SDK). 100% opcional: se faltarem as
 * envs, `emailEnabled()` retorna false e nada é enviado (degrada em silêncio).
 *
 * Envs:
 *   RESEND_API_KEY  — chave da API do Resend
 *   EMAIL_FROM      — remetente, ex.: "Wayline <no-reply@seudominio.com>"
 *   APP_URL         — (opcional) base para os links, ex.: https://app.suaagencia.com
 */
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;
export const appUrl = process.env.APP_URL;

export function emailEnabled(): boolean {
  return Boolean(apiKey && from);
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!emailEnabled()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Template simples e responsivo para uma notificação. */
export function notificationEmail(opts: {
  heading: string;
  actorName: string;
  action: string;
  taskTitle: string;
  taskId?: string;
}): string {
  const link = appUrl && opts.taskId ? `${appUrl}/app?task=${opts.taskId}` : appUrl;
  const button = link
    ? `<a href="${link}" style="display:inline-block;background:#1D66FF;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Abrir tarefa</a>`
    : "";
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0B1023">
    <div style="font-weight:800;font-size:20px;color:#1D66FF;margin-bottom:16px">Wayline</div>
    <p style="font-size:15px;line-height:1.5;margin:0 0 8px">
      <strong>${escapeHtml(opts.actorName)}</strong> ${escapeHtml(opts.action)}
      <strong>${escapeHtml(opts.taskTitle)}</strong>.
    </p>
    <p style="margin:16px 0">${button}</p>
    <p style="font-size:12px;color:#64748B;margin-top:24px">Você recebeu este email porque é membro de um workspace no Wayline.</p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
