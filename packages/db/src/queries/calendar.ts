import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb } from "../client";
import { users } from "../schema";
import { getUserOrgs } from "./auth";
import { getMyTasks } from "./my-tasks";

export interface CalendarTask {
  id: string;
  title: string;
  listName: string;
  dueDate: Date;
}

export interface CalendarFeed {
  userName: string;
  tasks: CalendarTask[];
}

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Token do feed ICS do usuário (cria na 1ª vez). users não tem RLS. */
export async function getOrCreateCalendarToken(userId: string): Promise<string | null> {
  const db = getDb();
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u) return null;
  if (u.calendarToken) return u.calendarToken;
  const token = newToken();
  await db.update(users).set({ calendarToken: token }).where(eq(users.id, userId));
  return token;
}

/** Gera um token novo (invalida o anterior — links antigos param de funcionar). */
export async function regenerateCalendarToken(userId: string): Promise<string | null> {
  const db = getDb();
  const token = newToken();
  const res = await db
    .update(users)
    .set({ calendarToken: token })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return res.length ? token : null;
}

/** Tarefas com prazo do dono do token (todas as orgs em que ele participa). */
export async function getCalendarFeedByToken(token: string): Promise<CalendarFeed | null> {
  if (!token) return null;
  const db = getDb();
  const u = await db.query.users.findFirst({ where: eq(users.calendarToken, token) });
  if (!u) return null;

  const orgs = await getUserOrgs(u.id);
  const tasks: CalendarTask[] = [];
  for (const o of orgs) {
    const mine = await getMyTasks(o.id, u.id).catch(() => []);
    for (const t of mine) {
      if (t.dueDate) {
        tasks.push({ id: t.id, title: t.title, listName: t.listName, dueDate: t.dueDate });
      }
    }
  }
  return { userName: u.name, tasks };
}
