"use client";

import * as React from "react";
import { Check, Keyboard, LogOut, Moon, Sun, X } from "lucide-react";
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
  onOpenShortcuts,
  onClose,
}: {
  userName: string;
  orgName: string;
  onOpenShortcuts: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { update } = useSession();

  const [dark, setDark] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [hasPassword, setHasPassword] = React.useState(true);

  const [name, setName] = React.useState(userName);
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [profileMsg, setProfileMsg] = React.useState<string | null>(null);

  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [savingPwd, setSavingPwd] = React.useState(false);
  const [pwdMsg, setPwdMsg] = React.useState<{ text: string; ok: boolean } | null>(null);

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

  async function saveProfile() {
    const trimmed = name.trim();
    if (!trimmed || savingProfile) return;
    setSavingProfile(true);
    setProfileMsg(null);
    const ok = await updateProfileAction({ name: trimmed, avatarUrl: avatarUrl.trim() || null });
    if (ok) {
      await update(); // atualiza nome/avatar na sessão (topbar/rail)
      router.refresh();
      setProfileMsg("Perfil salvo.");
    } else {
      setProfileMsg("Não foi possível salvar.");
    }
    setSavingProfile(false);
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

  const profileDirty = name.trim() !== userName || avatarUrl.trim() !== "";

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
              <Avatar name={name || userName} src={avatarUrl.trim() || undefined} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-ui font-semibold text-foreground">
                  {name || userName}
                </p>
                <p className="truncate text-dense text-subtle">{email}</p>
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
              <div className="space-y-1.5">
                <label className="text-dense font-medium text-muted" htmlFor="p-avatar">
                  Avatar (URL da imagem)
                </label>
                <Input
                  id="p-avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://… (vazio = usar iniciais)"
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
