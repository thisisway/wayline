"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { BoardData, BoardTaskDTO } from "@wayline/db";
import { dtoToForm, type TaskFormInput } from "@/lib/board";
import { createTaskAction, deleteTaskAction, updateTaskAction } from "@/actions/board";
import { pokeList } from "@/actions/live";
import { TaskModal } from "@/components/board/task-modal";

type ModalState =
  | { mode: "create"; statusId: string; dueDate?: string }
  | { mode: "edit"; task: BoardTaskDTO }
  | null;

/**
 * Edição de tarefa compartilhada por renderizadores sem estado otimista
 * (List, Calendar): abre o TaskModal e, após criar/editar/excluir, refetcha
 * (router.refresh) e notifica o realtime (pokeList). O Board usa sua própria
 * versão otimista (por causa do drag).
 */
export function useTaskEditor(data: BoardData) {
  const router = useRouter();
  const [state, setState] = React.useState<ModalState>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(input: TaskFormInput) {
    if (!state) return;
    setSubmitting(true);
    try {
      if (state.mode === "create") await createTaskAction(data.orgId, input);
      else await updateTaskAction(data.orgId, state.task.id, input);
      void pokeList(data.listId);
      setState(null);
      router.refresh();
    } catch (err) {
      console.error("Falha ao salvar a tarefa:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (state?.mode !== "edit") return;
    setSubmitting(true);
    try {
      await deleteTaskAction(data.orgId, state.task.id);
      void pokeList(data.listId);
      setState(null);
      router.refresh();
    } catch (err) {
      console.error("Falha ao excluir a tarefa:", err);
    } finally {
      setSubmitting(false);
    }
  }

  const initial: TaskFormInput =
    state?.mode === "edit"
      ? dtoToForm(state.task)
      : {
          statusId: state?.mode === "create" ? state.statusId : (data.columns[0]?.id ?? ""),
          title: "",
          description: "",
          priority: "normal",
          clientId: null,
          startDate: null,
          dueDate: state?.mode === "create" ? (state.dueDate ?? null) : null,
          assigneeIds: [],
          tags: [],
        };

  const modal = state ? (
    <TaskModal
      mode={state.mode}
      orgId={data.orgId}
      currentUserId={data.currentUserId}
      taskId={state.mode === "edit" ? state.task.id : undefined}
      columns={data.columns.map((c) => ({ id: c.id, name: c.name }))}
      clients={data.clients}
      members={data.members}
      initial={initial}
      submitting={submitting}
      onClose={() => setState(null)}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      onSubtaskCountChange={() => {
        void pokeList(data.listId);
        router.refresh();
      }}
      onCommentCountChange={() => {
        void pokeList(data.listId);
        router.refresh();
      }}
    />
  ) : null;

  return {
    openCreate: (statusId: string, dueDate?: string) =>
      setState({ mode: "create", statusId, dueDate }),
    openEdit: (task: BoardTaskDTO) => setState({ mode: "edit", task }),
    modal,
  };
}
