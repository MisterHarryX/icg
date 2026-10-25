import "server-only";
import { randomBytes } from "node:crypto";
import { isValidPhone, buildContacts } from "@/lib/constants/contacts";
import { getOverrides } from "@/lib/content/overrides";
import { botConfigured, botUsername, editMessage, sendMessage, TelegramError } from "@/lib/telegram/api";
import { clientStatusNotice, managerCard, managerKeyboard } from "@/lib/telegram/cards";
import { getGroup } from "@/lib/telegram/settings";
import { addClientLead, getLead, insertLead, nextLeadId, saveLead } from "./store";
import { LIMITS, STATUS_LABELS, isLeadService, type Lead, type LeadActor, type LeadManager, type LeadSource, type LeadStatus } from "./types";

/**
 * Everything that changes a lead goes through here, whatever the entry point
 * (site form, bot, admin page, API). After each change the managers' card is
 * re-rendered and the client is told, so the site and Telegram stay in sync.
 */

export type LeadInput = { name?: unknown; contact?: unknown; service?: unknown; message?: unknown; locale?: unknown };

export class LeadValidationError extends Error {
  constructor(
    public field: "name" | "contact" | "service" | "message",
    message: string,
  ) {
    super(message);
  }
}

function clean(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

/** Phone, @username / t.me link, or e-mail. Returns the normalized value or null. */
export function normalizeContact(raw: string) {
  const value = raw.trim();
  const tme = value.match(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{4,32})\/?$/i)?.[1];
  if (tme) return `@${tme}`;
  if (/^@[A-Za-z0-9_]{4,32}$/.test(value)) return value;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return value.toLowerCase();
  if (isValidPhone(value)) return value;
  return null;
}

export function validateLeadInput(input: LeadInput) {
  const name = clean(input.name, LIMITS.name);
  const contactRaw = clean(input.contact, LIMITS.contact);
  const message = clean(input.message, LIMITS.message);
  const service = isLeadService(input.service) ? input.service : "other";
  const locale = typeof input.locale === "string" && /^[a-z]{2}$/.test(input.locale) ? input.locale : undefined;

  if (name.length < 2) throw new LeadValidationError("name", "Укажите имя");
  const contact = normalizeContact(contactRaw);
  if (!contact) throw new LeadValidationError("contact", "Укажите телефон, @username или e-mail");
  return { name, contact, service, message, locale };
}

async function studioTelegram() {
  const { settings } = await getOverrides();
  return buildContacts(settings).telegramUsername;
}

// --- Telegram sync -----------------------------------------------------------------

