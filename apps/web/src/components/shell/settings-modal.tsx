"use client";

import * as React from "react";
import {
  Bot,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  Keyboard,
  KeyRound,
  LogOut,
  Moon,
  Plug,
  RefreshCw,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar, Button, Input, cn } from "@wayline/ui";
import { THEME_COOKIE } from "@/lib/constants";
import {
  changePasswordAction,
  getProfileAction,
  updateProfileAction,
  type ChangePasswordResult,
} from "@/actions/profile";
import { billingPortalAction, subscriptionSummaryAction } from "@/actions/billing";
import { getCalendarTokenAction, regenerateCalendarTokenAction } from "@/actions/calendar";
import {
  createApiTokenAction,
  listApiTokensAction,
  revokeApiTokenAction,
} from "@/actions/api-tokens";
import type { ApiTokenDTO } from "@wayline/db";
import { AccountDataSection } from "@/components/shell/account-data-section";
import { effectivePlan, formatPrice, resolvePlan, trialActive, trialDaysLeft } from "@/lib/plans";

/**
 * Lê um arquivo de imagem, corta no centro e redimensiona para `size`×`size`,
 * devolvendo um data URL JPEG pequeno (~5KB) — guardado direto no banco, sem
 * precisar de bucket/storage.
 */
function fileToAvatarDataUrl(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("ctx"));
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const PWD_MSG: Record<ChangePasswordResult, { text: string; ok: boolean }> = {
  ok: { text: "Senha alterada.", ok: true },
  wrong: { text: "Senha atual incorreta.", ok: false },
  weak: { text: "A nova senha precisa de ao menos 8 caracteres.", ok: false },
  nosession: { text: "Sessão expirada. Entre novamente.", ok: false },
  nopassword: { text: "Esta conta não usa senha.", ok: false },
};

