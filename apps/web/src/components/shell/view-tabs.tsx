"use client";

import {
  Calendar,
  GanttChartSquare,
  LayoutGrid,
  List,
  MessageSquare,
  Filter,
  SlidersHorizontal,
  UserPlus,
} from "lucide-react";
import { AvatarGroup, Tabs, TabsList, TabsTrigger, Button } from "@wayline/ui";
import { clients, docBrief } from "@/mock/data";

const views = [
  { id: "chat", label: "Chat", icon: <MessageSquare /> },
  { id: "board", label: "Board", icon: <LayoutGrid /> },
  { id: "list", label: "List", icon: <List /> },
  { id: "gantt", label: "Gantt", icon: <GanttChartSquare /> },
  { id: "calendar", label: "Calendar", icon: <Calendar /> },
];

export function ViewTabs({
  value,
  onValueChange,
  listName,
}: {
  value: string;
  onValueChange: (v: string) => void;
  listName: string;
}) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      {/* Contexto / breadcrumb */}
      <div className="flex items-center gap-2">
        <span
          className="flex size-5 items-center justify-center rounded text-[10px] font-bold text-white"
          style={{ backgroundColor: clients.acme.color }}
        >
          M
        </span>
        <span className="text-ui font-semibold">{listName}</span>
      </div>

      <div className="h-5 w-px bg-border" />

      <Tabs value={value} defaultValue="board" onValueChange={onValueChange}>
        <TabsList>
          {views.map((v) => (
            <TabsTrigger key={v.id} value={v.id} icon={v.icon}>
              {v.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="ml-auto flex items-center gap-2">
        <AvatarGroup people={docBrief.collaborators} size="sm" />
        <div className="h-5 w-px bg-border" />
        <Button variant="ghost" size="icon" aria-label="Filtrar">
          <Filter />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Opções da view">
          <SlidersHorizontal />
        </Button>
        <Button variant="secondary" size="sm">
          <UserPlus className="size-4" />
          Compartilhar
        </Button>
      </div>
    </div>
  );
}
