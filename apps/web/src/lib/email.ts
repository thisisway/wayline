import "server-only";
import { getBrandName, getPlatformSettings, getUsersByIds } from "@wayline/db";

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

const ACCENT = "#1D66FF";
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function emailEnabled(): boolean {
  return Boolean(apiKey && from);
}

/**
 * Só serve logo em email se a URL for absoluta (http) — clientes de email não
 * carregam caminhos relativos. Caminho "/..." vira absoluto se houver APP_URL.
 */
function resolveLogo(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (appUrl && url.startsWith("/")) return `${appUrl.replace(/\/$/, "")}${url}`;
  return null;
}

/** Nome + logo (quando utilizável) da marca configurada no sistema. */
async function emailBranding(): Promise<{ name: string; logo: string | null }> {
  const [name, settings] = await Promise.all([
    getBrandName(),
    getPlatformSettings().catch(() => null),
  ]);
  const configured = settings?.logoUrl ?? null;
  let logo = resolveLogo(configured);
  // Logo enviada no admin fica como data-URL (bloqueada em email). Servimos ela
  // pelo endpoint público /brand/logo, que exige uma base absoluta (APP_URL).
  if (!logo && configured && appUrl) {
    logo = `${appUrl.replace(/\/$/, "")}/brand/logo`;
  }
  return { name, logo };
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

/**
 * Shell responsivo e compatível (layout em tabela) para todos os emails.
 * Centraliza um card branco sobre fundo neutro, com cabeçalho (marca),
 * corpo e rodapé. `preheader` é o texto de prévia na caixa de entrada.
 */
function emailShell(opts: {
  brand: string;
  preheader: string;
  content: string;
  footer?: string;
  logo?: string | null;
}): string {
  const brand = escapeHtml(opts.brand);
  const year = new Date().getFullYear();
  const footer =
    opts.footer ??
    `Você recebeu este email porque tem uma conta no ${brand}.`;
  const header = opts.logo
    ? `<img src="${opts.logo}" alt="${brand}" height="34" style="display:block;border:0;outline:none;max-height:40px;width:auto;">`
    : `<span style="font-family:${FONT};font-weight:800;font-size:20px;color:${ACCENT};letter-spacing:-0.02em;">${brand}</span>`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${brand}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(
    opts.preheader,
  )}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;background:#ffffff;border:1px solid #e6e8ee;border-radius:14px;overflow:hidden;">
<tr><td style="padding:26px 32px 6px 32px;">
${header}
</td></tr>
<tr><td style="padding:12px 32px 28px 32px;font-family:${FONT};color:#0B1023;">
${opts.content}
</td></tr>
<tr><td style="padding:18px 32px;background:#fafbfc;border-top:1px solid #eef0f4;font-family:${FONT};font-size:12px;line-height:1.5;color:#94a3b8;">
${footer}
</td></tr>
</table>
<div style="font-family:${FONT};font-size:11px;color:#b6bdc9;margin-top:16px;">© ${year} ${brand}</div>
</td></tr>
</table>
</body>
</html>`;
}

/** Botão "bulletproof" (tabela) — renderiza bem inclusive no Outlook. */
function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 6px 0;"><tr>
<td align="center" bgcolor="${ACCENT}" style="border-radius:8px;">
<a href="${href}" target="_blank" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:14px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(
    label,
  )}</a>
</td></tr></table>`;
}

const h1 = (t: string) =>
  `<h1 style="margin:0 0 10px 0;font-family:${FONT};font-size:19px;font-weight:700;color:#0B1023;">${t}</h1>`;
const p = (t: string) =>
  `<p style="margin:0 0 8px 0;font-family:${FONT};font-size:15px;line-height:1.55;color:#334155;">${t}</p>`;

/** Template simples para uma notificação (síncrono; brandName vem do chamador). */
export function notificationEmail(opts: {
  heading: string;
  actorName: string;
  action: string;
  taskTitle: string;
  taskId?: string;
  brandName?: string;
  logo?: string | null;
}): string {
  const brand = opts.brandName ?? "Wayline";
  const link = appUrl && opts.taskId ? `${appUrl}/app?task=${opts.taskId}` : appUrl;
  const content =
    p(
      `<strong>${escapeHtml(opts.actorName)}</strong> ${escapeHtml(opts.action)} <strong>${escapeHtml(
        opts.taskTitle,
      )}</strong>.`,
    ) + (link ? emailButton(link, "Abrir tarefa") : "");
  return emailShell({
    brand,
    logo: opts.logo,
    preheader: `${opts.actorName} ${opts.action} ${opts.taskTitle}`,
    content,
    footer: `Você recebeu este email porque é membro de um workspace no ${escapeHtml(brand)}.`,
  });
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
    const { name, logo } = await emailBranding();
    const html = notificationEmail({
      heading: opts.subject,
      actorName: opts.actorName,
      action: opts.action,
      taskTitle: opts.taskTitle,
      taskId: opts.taskId,
      brandName: name,
      logo,
    });
    await Promise.allSettled(recipients.map((r) => sendEmail(r.email, opts.subject, html)));
  } catch {
    /* email nunca deve quebrar a ação */
  }
}

