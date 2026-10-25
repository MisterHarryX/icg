import type { LeadManager, LeadStatus, LeadView, Manager } from "@/lib/leads/types";

export type { LeadManager, Manager };

export const STATUS_TONE: Record<LeadStatus, string> = {
  new: "border-blue/40 bg-blue/[0.12] text-[#8fb2ff]",
  work: "border-fair/35 bg-fair/[0.1] text-fair",
  done: "border-good/35 bg-good/[0.1] text-good",
  rejected: "border-line-strong bg-white/[0.04] text-fg-3",
};

export const STATUS_DOT: Record<LeadStatus, string> = { new: "bg-blue", work: "bg-fair", done: "bg-good", rejected: "bg-fg-3" };

export const ACTOR_LABELS = { client: "Клиент", manager: "Менеджер", admin: "Сайт", api: "API", system: "Система" } as const;

export const inputClass =
  "h-9 w-full min-w-0 rounded-[6px] border border-line-strong bg-surface-2 px-3 text-[13px] text-fg placeholder:text-fg-3 transition-colors focus:border-blue/60 focus:outline-none";

/** What a PATCH /api/admin/leads/[id] can carry. */
export type LeadPatch = {
  status?: LeadStatus;
  note?: string;
  edit?: { name?: string; contact?: string; service?: string; message?: string };
  assign?: { managerId?: string; manager?: { name: string; username?: string; phone?: string } };
};

export type UpdateLead = (id: number, patch: LeadPatch) => Promise<LeadView | null>;

/** The manager this admin picked last time (per browser). */
const LAST_KEY = "icg-admin-manager";

export function rememberManager(key: string) {
  try {
    localStorage.setItem(LAST_KEY, key);
  } catch {
    // Private mode: nothing to remember.
  }
}

export function lastManagerKey() {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

export const managerKey = (manager: LeadManager) => (manager.username ? `@${manager.username.toLowerCase()}` : manager.name);
