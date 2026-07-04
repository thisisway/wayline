"use client";

import * as React from "react";
import { Check } from "lucide-react";
import type { CustomFieldWithValue } from "@wayline/db";
import { Input, cn } from "@wayline/ui";
import { setFieldValueAction, taskFieldsAction } from "@/actions/custom-fields";

const fieldLabel = "text-label uppercase text-subtle";
const selectClass =
  "h-9 w-full rounded-md border border-border bg-surface px-2 text-dense text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CustomFieldsSection({ orgId, taskId }: { orgId: string; taskId: string }) {
  const [fields, setFields] = React.useState<CustomFieldWithValue[] | null>(null);
  const [values, setValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let alive = true;
    taskFieldsAction(orgId, taskId).then((f) => {
      if (!alive) return;
      setFields(f);
      setValues(Object.fromEntries(f.map((x) => [x.id, x.value ?? ""])));
    });
    return () => {
      alive = false;
    };
  }, [orgId, taskId]);

  function save(fieldId: string, value: string) {
    setValues((v) => ({ ...v, [fieldId]: value }));
    void setFieldValueAction(orgId, taskId, fieldId, value === "" ? null : value).catch(() => {});
  }

  if (fields === null || fields.length === 0) return null;

  return (
    <div className="border-t border-border px-5 py-4">
      <span className={cn(fieldLabel, "mb-3 block")}>Campos</span>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {fields.map((f) => {
          const value = values[f.id] ?? "";
          return (
            <div key={f.id} className="space-y-1">
              <label className="text-[11px] font-semibold text-subtle">{f.name}</label>
              {f.type === "checkbox" ? (
                <button
                  type="button"
                  onClick={() => save(f.id, value === "1" ? "" : "1")}
                  className={cn(
                    "flex h-9 w-full items-center gap-2 rounded-md border px-2 text-dense transition-colors",
                    value === "1"
                      ? "border-success/50 bg-success/10 text-success"
                      : "border-border text-muted hover:bg-elevated",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded border",
                      value === "1" ? "border-success bg-success text-white" : "border-border",
                    )}
                  >
                    {value === "1" && <Check className="size-3" />}
                  </span>
                  {value === "1" ? "Sim" : "Não"}
                </button>
              ) : f.type === "select" ? (
                <select
                  className={selectClass}
                  value={value}
                  onChange={(e) => save(f.id, e.target.value)}
                >
                  <option value="">—</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  value={value}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.id]: e.target.value }))
                  }
                  onBlur={(e) => save(f.id, e.target.value)}
                  className="h-9 text-dense"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
