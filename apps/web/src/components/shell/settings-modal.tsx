"use client";

import * as React from "react";
import { Check, Keyboard, LogOut, Moon, Sparkles, Sun, Upload, X } from "lucide-react";
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
import { subscriptionSummaryAction } from "@/actions/billing";
import { updateBrandingAction } from "@/actions/branding";
import { effectivePlan, formatPrice, resolvePlan, trialActive, trialDaysLeft } from "@/lib/plans";

const BRAND_SWATCHES = ["#1D66FF", "#7C5CFF", "#17C86A", "#FF3B30", "#FFB800", "#0EA5E9", "#EC4899"];

/** Redimensiona uma imagem preservando o aspecto (PNG, p/ manter transparência). */
function fileToImageDataUrl(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("ctx"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

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
  brandingAllowed,
  brandColor,
  logoUrl,
  onOpenShortcuts,
  onOpenPlans,
  onClose,
}: {
  userName: string;
  orgName: string;
  orgId: string;
  isAdmin: boolean;
  brandingAllowed: boolean;
  brandColor: string | null;
  logoUrl: string | null;
  onOpenShortcuts: () => void;
  onOpenPlans: () => void;
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
  } | null>(null);
  React.useEffect(() => {
    subscriptionSummaryAction(orgId).then((s) => s && setSub(s));
  }, [orgId]);

  // Marca (Business+)
  const [logo, setLogo] = React.useState(logoUrl ?? "");
  const [color, setColor] = React.useState(brandColor ?? "");
  const [savingBrand, setSavingBrand] = React.useState(false);
  const [brandMsg, setBrandMsg] = React.useState<string | null>(null);
  const logoRef = React.useRef<HTMLInputElement>(null);

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setBrandMsg("Selecione uma imagem (máx. 10MB).");
      return;
    }
    try {
      setBrandMsg(null);
      setLogo(await fileToImageDataUrl(file));
    } catch {
      setBrandMsg("Não foi possível processar a imagem.");
    }
  }

  async function saveBranding() {
    if (savingBrand) return;
    setSavingBrand(true);
    setBrandMsg(null);
    const res = await updateBrandingAction(orgId, {
      logoUrl: logo || null,
      brandColor: color || null,
    }).catch(() => "error" as const);
    setSavingBrand(false);
    if (res === "ok") {
      setBrandMsg("Marca salva.");
      router.refresh();
    } else if (res === "invalid") {
      setBrandMsg("Cor inválida — use um hex como #1D66FF.");
    } else if (res === "locked") {
      setBrandMsg("Marca personalizada é um recurso do plano Business.");
    } else {
      setBrandMsg("Não foi possível salvar.");
    }
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
          </Section>

          {/* Marca (Business+) — só admin+ */}
          {isAdmin && (
            <Section title="Marca do workspace">
              {!brandingAllowed ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-canvas px-3 py-3">
                  <p className="text-dense text-muted">
                    Logo e cor personalizados fazem parte do plano{" "}
                    <strong className="text-foreground">Business</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPlans();
                    }}
                    className="shrink-0 rounded-md bg-brand px-3 h-8 text-dense font-medium text-white hover:bg-brand-80"
                  >
                    Ver planos
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Logo */}
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand font-display font-extrabold text-white">
                      {logo ? (
                        <img src={logo} alt="Logo" className="size-full object-contain" />
                      ) : (
                        (orgName[0] ?? "W").toUpperCase()
                      )}
                    </span>
                    <input
                      ref={logoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPickLogo}
                    />
                    <button
                      type="button"
                      onClick={() => logoRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 h-8 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
                    >
                      <Upload className="size-3.5" /> Enviar logo
                    </button>
                    {logo && (
                      <button
                        type="button"
                        onClick={() => setLogo("")}
                        className="text-[11px] font-medium text-subtle transition-colors hover:text-danger"
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  {/* Cor */}
                  <div>
                    <label className="text-dense font-medium text-muted">Cor da marca</label>
                    <div className="mt-1.5 flex items-center gap-2">
                      {BRAND_SWATCHES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          aria-label={c}
                          className={cn(
                            "size-6 rounded-full border-2 transition-transform hover:scale-110",
                            color.toLowerCase() === c.toLowerCase()
                              ? "border-foreground"
                              : "border-transparent",
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <Input
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="#1D66FF"
                        className="h-8 w-28"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button onClick={saveBranding} disabled={savingBrand}>
                      {savingBrand ? "Salvando…" : "Salvar marca"}
                    </Button>
                    {brandMsg && (
                      <span
                        className={cn(
                          "text-dense",
                          brandMsg === "Marca salva." ? "text-success" : "text-muted",
                        )}
                      >
                        {brandMsg}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-subtle">
                    A cor personaliza botões e destaques do app. O logo aparece na barra lateral e
                    no seletor de workspace.
                  </p>
                </div>
              )}
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
