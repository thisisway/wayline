import { isPlatformAdmin } from "@/lib/authz";
import { emailEnabled } from "@/lib/email";
import { storageEnabled } from "@/lib/storage";
import { aiEnabled } from "@/lib/ai";
import { enabledProviders } from "@/lib/billing";
import { ConfigPanel, type ConfigStatus } from "@/components/admin/config-panel";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  if (!(await isPlatformAdmin())) return null;

  const providers = enabledProviders();
  const admins = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const canonical = process.env.CANONICAL_HOST;
  const appUrl = process.env.APP_URL;

  const groups: { title: string; items: ConfigStatus[] }[] = [
    {
      title: "Integrações",
      items: [
        {
          label: "Email (Resend)",
          ok: emailEnabled(),
          detail: "Convites, verificação de conta e notificações por email",
        },
        {
          label: "Armazenamento (S3/R2)",
          ok: storageEnabled(),
          detail: "Upload de anexos direto para o bucket",
        },
        {
          label: "Wayline Brain (IA)",
          ok: aiEnabled(),
          detail: "Resumos, sugestão de subtarefas e briefs",
        },
      ],
    },
    {
      title: "Pagamento",
      items: [
        {
          label: "Stripe",
          ok: providers.includes("stripe"),
          detail: "Cartão internacional — assinaturas recorrentes",
        },
        {
          label: "Iugu",
          ok: providers.includes("iugu"),
          detail: "Pix, boleto e cartão — recorrência no Brasil",
        },
      ],
    },
    {
      title: "Domínio & acesso",
      items: [
        {
          label: "Domínio canônico",
          ok: Boolean(canonical),
          detail: canonical ? `Redireciona tudo para ${canonical}` : "CANONICAL_HOST não definido",
        },
        {
          label: "URL do app",
          ok: Boolean(appUrl),
          detail: appUrl ?? "APP_URL não definido (links de email e checkout precisam dela)",
        },
        {
          label: "Superadmins",
          ok: admins.length > 0,
          detail:
            admins.length > 0
              ? `${admins.length} email(s) com acesso: ${admins.join(", ")}`
              : "PLATFORM_ADMIN_EMAILS vazio",
        },
      ],
    },
  ];

  return <ConfigPanel groups={groups} />;
}
