import "server-only";
import { createHash } from "node:crypto";

/**
 * Minimal Telegram Bot API client (no SDK). The bot runs as a webhook inside
 * this Next.js app: Telegram POSTs updates to /api/telegram/webhook.
 */
export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
export const botConfigured = BOT_TOKEN.length > 0;

/** Telegram sends it back in X-Telegram-Bot-Api-Secret-Token; derived from the token so no extra variable is needed. */
export const WEBHOOK_SECRET =
  process.env.TELEGRAM_WEBHOOK_SECRET || (BOT_TOKEN ? createHash("sha256").update(`icg-webhook:${BOT_TOKEN}`).digest("hex").slice(0, 48) : "");

// --- Types (only the fields we use) ----------------------------------------------

export type TgUser = { id: number; is_bot?: boolean; first_name: string; last_name?: string; username?: string; language_code?: string };
export type TgChat = { id: number; type: "private" | "group" | "supergroup" | "channel"; title?: string; username?: string };
export type TgContact = { phone_number: string; first_name: string; user_id?: number };

export type TgMessage = {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
  caption?: string;
  photo?: unknown[];
  contact?: TgContact;
  new_chat_members?: TgUser[];
  migrate_to_chat_id?: number;
};

export type TgCallbackQuery = { id: string; from: TgUser; message?: TgMessage; data?: string };

export type TgChatMemberUpdated = {
  chat: TgChat;
  from: TgUser;
  new_chat_member: { status: string; user: TgUser };
};

export type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
  my_chat_member?: TgChatMemberUpdated;
};

export type InlineButton = { text: string; callback_data?: string; url?: string };
export type ReplyButton = { text: string; request_contact?: boolean };

export type ReplyMarkup =
  | { inline_keyboard: InlineButton[][] }
  | { keyboard: ReplyButton[][]; resize_keyboard?: boolean; one_time_keyboard?: boolean; input_field_placeholder?: string }
  | { remove_keyboard: true };

// --- Calls -------------------------------------------------------------------------

export class TelegramError extends Error {
  constructor(
    public method: string,
    public code: number,
    public description: string,
  ) {
    super(`Telegram ${method}: ${code} ${description}`);
  }
}

export async function tg<T = unknown>(method: string, params: Record<string, unknown> = {}, { cacheFor }: { cacheFor?: number } = {}): Promise<T> {
  if (!botConfigured) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    // Read-only calls may be cached so static pages stay static; everything else goes straight through.
    ...(cacheFor ? { next: { revalidate: cacheFor } } : { cache: "no-store" as const }),
  });
  const data = (await response.json().catch(() => ({ ok: false, error_code: response.status, description: "bad response" }))) as {
    ok: boolean;
    result?: T;
    error_code?: number;
    description?: string;
  };
  if (!data.ok) throw new TelegramError(method, data.error_code ?? response.status, data.description ?? "");
  return data.result as T;
}

type SendOptions = { reply_markup?: ReplyMarkup; disable_preview?: boolean };

export function sendMessage(chatId: number, html: string, options: SendOptions = {}) {
  return tg<TgMessage>("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: options.disable_preview ?? true },
    reply_markup: options.reply_markup,
  });
}

export function sendPhoto(chatId: number, photo: string, captionHtml: string, options: SendOptions = {}) {
  return tg<TgMessage>("sendPhoto", { chat_id: chatId, photo, caption: captionHtml, parse_mode: "HTML", reply_markup: options.reply_markup });
}

/** Edits a text message; "message is not modified" is not an error. */
export async function editMessage(chatId: number, messageId: number, html: string, options: SendOptions = {}) {
  try {
    await tg("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: html,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: options.disable_preview ?? true },
      reply_markup: options.reply_markup,
    });
  } catch (error) {
    if (error instanceof TelegramError && /not modified/i.test(error.description)) return;
    throw error;
  }
}

export async function editCaption(chatId: number, messageId: number, html: string, options: SendOptions = {}) {
  try {
    await tg("editMessageCaption", { chat_id: chatId, message_id: messageId, caption: html, parse_mode: "HTML", reply_markup: options.reply_markup });
  } catch (error) {
    if (error instanceof TelegramError && /not modified/i.test(error.description)) return;
    throw error;
  }
}

export function answerCallback(id: string, text?: string, alert = false) {
  return tg("answerCallbackQuery", { callback_query_id: id, text, show_alert: alert }).catch(() => {});
}

export function deleteMessage(chatId: number, messageId: number) {
  return tg("deleteMessage", { chat_id: chatId, message_id: messageId }).catch(() => {});
}

let me: Promise<TgUser> | null = null;

/** The bot's own account (username for t.me links), cached per instance. */
export function getMe() {
  me ??= tg<TgUser>("getMe", {}, { cacheFor: 86_400 }).catch((error) => {
    me = null;
    throw error;
  });
  return me;
}

export async function botUsername() {
  if (process.env.TELEGRAM_BOT_USERNAME) return process.env.TELEGRAM_BOT_USERNAME;
  if (!botConfigured) return null;
  try {
    return (await getMe()).username ?? null;
  } catch {
    return null;
  }
}

// --- Formatting --------------------------------------------------------------------

export function esc(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function fullName(user: Pick<TgUser, "first_name" | "last_name">) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
}
