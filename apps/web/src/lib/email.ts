import "server-only";
import { getUsersByIds } from "@wayline/db";

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

/**
 * Envia um email de notificação para uma lista de userIds (busca os emails).
 * No-op se o email estiver desativado ou sem destinatários.
 */
export async function emailNotify(
  recipientIds: string[],
  opts: { subject: string; actorName: string; action: string; taskTitle: string; taskId?: string },
): Promise<void> {
  if (!emailEnabled() || recipientIds.length === 0) return;
  try {
    const recipients = await getUsersByIds(recipientIds);
    if (recipients.length === 0) return;
    const html = notificationEmail({
      heading: opts.subject,
      actorName: opts.actorName,
      action: opts.action,
      taskTitle: opts.taskTitle,
      taskId: opts.taskId,
    });
    await Promise.allSettled(recipients.map((r) => sendEmail(r.email, opts.subject, html)));
  } catch {
    /* email nunca deve quebrar a ação */
  }
}

/** Email de convite para um workspace, com o link de aceite. */
export async function sendInviteEmail(
  to: string,
  orgName: string,
  token: string,
  inviterName: string,
): Promise<boolean> {
  const link = appUrl ? `${appUrl}/invite/${token}` : `/invite/${token}`;
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0B1023">
    <div style="font-weight:800;font-size:20px;color:#1D66FF;margin-bottom:16px">Wayline</div>
    <p style="font-size:15px;line-height:1.5;margin:0 0 8px">
      <strong>${escapeHtml(inviterName)}</strong> convidou você para o workspace
      <strong>${escapeHtml(orgName)}</strong> no Wayline.
    </p>
    <p style="margin:16px 0">
      <a href="${link}" style="display:inline-block;background:#1D66FF;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Aceitar convite</a>
    </p>
    <p style="font-size:12px;color:#64748B">Ou copie este link: ${link}</p>
    <p style="font-size:12px;color:#64748B;margin-top:16px">O convite expira em 7 dias.</p>
  </div>`;
  return sendEmail(to, `${inviterName} convidou você para ${orgName}`, html);
}

/** Email avisando que a pessoa (que já tem conta) foi adicionada a um workspace. */
export async function sendMemberAddedEmail(
  to: string,
  orgName: string,
  inviterName: string,
): Promise<boolean> {
  const link = appUrl ? `${appUrl}/app` : undefined;
  const button = link
    ? `<p style="margin:16px 0"><a href="${link}" style="display:inline-block;background:#1D66FF;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Abrir o workspace</a></p>`
    : "";
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0B1023">
    <div style="font-weight:800;font-size:20px;color:#1D66FF;margin-bottom:16px">Wayline</div>
    <p style="font-size:15px;line-height:1.5;margin:0 0 8px">
      <strong>${escapeHtml(inviterName)}</strong> adicionou você ao workspace
      <strong>${escapeHtml(orgName)}</strong> no Wayline.
    </p>
    ${button}
    <p style="font-size:12px;color:#64748B;margin-top:16px">Já está tudo pronto — é só entrar com a sua conta.</p>
  </div>`;
  return sendEmail(to, `Você foi adicionado a ${orgName} no Wayline`, html);
}

/** Email com o código de verificação de cadastro. */
export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0B1023">
    <div style="font-weight:800;font-size:20px;color:#1D66FF;margin-bottom:16px">Wayline</div>
    <p style="font-size:15px;line-height:1.5;margin:0 0 16px">Seu código de confirmação é:</p>
    <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#F1F5F9;border-radius:10px;padding:16px;text-align:center;color:#0B1023">${escapeHtml(code)}</div>
    <p style="font-size:13px;color:#64748B;margin-top:16px">Expira em 15 minutos. Se você não tentou criar uma conta, ignore este email.</p>
  </div>`;
  return sendEmail(to, `${code} é o seu código Wayline`, html);
}

/** Email de boas-vindas no cadastro. */
export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const link = appUrl ? `${appUrl}/app` : undefined;
  const button = link
    ? `<p style="margin:16px 0"><a href="${link}" style="display:inline-block;background:#1D66FF;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Abrir o Wayline</a></p>`
    : "";
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0B1023">
    <div style="font-weight:800;font-size:20px;color:#1D66FF;margin-bottom:16px">Wayline</div>
    <p style="font-size:15px;line-height:1.5;margin:0 0 8px">Olá, ${escapeHtml(name.split(" ")[0] ?? name)}! Bem-vindo ao Wayline — seu work OS de agência.</p>
    ${button}
  </div>`;
  return sendEmail(to, "Bem-vindo ao Wayline 🎉", html);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