/** Feed ICS: assinar as tarefas com prazo no Google Agenda/Apple/Outlook. */
function CalendarSection() {
  const [token, setToken] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    getCalendarTokenAction().then(setToken).catch(() => {});
  }, []);

  const url =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/api/calendar/ics?token=${token}`
      : "";

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponível */
    }
  }

  async function regenerate() {
    if (busy) return;
    if (
      !window.confirm(
        "Gerar um novo link? O link atual para de funcionar nos calendários já conectados.",
      )
    )
      return;
    setBusy(true);
    const t = await regenerateCalendarTokenAction().catch(() => null);
    if (t) setToken(t);
    setCopied(false);
    setBusy(false);
  }

  return (
    <Section title="Calendário">
      <p className="mb-2 flex items-center gap-1.5 text-dense text-muted">
        <CalendarDays className="size-4 shrink-0" />
        Assine suas tarefas com prazo no Google Agenda, Apple ou Outlook — atualiza sozinho.
      </p>
      <div className="flex items-center gap-2">
        <Input readOnly value={url || "Gerando link…"} onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          onClick={copy}
          disabled={!url}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 h-9 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground disabled:opacity-50"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-subtle">
        No Google Agenda: <strong>Outros calendários → + → Assinar por URL</strong> e cole o link.
      </p>
      <button
        type="button"
        onClick={regenerate}
        disabled={busy}
        className="mt-2 flex items-center gap-1.5 text-dense font-medium text-muted transition-colors hover:text-danger disabled:opacity-50"
      >
        <RefreshCw className="size-3.5" /> Gerar novo link
      </button>
    </Section>
  );
}

/** Tokens de API para agentes de IA (MCP da Wayline). */
function AiAccessSection() {
  const [tokens, setTokens] = React.useState<ApiTokenDTO[] | null>(null);
  const [name, setName] = React.useState("");
  const [scope, setScope] = React.useState<"read" | "write">("write");
  const [busy, setBusy] = React.useState(false);
  const [fresh, setFresh] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const reload = React.useCallback(() => {
    listApiTokensAction().then(setTokens).catch(() => setTokens([]));
  }, []);
  React.useEffect(() => reload(), [reload]);

  async function create() {
    if (busy || !name.trim()) return;
    setBusy(true);
    setFresh(null);
    const res = await createApiTokenAction(name.trim(), scope).catch(() => null);
    setBusy(false);
    if (res) {
      setFresh(res.token);
      setName("");
      reload();
    }
  }
  async function revoke(id: string) {
    if (!window.confirm("Revogar este token? Agentes que o usam perdem o acesso.")) return;
    setTokens((ts) => (ts ?? []).filter((t) => t.id !== id));
    await revokeApiTokenAction(id).catch(() => {});
  }
  async function copy() {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponível */
    }
  }

  return (
    <Section title="Acesso de IA (MCP)">
      <p className="mb-2 flex items-center gap-1.5 text-dense text-muted">
        <Bot className="size-4 shrink-0" />
        Tokens para conectar agentes de IA à Wayline via MCP. As ações da IA respeitam suas
        permissões.
      </p>

      {fresh && (
        <div className="mb-3 rounded-md border border-brand/30 bg-brand/10 p-2.5">
          <p className="mb-1 text-[11px] font-semibold uppercase text-brand">
            Copie agora — o token não será mostrado de novo
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1.5 font-mono text-[12px] text-foreground">
              {fresh}
            </code>
            <button
              type="button"
              onClick={copy}
              className="flex shrink-0 items-center gap-1 rounded-md bg-brand px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-80"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome (ex.: Claude Desktop)"
          className="h-9"
        />
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as "read" | "write")}
          className="h-9 shrink-0 rounded-md border border-border bg-canvas px-2 text-dense text-foreground"
        >
          <option value="read">Leitura</option>
          <option value="write">Leitura + escrita</option>
        </select>
        <Button onClick={create} disabled={busy || !name.trim()}>
          <KeyRound className="size-4" /> Gerar
        </Button>
      </div>

      {tokens && tokens.length > 0 && (
        <div className="mt-2 space-y-1">
          {tokens.map((t) => (
            <div
              key={t.id}
              className="group flex items-center gap-2 rounded-md bg-elevated/50 px-2.5 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-dense font-medium text-foreground">
                {t.name}
                <span className="ml-2 text-[11px] font-normal text-subtle">
                  {t.scope === "read" ? "leitura" : "leitura+escrita"}
                  {t.lastUsedAt ? ` · usado ${new Date(t.lastUsedAt).toLocaleDateString("pt-BR")}` : " · nunca usado"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => revoke(t.id)}
                aria-label={`Revogar ${t.name}`}
                className="text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4">
      <h3 className="mb-3 text-label uppercase text-subtle">{title}</h3>
      {children}
    </div>
  );
}

export function SettingsModal({
  userName,
  orgName,
  orgId,
  isAdmin,
  onOpenShortcuts,
  onOpenPlans,
  onOpenIntegrations,
  onClose,
}: {
  userName: string;
  orgName: string;
  orgId: string;
  isAdmin: boolean;
  onOpenShortcuts: () => void;
  onOpenPlans: () => void;
  onOpenIntegrations: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { update } = useSession();

  const [dark, setDark] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [hasPassword, setHasPassword] = React.useState(true);

  const [name, setName] = React.useState(userName);
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [initial, setInitial] = React.useState({ name: userName, avatar: "" });
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [profileMsg, setProfileMsg] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [savingPwd, setSavingPwd] = React.useState(false);
  const [pwdMsg, setPwdMsg] = React.useState<{ text: string; ok: boolean } | null>(null);

  const [sub, setSub] = React.useState<{
    plan: string;
    members: number;
    trialEndsAt: string | null;
    manageable: boolean;
  } | null>(null);
  const [portalBusy, setPortalBusy] = React.useState(false);
  React.useEffect(() => {
    subscriptionSummaryAction(orgId).then((s) => s && setSub(s));
  }, [orgId]);

  async function openBillingPortal() {
    if (portalBusy) return;
    setPortalBusy(true);
    const res = await billingPortalAction(orgId).catch(() => ({ status: "error" }) as const);
    setPortalBusy(false);
    if (res.status === "ok") window.location.href = res.url;
  }

  React.useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    getProfileAction().then((p) => {
      if (!p) return;
      setName(p.name);
      setEmail(p.email);
      setAvatarUrl(p.avatarUrl ?? "");
      setHasPassword(p.hasPassword);
      setInitial({ name: p.name, avatar: p.avatarUrl ?? "" });
    });
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function setTheme(value: boolean) {
    setDark(value);
    document.documentElement.classList.toggle("dark", value);
    document.cookie = `${THEME_COOKIE}=${value ? "dark" : "light"}; path=/; max-age=${
      60 * 60 * 24 * 365
    }; samesite=lax`;
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-selecionar o mesmo arquivo
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileMsg("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setProfileMsg("Imagem muito grande (máx. 10MB).");
      return;
    }
    try {
      setProfileMsg(null);
      setAvatarUrl(await fileToAvatarDataUrl(file));
    } catch {
      setProfileMsg("Não foi possível processar a imagem.");
    }
  }

  async function saveProfile() {
    const trimmed = name.trim();
    if (!trimmed || savingProfile) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const ok = await updateProfileAction({ name: trimmed, avatarUrl: avatarUrl || null });
      if (!ok) {
        setProfileMsg("Não foi possível salvar.");
        return;
      }
      // Salvou no banco: confirma já. Refrescar a sessão não pode mascarar isso.
      setInitial({ name: trimmed, avatar: avatarUrl });
      setProfileMsg("Perfil salvo.");
      try {
        await update(); // atualiza o nome na sessão (topbar)
      } catch {
        /* refresh de sessão é best-effort */
      }
      router.refresh(); // recarrega o avatar do banco no servidor
    } catch {
      setProfileMsg("Erro ao salvar — tente uma imagem menor.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (savingPwd) return;
    if (next !== confirm) {
      setPwdMsg({ text: "A confirmação não confere.", ok: false });
      return;
    }
    setSavingPwd(true);
    setPwdMsg(null);
    const result = await changePasswordAction(current, next);
    setPwdMsg(PWD_MSG[result]);
    if (result === "ok") {
      setCurrent("");
      setNext("");
      setConfirm("");
    }
    setSavingPwd(false);
  }

  const profileDirty = name.trim() !== initial.name || avatarUrl !== initial.avatar;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-display text-h3 font-bold">Configurações</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 divide-y divide-border overflow-y-auto px-5">
          {/* Conta */}
          <Section title="Conta">
            <div className="mb-3 flex items-center gap-3">
              <Avatar name={name || userName} src={avatarUrl || undefined} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-ui font-semibold text-foreground">
                  {name || userName}
                </p>
                <p className="truncate text-dense text-subtle">{email}</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickFile}
              />
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 h-8 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
                >
                  <Upload className="size-3.5" /> Enviar foto
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="text-[11px] font-medium text-subtle transition-colors hover:text-danger"
                  >
                    Remover foto
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <label className="text-dense font-medium text-muted" htmlFor="p-name">
                  Nome
                </label>
                <Input
                  id="p-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={saveProfile} disabled={!name.trim() || !profileDirty || savingProfile}>
                  {savingProfile ? "Salvando…" : "Salvar perfil"}
                </Button>
                {profileMsg && (
                  <span className="flex items-center gap-1 text-dense text-success">
                    <Check className="size-3.5" /> {profileMsg}
                  </span>
                )}
              </div>
            </div>
          </Section>

          {/* Segurança */}
          {hasPassword && (
            <Section title="Segurança">
              <div className="space-y-2.5">
                <Input
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Senha atual"
                  autoComplete="current-password"
                />
                <Input
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="Nova senha (mín. 8)"
                  autoComplete="new-password"
                />
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirmar nova senha"
                  autoComplete="new-password"
                />
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={changePassword}
                    disabled={!current || !next || !confirm || savingPwd}
                  >
                    {savingPwd ? "Trocando…" : "Trocar senha"}
                  </Button>
                  {pwdMsg && (
                    <span
                      className={cn(
                        "text-dense",
                        pwdMsg.ok ? "text-success" : "text-danger",
                      )}
                    >
                      {pwdMsg.text}
                    </span>
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* Aparência */}
          <Section title="Aparência">
            <div className="flex rounded-lg border border-border bg-canvas p-0.5">
              <button
                type="button"
                onClick={() => setTheme(false)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 h-8 text-dense font-medium transition-colors",
                  !dark ? "bg-brand text-white" : "text-muted hover:text-foreground",
                )}
              >
                <Sun className="size-4" /> Claro
              </button>
              <button
                type="button"
                onClick={() => setTheme(true)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 h-8 text-dense font-medium transition-colors",
                  dark ? "bg-brand text-white" : "text-muted hover:text-foreground",
                )}
              >
                <Moon className="size-4" /> Escuro
              </button>
            </div>
          </Section>

          <CalendarSection />

          <AiAccessSection />

          {/* Plano */}
          <Section title="Plano & cobrança">
            {sub &&
              (() => {
                const onTrial = trialActive(sub.trialEndsAt);
                const plan = effectivePlan(sub.plan, sub.trialEndsAt);
                const price = plan.priceBRL;
                const paid = price != null && price > 0;
                const estimate = paid ? price * sub.members : 0;
                const afterTrial = resolvePlan(sub.plan);
                return (
                  <div className="mb-3 rounded-lg border border-border bg-canvas p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-ui font-semibold text-foreground">
                        Plano {plan.name}
                        {onTrial && (
                          <span className="rounded-pill bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">
                            TRIAL · {trialDaysLeft(sub.trialEndsAt)}d
                          </span>
                        )}
                      </span>
                      <span className="text-dense font-medium text-muted">
                        {onTrial ? "Grátis" : formatPrice(price)}
                        {!onTrial && paid && <span className="text-subtle"> /usuário/mês</span>}
                      </span>
                    </div>
                    <p className="mt-1 text-dense text-subtle">
                      {onTrial
                        ? `Teste do Business grátis · depois vira ${afterTrial.name}. Assine para manter os recursos.`
                        : paid
                          ? `${sub.members} assento(s) · estimativa ~${formatPrice(estimate)}/mês`
                          : "Faça upgrade para desbloquear Gantt, automações, Mind Map e mais."}
                    </p>
                  </div>
                );
              })()}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPlans();
              }}
              className="flex w-full items-center gap-2 rounded-md border border-border bg-canvas px-3 h-9 text-ui font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
            >
              <Sparkles className="size-4" /> Ver planos & fazer upgrade
            </button>
            {sub?.manageable && (
              <button
                type="button"
                onClick={openBillingPortal}
                disabled={portalBusy}
                className="mt-2 flex w-full items-center gap-2 rounded-md border border-border bg-canvas px-3 h-9 text-ui font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground disabled:opacity-60"
              >
                <CreditCard className="size-4" />
                {portalBusy ? "Abrindo…" : "Gerenciar assinatura & faturas"}
              </button>
            )}
          </Section>

          {/* Integrações (admin) */}
          {isAdmin && (
            <Section title="Integrações">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenIntegrations();
                }}
                className="flex w-full items-center gap-2 rounded-md border border-border bg-canvas px-3 h-9 text-ui font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
              >
                <Plug className="size-4" /> Webhooks, Slack & Discord
              </button>
            </Section>
          )}

          {/* Atalhos */}
          <Section title="Ajuda">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenShortcuts();
              }}
              className="flex w-full items-center gap-2 rounded-md border border-border bg-canvas px-3 h-9 text-ui font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
            >
              <Keyboard className="size-4" /> Atalhos de teclado
            </button>
          </Section>

          <AccountDataSection userEmail={email} />
        </div>

        <div className="border-t border-border px-5 py-3">
          <p className="mb-2 text-[11px] text-subtle">Workspace ativo: {orgName}</p>
          <button
            type="button"
            onClick={() => signOut({ redirectTo: "/login" })}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 h-9 text-ui font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <LogOut className="size-4" /> Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
