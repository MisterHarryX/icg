/** Leads (заявки): shared by the site form, the Telegram bot, the admin page and the API. */

export const LEAD_STATUSES = ["new", "work", "done", "rejected"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SERVICES = ["business", "beauty", "redesign", "other"] as const;
export type LeadService = (typeof LEAD_SERVICES)[number];

export type LeadSource = "site" | "bot" | "api";

export type LeadActor = { kind: "client" | "manager" | "admin" | "api" | "system"; name: string; tgId?: number; username?: string };

/** Who works with the client. The client sees the name, @username and phone. */
export type LeadManager = { name: string; username?: string; phone?: string; tgId?: number };

/** A manager saved in the team list (added on the site, or seen in the managers' group). */
export type Manager = LeadManager & { id: string; addedAt: number };

export type LeadEvent = {
  ts: number;
  by: LeadActor;
  action: "created" | "status" | "note" | "linked" | "edited" | "assigned";
  status?: LeadStatus;
  text?: string;
};

export type Lead = {
  id: number;
  /** Secret part of the "follow in Telegram" link given to site visitors. */
  token: string;
  createdAt: number;
  updatedAt: number;
  source: LeadSource;
  status: LeadStatus;
  name: string;
  /** Phone number or @username, as the client gave it. */
  contact: string;
  service: LeadService;
  message: string;
  locale?: string;
  /** Manager who took the lead. */
  manager?: LeadManager;
  /** Telegram account of the client (bot leads, or a site lead the client followed). */
  client?: { tgId: number; username?: string; name?: string };
  /** The card in the managers' group, edited on every change. */
  card?: { chatId: number; messageId: number };
  history: LeadEvent[];
};

/** Public view for the admin page (no token). */
export type LeadView = Omit<Lead, "token">;

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Новая",
  work: "В работе",
  done: "Готово",
  rejected: "Отклонена",
};

export const STATUS_EMOJI: Record<LeadStatus, string> = {
  new: "🔵",
  work: "🟡",
  done: "🟢",
  rejected: "⚪️",
};

export const SERVICE_LABELS: Record<LeadService, string> = {
  business: "Сайт для бизнеса",
  beauty: "Сайт для салона красоты",
  redesign: "Редизайн",
  other: "Другое",
};

export const SERVICE_EMOJI: Record<LeadService, string> = {
  business: "💼",
  beauty: "💅",
  redesign: "✨",
  other: "💡",
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  site: "с сайта",
  bot: "из бота",
  api: "через API",
};

export function leadNumber(id: number) {
  return `#${String(id).padStart(4, "0")}`;
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}

export function isLeadService(value: unknown): value is LeadService {
  return typeof value === "string" && (LEAD_SERVICES as readonly string[]).includes(value);
}

export const LIMITS = { name: 80, contact: 80, message: 1500 } as const;
