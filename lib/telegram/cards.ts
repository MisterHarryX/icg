import "server-only";
import { ADMIN_TZ } from "@/lib/admin/env";
import { SITE_URL } from "@/lib/site";
import {
  SERVICE_EMOJI,
  SERVICE_LABELS,
  SOURCE_LABELS,
  STATUS_EMOJI,
  STATUS_LABELS,
  leadNumber,
  type Lead,
  type LeadStatus,
} from "@/lib/leads/types";
import { esc, type InlineButton } from "./api";

const dateTime = new Intl.DateTimeFormat("ru-RU", { timeZone: ADMIN_TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("ru-RU", { timeZone: ADMIN_TZ, day: "numeric", month: "short" });

export const formatDateTime = (ts: number) => dateTime.format(ts).replace(".", "");
export const formatDate = (ts: number) => dateOnly.format(ts).replace(".", "");

const HEADERS: Record<LeadStatus, string> = {
  new: "🆕 Новая заявка",
  work: "🛠 Заявка в работе",
  done: "✅ Заявка выполнена",
  rejected: "🚫 Заявка отклонена",
};

/** Turns "@name" / "t.me/name" into a link, phone numbers stay text (Telegram makes them tappable). */
export function contactHtml(contact: string) {
  const username = contact.match(/^@([A-Za-z0-9_]{4,32})$/)?.[1];
  if (username) return `<a href="https://t.me/${username}">@${username}</a>`;
  return esc(contact);
}

function quote(text: string) {
  const long = text.length > 280 || text.split("\n").length > 5;
  return `<blockquote${long ? " expandable" : ""}>${esc(text)}</blockquote>`;
}

/** The card in the managers' group. */
export function managerCard(lead: Lead) {
  const lines = [
    `<b>${HEADERS[lead.status]} ${leadNumber(lead.id)}</b>`,
    `<i>${SOURCE_LABELS[lead.source]} · ${formatDateTime(lead.createdAt)}</i>`,
    "",
    `👤 <b>${esc(lead.name)}</b>`,
    `📞 ${contactHtml(lead.contact)}`,
  ];
  if (lead.client) {
    const label = lead.client.username ? `@${esc(lead.client.username)}` : esc(lead.client.name || "профиль");
    lines.push(`✈️ Telegram: <a href="tg://user?id=${lead.client.tgId}">${label}</a>`);
  }
  lines.push(`${SERVICE_EMOJI[lead.service]} ${SERVICE_LABELS[lead.service]}`);
  if (lead.message) lines.push("", quote(lead.message));

  lines.push("", `Статус: ${STATUS_EMOJI[lead.status]} <b>${STATUS_LABELS[lead.status]}</b>${lead.manager ? ` · ${esc(lead.manager.name)}` : ""}`);
  const last = lead.history.at(-1);
  if (last && last.action === "status") lines.push(`<i>${formatDateTime(last.ts)} · ${esc(last.by.name)}</i>`);
  return lines.join("\n");
}

export function managerKeyboard(lead: Lead): InlineButton[][] {
  const set = (status: LeadStatus, text: string): InlineButton => ({ text, callback_data: `ls:${lead.id}:${status}` });
  const rows: InlineButton[][] = [];
  if (lead.status === "new") rows.push([set("work", "🙋 Взять в работу"), set("rejected", "✕ Отклонить")]);
  if (lead.status === "work") rows.push([set("done", "✅ Готово"), set("rejected", "✕ Отклонить")], [set("new", "↩️ Вернуть в новые")]);
  if (lead.status === "done" || lead.status === "rejected") rows.push([set("work", "↩️ Вернуть в работу")]);

  const links: InlineButton[] = [];
  const username = lead.client?.username ?? lead.contact.match(/^@([A-Za-z0-9_]{4,32})$/)?.[1];
  if (username) links.push({ text: "💬 Написать", url: `https://t.me/${username}` });
  if (SITE_URL.startsWith("https://")) links.push({ text: "🔗 В админке", url: `${SITE_URL}/admin/leads?id=${lead.id}` });
  if (links.length) rows.push(links);
  return rows;
}

/** One line per lead for lists (/leads in the group, "Мои заявки" for a client). */
export function leadLine(lead: Lead, withName = false) {
  const who = withName ? ` · ${esc(lead.name)}` : "";
  return `${STATUS_EMOJI[lead.status]} <b>${leadNumber(lead.id)}</b>${who} · ${SERVICE_LABELS[lead.service]}\n<i>${STATUS_LABELS[lead.status]} · ${formatDate(lead.createdAt)}</i>`;
}

/** What the client is told when a manager changes the status. */
export function clientStatusNotice(lead: Lead, studioTelegram: string) {
  const n = leadNumber(lead.id);
  switch (lead.status) {
    case "work":
      return `🛠 <b>Заявка ${n} в работе</b>\n\n${lead.manager ? `${esc(lead.manager.name)} уже` : "Мы уже"} занимаемся вашим проектом и скоро свяжемся с вами.`;
    case "done":
      return `✅ <b>Заявка ${n} выполнена</b>\n\nСпасибо, что выбрали ICG! Если появится новая задача — просто оставьте заявку ещё раз.`;
    case "rejected":
      return `Заявка ${n} закрыта.\n\nЕсли это ошибка или остались вопросы — напишите нам: @${esc(studioTelegram)}`;
    default:
      return null;
  }
}
