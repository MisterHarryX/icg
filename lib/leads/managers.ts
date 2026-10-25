import "server-only";
import { randomBytes } from "node:crypto";
import { isValidPhone } from "@/lib/constants/contacts";
import { kvGet, kvSet } from "./kv";
import type { LeadManager, Manager } from "./types";

/** The team list: managers who can take leads. Stored as one small JSON value. */
const KEY = "icg:managers";

export class ManagerValidationError extends Error {}

export async function listManagers(): Promise<Manager[]> {
  const raw = await kvGet(KEY).catch(() => null);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Manager[];
  } catch {
    return [];
  }
}

async function save(managers: Manager[]) {
  await kvSet(KEY, JSON.stringify(managers.slice(0, 100)));
}

/** "@name", "t.me/name", "name" → "name"; "" stays empty; null when invalid. */
export function cleanUsername(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  const name = value.trim().replace(/^(https?:\/\/)?(t\.me|telegram\.me)\//i, "").replace(/^@/, "").replace(/\/$/, "");
  return /^[A-Za-z0-9_]{4,32}$/.test(name) ? name : null;
}

/** Validates what the admin typed into "Новый менеджер". */
export function parseManagerInput(input: { name?: unknown; username?: unknown; phone?: unknown }): LeadManager {
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ").slice(0, 60) : "";
  if (name.length < 2) throw new ManagerValidationError("Укажите имя менеджера");
  const username = cleanUsername(input.username);
  if (username === null) throw new ManagerValidationError("Telegram указан неверно: нужен @username");
  const phone = typeof input.phone === "string" ? input.phone.trim().slice(0, 30) : "";
  if (phone && !isValidPhone(phone)) throw new ManagerValidationError("Телефон указан неверно");
  return { name, username: username || undefined, phone: phone || undefined };
}

const same = (a: LeadManager, b: LeadManager) =>
  Boolean((a.tgId && a.tgId === b.tgId) || (a.username && b.username && a.username.toLowerCase() === b.username.toLowerCase()));

/**
 * Adds a manager or updates the one with the same Telegram id / @username.
 * Fields already filled on the site (e.g. a phone) are kept.
 */
export async function upsertManager(input: LeadManager): Promise<Manager> {
  const managers = await listManagers();
  const existing = managers.find((manager) => same(manager, input));
  if (existing) {
    const merged: Manager = {
      ...existing,
      name: input.name || existing.name,
      username: input.username ?? existing.username,
      phone: input.phone ?? existing.phone,
      tgId: input.tgId ?? existing.tgId,
    };
    await save(managers.map((manager) => (manager.id === existing.id ? merged : manager)));
    return merged;
  }
  const created: Manager = { ...input, id: randomBytes(6).toString("base64url"), addedAt: Date.now() };
  await save([...managers, created]);
  return created;
}

export async function getManager(id: string) {
  return (await listManagers()).find((manager) => manager.id === id) ?? null;
}

export async function removeManager(id: string) {
  const managers = await listManagers();
  await save(managers.filter((manager) => manager.id !== id));
}

/** The part of a team member that goes into a lead. */
export function toLeadManager(manager: LeadManager): LeadManager {
  return { name: manager.name, username: manager.username, phone: manager.phone, tgId: manager.tgId };
}
