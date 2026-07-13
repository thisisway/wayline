import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail, getUserProfile, resolveUserOrg } from "@wayline/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT: obrigatório com Credentials; sem tabela de sessão.
  session: { strategy: "jwt" },
  trustHost: true, // self-hosted atrás de proxy (Easypanel)
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const user = await getUserByEmail(email);
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Avatar NÃO vai no JWT (data URL estouraria o cookie): vem do banco.
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    // Resolve a org do usuário só no login (user presente); depois é cacheada no token.
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.uid = user.id;
        token.orgId = (await resolveUserOrg(user.id)) ?? null;
      }
      // Nome editado: recarrega do banco (via useSession().update()). Avatar não
      // entra no token — é carregado do banco no servidor (data URL é grande).
      if (trigger === "update" && token.uid) {
        const fresh = await getUserProfile(token.uid as string);
        if (fresh) token.name = fresh.name;
      }
      return token;
    },
    async session({ session, token }) {
      const uid = token.uid as unknown as string | undefined;
      const orgId = token.orgId as unknown as string | null | undefined;
      if (uid) session.user.id = uid;
      session.orgId = orgId ?? null;
      return session;
    },
  },
});
