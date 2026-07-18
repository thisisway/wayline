import { Check, Minus } from "lucide-react";

export interface ConfigStatus {
  label: string;
  ok: boolean;
  detail: string;
}

function StatusRow({ item }: { item: ConfigStatus }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
          item.ok ? "bg-success/15 text-success" : "bg-elevated text-subtle"
        }`}
      >
        {item.ok ? <Check className="size-4" /> : <Minus className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-ui font-medium text-foreground">{item.label}</p>
        <p className="truncate text-dense text-subtle">{item.detail}</p>
      </div>
      <span
        className={`shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-semibold ${
          item.ok ? "bg-success/15 text-success" : "bg-elevated text-muted"
        }`}
      >
        {item.ok ? "Ativo" : "Inativo"}
      </span>
    </div>
  );
}

export function ConfigPanel({ groups }: { groups: { title: string; items: ConfigStatus[] }[] }) {
  return (
    <div>
      <h2 className="mb-1 font-display text-h2 font-bold">Configurações</h2>
      <p className="mb-6 text-dense text-muted">
        Status das integrações da plataforma. Tudo é configurado por variáveis de ambiente no
        serviço do app — reimplante após alterar.
      </p>

      <div className="space-y-5">
        {groups.map((g) => (
          <div key={g.title}>
            <h3 className="mb-2 text-label uppercase text-subtle">{g.title}</h3>
            <div className="rounded-xl border border-border bg-surface">
              {g.items.map((item) => (
                <StatusRow key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