/** Posts the card to the managers' group, or edits the existing one. Never throws. */
export async function syncManagerCard(lead: Lead) {
  if (!botConfigured) return;
  try {
    const group = await getGroup();
    if (!group) return;
    const html = managerCard(lead);
    const reply_markup = { inline_keyboard: managerKeyboard(lead) };

    if (lead.card && lead.card.chatId === group.chatId) {
      try {
        await editMessage(lead.card.chatId, lead.card.messageId, html, { reply_markup });
        return;
      } catch (error) {
        // The card was deleted in the chat: post a fresh one below.
        if (!(error instanceof TelegramError && /not found|can't be edited/i.test(error.description))) throw error;
      }
    }
    const sent = await sendMessage(group.chatId, html, { reply_markup });
    lead.card = { chatId: group.chatId, messageId: sent.message_id };
    await saveLead(lead);
  } catch (error) {
    console.error("[leads] could not sync the group card", error);
  }
}

async function notifyClient(lead: Lead) {
  if (!botConfigured || !lead.client) return;
  const notice = clientStatusNotice(lead, await studioTelegram());
  if (!notice) return;
  await sendMessage(lead.client.tgId, notice.html, { reply_markup: { inline_keyboard: notice.keyboard } }).catch((error) =>
    console.error("[leads] could not notify the client", error),
  );
}

// --- Operations --------------------------------------------------------------------

export async function createLead(
  input: LeadInput,
  source: LeadSource,
  actor: LeadActor,
  client?: Lead["client"],
): Promise<Lead> {
  const data = validateLeadInput(input);
  const now = Date.now();
  const lead: Lead = {
    id: await nextLeadId(),
    token: randomBytes(12).toString("base64url"),
    createdAt: now,
    updatedAt: now,
    source,
    status: "new",
    ...data,
    client,
    history: [{ ts: now, by: actor, action: "created" }],
  };
  await insertLead(lead);
  await syncManagerCard(lead);
  return lead;
}

export class LeadNotFoundError extends Error {}

export class LeadStateError extends Error {}

/**
 * Status change. Taking a lead ("work") needs a manager: the one pressing the
 * button in the group, or the one picked on the site (`manager`).
 */
export async function changeStatus(id: number, status: LeadStatus, actor: LeadActor, manager?: LeadManager) {
  const lead = await getLead(id);
  if (!lead) throw new LeadNotFoundError(`Заявка ${id} не найдена`);
  if (lead.status === status && !(status === "work" && manager)) return lead;

  if (status === "work") {
    const taker = manager ?? (actor.kind === "manager" ? { name: actor.name, username: actor.username, tgId: actor.tgId } : lead.manager);
    if (!taker) throw new LeadStateError("Выберите менеджера, который возьмёт заявку");
    lead.manager = taker;
  }
  if (status === "new") lead.manager = undefined;

  const statusChanged = lead.status !== status;
  lead.status = status;
  lead.history.push({
    ts: Date.now(),
    by: actor,
    action: "status",
    status,
    text: status === "work" && lead.manager ? `${STATUS_LABELS[status]} · ${managerLabel(lead.manager)}` : STATUS_LABELS[status],
  });
  await saveLead(lead);
  await Promise.all([syncManagerCard(lead), statusChanged || status === "work" ? notifyClient(lead) : null]);
  return lead;
}

export function managerLabel(manager: LeadManager) {
  return manager.username ? `${manager.name} (@${manager.username})` : manager.name;
}

/** Hands a lead to another manager (or takes a new one). The client gets the new contact. */
export async function assignManager(id: number, manager: LeadManager, actor: LeadActor) {
  const lead = await getLead(id);
  if (!lead) throw new LeadNotFoundError(`Заявка ${id} не найдена`);
  if (lead.status !== "work") return changeStatus(id, "work", actor, manager);

  lead.manager = manager;
  lead.history.push({ ts: Date.now(), by: actor, action: "assigned", text: `Менеджер: ${managerLabel(manager)}` });
  await saveLead(lead);
  await Promise.all([syncManagerCard(lead), notifyClient(lead)]);
  return lead;
}

const FIELD_LABELS = { name: "имя", contact: "контакт", service: "услуга", message: "описание" } as const;

/** Admin edits the lead's details; the group card is re-rendered. */
export async function editLead(id: number, patch: LeadInput, actor: LeadActor) {
  const lead = await getLead(id);
  if (!lead) throw new LeadNotFoundError(`Заявка ${id} не найдена`);
  const next = validateLeadInput({
    name: patch.name ?? lead.name,
    contact: patch.contact ?? lead.contact,
    service: patch.service ?? lead.service,
    message: patch.message ?? lead.message,
    locale: lead.locale,
  });
  const changed = (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).filter((field) => next[field] !== lead[field]);
  if (changed.length === 0) return lead;

  lead.name = next.name;
  lead.contact = next.contact;
  lead.service = next.service;
  lead.message = next.message;
  lead.history.push({ ts: Date.now(), by: actor, action: "edited", text: `Изменено: ${changed.map((field) => FIELD_LABELS[field]).join(", ")}` });
  await saveLead(lead);
  await syncManagerCard(lead);
  return lead;
}

export async function addNote(id: number, text: string, actor: LeadActor) {
  const lead = await getLead(id);
  if (!lead) throw new LeadNotFoundError(`Заявка ${id} не найдена`);
  const note = clean(text, 1000);
  if (!note) return lead;
  lead.history.push({ ts: Date.now(), by: actor, action: "note", text: note });
  await saveLead(lead);
  return lead;
}

/** A site visitor opened the "follow in Telegram" link. */
export async function linkClient(lead: Lead, client: NonNullable<Lead["client"]>) {
  if (lead.client?.tgId === client.tgId) return lead;
  lead.client = client;
  lead.history.push({ ts: Date.now(), by: { kind: "client", name: client.name || "Клиент", tgId: client.tgId }, action: "linked", text: "Подписался на статус в Telegram" });
  await saveLead(lead);
  await addClientLead(client.tgId, lead.id);
  await syncManagerCard(lead);
  return lead;
}

/** t.me deep link that links a site lead to the visitor's Telegram. */
export async function trackingLink(lead: Lead) {
  const username = await botUsername();
  return username ? `https://t.me/${username}?start=lead_${lead.token}` : null;
}

export { studioTelegram };
