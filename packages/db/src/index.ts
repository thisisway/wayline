/**
 * Ponto de entrada do pacote @wayline/db.
 *
 * Ainda SEM cliente de conexão nesta fase. Exporta o schema e tipos inferidos
 * para consumo tipado (ex.: dados mockados no app). Quando o Postgres entrar,
 * adicionamos aqui o `drizzle(pool, { schema })` e a injeção do `org_id` (RLS).
 */
export * as schema from "./schema";
export { getDb, closeDb, type Database } from "./client";

export {
  getDefaultBoard,
  getBoardForOrg,
  getTaskCard,
  getWorkspaceNav,
  type BoardData,
  type BoardColumnDTO,
  type BoardTaskDTO,
  type BoardClientDTO,
  type BoardMemberDTO,
  type DependencyEdge,
  type NavSpace,
  type NavList,
} from "./queries/board";
export {
  getUserByEmail,
  getUsersByIds,
  createUser,
  resolveUserOrg,
  getUserOrgs,
  userCanAccessList,
  type AuthUser,
  type UserOrg,
} from "./queries/auth";
export { createOrg, createSpace, createList, duplicateListStructure } from "./queries/orgs";
export {
  createStatus,
  renameStatus,
  setStatusColor,
  setStatusKind,
  syncTaskCompleted,
  moveStatus,
  deleteStatus,
  type StatusDTO,
} from "./queries/statuses";
export {
  upsertVerification,
  getVerification,
  bumpVerificationAttempts,
  deleteVerification,
  type VerificationRow,
} from "./queries/email-verification";
export {
  listClients,
  createClient,
  updateClient,
  archiveClient,
  type ClientDTO,
  type CreateClientInput,
} from "./queries/clients";
export {
  getWorkspaceMembers,
  addMemberByEmail,
  setMemberRole,
  removeMember,
  type WorkspaceMember,
  type AddMemberStatus,
} from "./queries/members";
export {
  createInvitation,
  listInvitations,
  revokeInvitation,
  getInvitationByToken,
  acceptInvitation,
  type InvitationDTO,
  type InvitationLookup,
  type AcceptResult,
} from "./queries/invitations";
export {
  getActiveShare,
  getOrCreateShare,
  revokeShares,
  getShareByToken,
  resolveShareTask,
  type ShareLookup,
} from "./queries/board-shares";
export {
  listAutomations,
  createAutomation,
  deleteAutomation,
  applyAutomations,
  type AutomationDTO,
  type AutomationActionType,
  type AutomationTriggerType,
  type AutomationTrigger,
} from "./queries/automations";
export {
  saveBoardOrder,
  saveBoardOrderLogged,
  createTask,
  updateTask,
  duplicateTask,
  deleteTask,
  setTaskApproval,
  spawnRecurrence,
  bulkSetStatus,
  bulkSetPriority,
  bulkDeleteTasks,
  type BoardOrderInput,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "./queries/mutations";
export {
  getTaskComments,
  addComment,
  deleteComment,
  assignComment,
  getAssignedComments,
  notifyReply,
  getMyReplies,
  getPublicComments,
  addPublicComment,
  type CommentDTO,
  type CommentAuthor,
  type AddCommentInput,
  type AssignedComment,
  type ReplyDTO,
  type PublicCommentDTO,
} from "./queries/comments";
export {
  getSubtasks,
  createSubtask,
  setSubtaskDone,
  deleteSubtask,
  type Subtask,
} from "./queries/subtasks";
export { getMyTasks, type MyTask } from "./queries/my-tasks";
export { searchTasks, type SearchResult } from "./queries/search";
export { getChatMessages, sendChatMessage, type ChatMessage } from "./queries/chat";
export {
  createAttachment,
  getTaskAttachments,
  getAttachmentKey,
  getAttachmentForTask,
  deleteAttachmentRow,
  type AttachmentDTO,
  type CreateAttachmentInput,
} from "./queries/attachments";
export {
  getTaskDependencies,
  getTaskOptions,
  addDependency,
  removeDependency,
  type TaskDependencies,
  type DependencyTaskDTO,
  type TaskOption,
  type AddDependencyResult,
} from "./queries/dependencies";
export {
  getTaskTimeEntries,
  getRunningTimer,
  startTimer,
  stopTimer,
  addManualEntry,
  deleteTimeEntry,
  getTaskTrackedSeconds,
  type TimeEntryDTO,
  type RunningTimer,
} from "./queries/time-tracking";
export { getOrgReport, type OrgReport, type ReportRow } from "./queries/reports";
export {
  getOrgDashboard,
  type OrgDashboard,
  type DashboardMemberLoad,
  type DashboardClientProgress,
} from "./queries/dashboard";
export { getListDoc, upsertListDoc, type DocDTO } from "./queries/documents";
export {
  getTaskActivity,
  logCreated,
  logTaskChanges,
  type ActivityDTO,
} from "./queries/activity";
export {
  getListFields,
  createField,
  updateField,
  deleteField,
  getTaskFields,
  setFieldValue,
  type CustomFieldType,
  type CustomFieldDef,
  type CustomFieldWithValue,
  type CreateFieldInput,
} from "./queries/custom-fields";
export {
  notifyTaskAssignees,
  notifyAssigned,
  notifyMentions,
  notifyApproval,
  getNotifications,
  markNotificationsRead,
  type NotificationDTO,
} from "./queries/notifications";

import type {
  organizations,
  users,
  memberships,
  clients,
  spaces,
  folders,
  lists,
  statuses,
  tasks,
  taskAssignees,
} from "./schema";

// Tipos de leitura (select) inferidos do schema.
export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Space = typeof spaces.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type List = typeof lists.$inferSelect;
export type Status = typeof statuses.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskAssignee = typeof taskAssignees.$inferSelect;
