import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { withOrg } from "../client";
import { accessEntries, accessTables } from "../schema";

/**
 * Criptografia em repouso das senhas (AES-256-GCM), habilitada pela env
 * ACCESS_ENC_KEY (32 bytes: 64 hex ou base64). Sem a chave, guarda em texto
 * plano (comportamento atual) — assim nada quebra até você configurar.
 * Valores cifrados levam o prefixo `enc:v1:`; texto plano legado é lido normal.
 */
const ENC_KEY = (() => {
  const raw = process.env.ACCESS_ENC_KEY;
  if (!raw) return null;
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  return buf.length === 32 ? buf : null;
})();
const ENC_PREFIX = "enc:v1:";

function encryptSecret(plain: string): string {
  if (!ENC_KEY || plain === "") return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ENC_PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

function decryptSecret(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) return stored; // texto plano legado
  if (!ENC_KEY) return ""; // cifrado mas sem chave: não expõe nada
  try {
    const raw = Buffer.from(stored.slice(ENC_PREFIX.length), "base64");
    const decipher = createDecipheriv("aes-256-gcm", ENC_KEY, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export interface AccessEntryDTO {
  id: string;
  name: string;
  url: string;
  login: string;
  secret: string;
  status: string;
  pwdChanged: boolean;
  note: string;
}

export interface AccessEntryInput {
  name?: string;
  url?: string;
  login?: string;
  secret?: string;
  status?: string;
  pwdChanged?: boolean;
  note?: string;
}

function toDTO(r: typeof accessEntries.$inferSelect): AccessEntryDTO {
  return {
    id: r.id,
    name: r.name,
    url: r.url,
    login: r.login,
    secret: decryptSecret(r.secret),
    status: r.status,
    pwdChanged: r.pwdChanged,
    note: r.note,
  };
}

export async function listAccessEntries(orgId: string, tableId: string): Promise<AccessEntryDTO[]> {
  try {
    return await withOrg(orgId, async (tx) => {
      const rows = await tx.query.accessEntries.findMany({
        where: and(eq(accessEntries.tableId, tableId), isNull(accessEntries.deletedAt)),
        orderBy: [asc(accessEntries.position), asc(accessEntries.createdAt)],
      });
      return rows.map(toDTO);
    });
  } catch {
    return [];
  }
}

// --- Cofres (access_tables) ------------------------------------------------

export interface AccessTableDTO {
  id: string;
  name: string;
  spaceId: string;
  folderId: string | null;
}

/** Todos os cofres da org (para montar a árvore da sidebar). */
export async function listAccessTables(orgId: string): Promise<AccessTableDTO[]> {
  try {
    return await withOrg(orgId, async (tx) => {
      const rows = await tx.query.accessTables.findMany({
        where: isNull(accessTables.deletedAt),
        orderBy: [asc(accessTables.position), asc(accessTables.createdAt)],
      });
      return rows.map((r) => ({ id: r.id, name: r.name, spaceId: r.spaceId, folderId: r.folderId }));
    });
  } catch {
    return [];
  }
}

export async function createAccessTable(
  orgId: string,
  spaceId: string,
  folderId: string | null = null,
  name = "Acessos",
): Promise<string | null> {
  return withOrg(orgId, async (tx) => {
    const [row] = await tx
      .insert(accessTables)
      .values({ orgId, spaceId, folderId, name: name.trim() || "Acessos" })
      .returning({ id: accessTables.id });
    return row?.id ?? null;
  });
}

export async function renameAccessTable(orgId: string, id: string, name: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.update(accessTables).set({ name: name.trim() || "Acessos" }).where(eq(accessTables.id, id));
  });
}

/** Move o cofre para outra pasta/space. */
export async function moveAccessTable(
  orgId: string,
  id: string,
  spaceId: string,
  folderId: string | null,
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.update(accessTables).set({ spaceId, folderId }).where(eq(accessTables.id, id));
  });
}

/** Exclui (soft) o cofre e suas credenciais. */
export async function deleteAccessTable(orgId: string, id: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    const now = new Date();
    await tx.update(accessEntries).set({ deletedAt: now }).where(eq(accessEntries.tableId, id));
    await tx.update(accessTables).set({ deletedAt: now }).where(eq(accessTables.id, id));
  });
}

export async function createAccessEntry(
  orgId: string,
  tableId: string,
  input: AccessEntryInput,
): Promise<AccessEntryDTO | null> {
  return withOrg(orgId, async (tx) => {
    const table = await tx.query.accessTables.findFirst({ where: eq(accessTables.id, tableId) });
    if (!table) return null;
    const [row] = await tx
      .insert(accessEntries)
      .values({
        orgId,
        spaceId: table.spaceId,
        tableId,
        name: input.name?.trim() || "Acesso",
        url: input.url ?? "",
        login: input.login ?? "",
        secret: encryptSecret(input.secret ?? ""),
        status: input.status === "inactive" ? "inactive" : "active",
        pwdChanged: input.pwdChanged ?? false,
        note: input.note ?? "",
      })
      .returning();
    return row ? toDTO(row) : null;
  });
}

export async function updateAccessEntry(
  orgId: string,
  id: string,
  input: AccessEntryInput,
): Promise<void> {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) set.name = input.name.trim() || "Acesso";
  if (input.url !== undefined) set.url = input.url;
  if (input.login !== undefined) set.login = input.login;
  if (input.secret !== undefined) set.secret = encryptSecret(input.secret);
  if (input.status !== undefined) set.status = input.status === "inactive" ? "inactive" : "active";
  if (input.pwdChanged !== undefined) set.pwdChanged = input.pwdChanged;
  if (input.note !== undefined) set.note = input.note;
  await withOrg(orgId, async (tx) => {
    await tx.update(accessEntries).set(set).where(eq(accessEntries.id, id));
  });
}

export async function deleteAccessEntry(orgId: string, id: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.update(accessEntries).set({ deletedAt: new Date() }).where(eq(accessEntries.id, id));
  });
}

/** Reordena as credenciais na ordem dos ids dados (position = índice). */
export async function reorderAccessEntries(orgId: string, ids: string[]): Promise<void> {
  await withOrg(orgId, async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx.update(accessEntries).set({ position: i }).where(eq(accessEntries.id, ids[i]!));
    }
  });
}