/** Email ao usuário quando o suporte responde ou resolve o chamado. */
export async function sendSupportUpdateEmail(
  to: string,
  opts: { kind: "reply" | "resolved"; ticketSubject: string; ticketId: string },
): Promise<boolean> {
  if (!emailEnabled() || !to) return false;
  const { name: brand, logo } = await emailBranding();
  const link = appUrl ? `${appUrl}/app?ticket=${opts.ticketId}` : appUrl;
  const line =
    opts.kind === "reply"
      ? "O suporte respondeu seu chamado"
      : "Seu chamado foi marcado como resolvido";
  const subject = escapeHtml(opts.ticketSubject || "Seu chamado");
  const content =
    h1(line) +
    p(`Chamado: <strong>${subject}</strong>.`) +
    (link ? emailButton(link, "Abrir chamado") : "");
  const html = emailShell({
    brand,
    logo,
    preheader: `${line}: ${opts.ticketSubject || "seu chamado"}`,
    content,
    footer: `Você recebeu este email por ter aberto um chamado no ${escapeHtml(brand)}.`,
  });
  const subjectLine =
    opts.kind === "reply"
      ? `Resposta do suporte: ${opts.ticketSubject || "seu chamado"}`
      : `Chamado resolvido: ${opts.ticketSubject || "seu chamado"}`;
  return sendEmail(to, subjectLine, html);
}

/** Email de convite para um workspace, com o link de aceite. */
export async function sendInviteEmail(
  to: string,
  orgName: string,
  token: string,
  inviterName: string,
): Promise<boolean> {
  const { name: brand, logo } = await emailBranding();
  const link = appUrl ? `${appUrl}/invite/${token}` : `/invite/${token}`;
  const content =
    h1("Você foi convidado 🎉") +
    p(
      `<strong>${escapeHtml(inviterName)}</strong> convidou você para o workspace <strong>${escapeHtml(
        orgName,
      )}</strong> no ${escapeHtml(brand)}.`,
    ) +
    emailButton(link, "Aceitar convite") +
    `<p style="margin:12px 0 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:#94a3b8;word-break:break-all;">Ou copie este link:<br>${link}</p>`;
  const html = emailShell({
    brand,
    logo,
    preheader: `${inviterName} convidou você para ${orgName}`,
    content,
    footer: "Este convite expira em 7 dias. Se você não esperava por ele, ignore este email.",
  });
  return sendEmail(to, `${inviterName} convidou você para ${orgName}`, html);
}

/** Email avisando que a pessoa (que já tem conta) foi adicionada a um workspace. */
export async function sendMemberAddedEmail(
  to: string,
  orgName: string,
  inviterName: string,
): Promise<boolean> {
  const { name: brand, logo } = await emailBranding();
  const link = appUrl ? `${appUrl}/app` : undefined;
  const content =
    h1(`Bem-vindo ao ${escapeHtml(orgName)}`) +
    p(
      `<strong>${escapeHtml(inviterName)}</strong> adicionou você ao workspace <strong>${escapeHtml(
        orgName,
      )}</strong> no ${escapeHtml(brand)}.`,
    ) +
    (link ? emailButton(link, "Abrir o workspace") : "");
  const html = emailShell({
    brand,
    logo,
    preheader: `${inviterName} adicionou você ao workspace ${orgName}`,
    content,
    footer: "Já está tudo pronto — é só entrar com a sua conta.",
  });
  return sendEmail(to, `Você foi adicionado a ${orgName} no ${brand}`, html);
}

/** Email com o código de verificação de cadastro. */
export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  const { name: brand, logo } = await emailBranding();
  const content =
    h1("Confirme seu email") +
    p("Use o código abaixo para confirmar sua conta:") +
    `<div style="margin:16px 0 4px 0;font-family:${FONT};font-size:34px;font-weight:800;letter-spacing:10px;background:#f1f5f9;border-radius:12px;padding:18px;text-align:center;color:#0B1023;">${escapeHtml(
      code,
    )}</div>`;
  const html = emailShell({
    brand,
    logo,
    preheader: `Seu código de confirmação: ${code}`,
    content,
    footer: "O código expira em 15 minutos. Se você não tentou criar uma conta, ignore este email.",
  });
  return sendEmail(to, `${code} é o seu código ${brand}`, html);
}

/** Email de boas-vindas no cadastro. */
export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const { name: brand, logo } = await emailBranding();
  const link = appUrl ? `${appUrl}/app` : undefined;
  const first = escapeHtml(name.split(" ")[0] ?? name);
  const content =
    h1(`Olá, ${first}! 👋`) +
    p(`Bem-vindo ao ${escapeHtml(brand)} — seu work OS de agência.`) +
    p("Organize projetos, propostas, contratos e finanças em um só lugar.") +
    (link ? emailButton(link, `Abrir o ${brand}`) : "");
  const html = emailShell({
    brand,
    logo,
    preheader: `Bem-vindo ao ${brand}`,
    content,
    footer: `Enviado pelo ${escapeHtml(brand)}.`,
  });
  return sendEmail(to, `Bem-vindo ao ${brand} 🎉`, html);
}

/** Email com o código de recuperação de senha. */
export async function sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
  const { name: brand, logo } = await emailBranding();
  const content =
    h1("Redefinir sua senha") +
    p("Use o código abaixo para criar uma nova senha:") +
    `<div style="margin:16px 0 4px 0;font-family:${FONT};font-size:34px;font-weight:800;letter-spacing:10px;background:#f1f5f9;border-radius:12px;padding:18px;text-align:center;color:#0B1023;">${escapeHtml(
      code,
    )}</div>`;
  const html = emailShell({
    brand,
    logo,
    preheader: `Seu código para redefinir a senha: ${code}`,
    content,
    footer:
      "O código expira em 15 minutos. Se você não pediu para redefinir a senha, ignore este email — sua senha continua a mesma.",
  });
  return sendEmail(to, `${code} — redefinição de senha ${brand}`, html);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
