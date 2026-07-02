import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    orgId: string | null;
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    orgId?: string | null;
  }
}
