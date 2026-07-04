"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction } from "@/actions/invitations";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    acceptInviteAction(token)
      .then((r) => {
        if (!alive) return;
        if (r.status === "joined" || r.status === "already") {
          router.push("/app");
          router.refresh();
        } else if (r.status === "needAuth") {
          router.push(`/login?next=/invite/${token}`);
        } else {
          setFailed(true);
        }
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [token, router]);

  return (
    <p className="text-ui text-muted">
      {failed ? "Convite inválido ou expirado." : "Entrando no workspace…"}
    </p>
  );
}
