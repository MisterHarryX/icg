import "server-only";
import { randomInt } from "node:crypto";
import { kvDel, kvGet, kvSet } from "@/lib/leads/kv";

/**
 * The managers' group is linked from the admin page: it shows a one-time code,
 * a manager sends `/bind <code>` in the group. Without the code nobody can
 * redirect leads to their own chat. TELEGRAM_GROUP_ID, when set, wins.
 */
const GROUP_KEY = "icg:tg:group";
const BIND_KEY = "icg:tg:bindcode";
const BIND_TTL = 15 * 60;

export type GroupInfo = { chatId: number; title?: string; boundAt: number; by?: string };

export async function getGroup(): Promise<GroupInfo | null> {
  const fromEnv = Number(process.env.TELEGRAM_GROUP_ID);
  if (fromEnv) return { chatId: fromEnv, title: "TELEGRAM_GROUP_ID", boundAt: 0 };
  const raw = await kvGet(GROUP_KEY).catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GroupInfo;
  } catch {
    return null;
  }
}

export async function setGroup(info: GroupInfo) {
  await kvSet(GROUP_KEY, JSON.stringify(info));
}

export async function unbindGroup() {
  await kvDel(GROUP_KEY);
}

export async function isManagersChat(chatId: number) {
  const group = await getGroup();
  return group !== null && group.chatId === chatId;
}

export async function createBindCode() {
  const code = String(randomInt(100000, 1000000));
  await kvSet(BIND_KEY, code, BIND_TTL);
  return { code, expiresAt: Date.now() + BIND_TTL * 1000 };
}

/** True once per issued code. */
export async function consumeBindCode(code: string) {
  const expected = await kvGet(BIND_KEY);
  if (!expected || expected !== code.trim()) return false;
  await kvDel(BIND_KEY);
  return true;
}
