"use client";

import { SessionProvider } from "next-auth/react";

/** Providers de cliente globais. SessionProvider habilita useSession()/update(). */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
