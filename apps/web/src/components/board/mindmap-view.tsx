"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CheckCircle2 } from "lucide-react";
import type { MindMapNode } from "@wayline/db";
import { cn } from "@wayline/ui";
import { listMindMapAction } from "@/actions/mindmap";

const PRIO_COLOR: Record<MindMapNode["priority"], string> = {
  urgent: "#FF3B30",
  high: "#FFB800",
  normal: "#1D66FF",
  low: "#94A3B8",
};

const X_GAP = 300;
const Y_GAP = 54;

type NodeKind = "root" | "task" | "subtask";
interface MindData extends Record<string, unknown> {
  kind: NodeKind;
  title: string;
  completed: boolean;
  color: string;
  statusName: string | null;
}

/** Nó custom do mapa (pílula/cartão), com handles ocultos p/ as conexões. */
function MindNode({ data }: NodeProps) {
  const d = data as MindData;
  if (d.kind === "root") {
    return (
      <div className="rounded-xl bg-brand px-4 py-2.5 text-center font-display text-ui font-bold text-white shadow-lg">
        <Handle type="source" position={Position.Right} className="!opacity-0" />
        {d.title}
      </div>
    );
  }
  const subtask = d.kind === "subtask";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-surface shadow-sm transition-colors",
        subtask ? "px-2.5 py-1.5 text-dense" : "px-3 py-2 text-ui",
      )}
      style={{ borderLeft: `3px solid ${d.color}`, maxWidth: 240 }}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      {d.completed ? (
        <CheckCircle2 className="size-3.5 shrink-0 text-success" />
      ) : (
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
      )}
      <span
        className={cn(
          "truncate font-medium text-foreground",
          d.completed && "text-subtle line-through",
        )}
        title={d.title}
      >
        {d.title}
      </span>
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  );
}

const nodeTypes = { mind: MindNode };

/** Layout em árvore da esquerda p/ direita: x por profundidade, y por folhas. */
function computeLayout(
  listName: string,
  raw: MindMapNode[],
): { nodes: Node[]; edges: Edge[] } {
  const topLevel = raw.filter((n) => !n.parentId);
  const childrenOf = new Map<string, MindMapNode[]>();
  for (const n of raw) {
    if (n.parentId) {
      const arr = childrenOf.get(n.parentId) ?? [];
      arr.push(n);
      childrenOf.set(n.parentId, arr);
    }
  }

  const pos = new Map<string, { x: number; y: number }>();
  let leaf = 0;
  function place(id: string, depth: number): number {
    const kids = id === "root" ? topLevel : childrenOf.get(id) ?? [];
    let y: number;
    if (kids.length === 0) {
      y = leaf * Y_GAP;
      leaf += 1;
    } else {
      const ys = kids.map((k) => place(k.id, depth + 1));
      y = (ys[0]! + ys[ys.length - 1]!) / 2;
    }
    pos.set(id, { x: depth * X_GAP, y });
    return y;
  }
  place("root", 0);

  const nodes: Node[] = [
    {
      id: "root",
      type: "mind",
      position: pos.get("root")!,
      data: { kind: "root", title: listName, completed: false, color: "#1D66FF", statusName: null },
      draggable: false,
    },
    ...raw.map((n) => ({
      id: n.id,
      type: "mind",
      position: pos.get(n.id)!,
      data: {
        kind: n.isSubtask ? "subtask" : "task",
        title: n.title,
        completed: n.completed,
        color: n.statusColor ?? PRIO_COLOR[n.priority],
        statusName: n.statusName,
      } satisfies MindData,
    })),
  ];

  const edges: Edge[] = raw.map((n) => ({
    id: `e-${n.id}`,
    source: n.parentId ?? "root",
    target: n.id,
    type: "smoothstep",
    style: { stroke: "#94A3B8", strokeWidth: 1.5 },
  }));

  return { nodes, edges };
}

export function MindMapView({
  orgId,
  listId,
  listName,
  onOpenTask,
}: {
  orgId: string;
  listId: string;
  listName: string;
  onOpenTask: (taskId: string) => void;
}) {
  const [raw, setRaw] = React.useState<MindMapNode[] | null>(null);
  const [dark, setDark] = React.useState(true);

  React.useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    let alive = true;
    setRaw(null);
    listMindMapAction(orgId, listId).then((m) => {
      if (alive) setRaw(m?.nodes ?? []);
    });
    return () => {
      alive = false;
    };
  }, [orgId, listId]);

  const { nodes, edges } = React.useMemo(
    () => computeLayout(listName, raw ?? []),
    [listName, raw],
  );

  if (raw === null) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-ui text-subtle">
        Montando o mapa mental…
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={dark ? "dark" : "light"}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.75}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        edgesFocusable={false}
        onNodeClick={(_, node) => {
          if (node.id !== "root" && (node.data as MindData).kind === "task") {
            onOpenTask(node.id);
          }
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-elevated" />
      </ReactFlow>
      {raw.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-lg bg-surface/90 px-4 py-2 text-ui text-muted shadow">
            Sem tarefas nesta lista ainda — crie tarefas para ver o mapa.
          </p>
        </div>
      )}
    </div>
  );
}
