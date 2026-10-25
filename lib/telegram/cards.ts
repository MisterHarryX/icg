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
  type LeadManager,
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

  lines.push("", `Статус: ${STATUS_EMOJI[lead.status]} <b>${STATUS_LABELS[lead.status]}</b>`);
  if (lead.manager) lines.push(`🙋 Менеджер: ${managerHtml(lead.manager)}`);
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

/** "Анна · @anna_icg" with the username as a link. */
export function managerHtml(manager: LeadManager) {
  const username = manager.username ? ` · <a href="https://t.me/${manager.username}">@${esc(manager.username)}</a>` : "";
  return `<b>${esc(manager.name)}</b>${username}`;
}

/** One line per lead for lists (/leads in the group, "Мои заявки" for a client). */
export function leadLine(lead: Lead, withName = false) {
  const who = withName ? ` · ${esc(lead.name)}` : "";
  const manager = lead.manager && lead.status === "work" ? `\n🙋 ${managerHtml(lead.manager)}` : "";
  return `${STATUS_EMOJI[lead.status]} <b>${leadNumber(lead.id)}</b>${who} · ${SERVICE_LABELS[lead.service]}\n<i>${STATUS_LABELS[lead.status]} · ${formatDate(lead.createdAt)}</i>${manager}`;
}

const MY_LEADS: InlineButton = { text: "📋 Мои заявки", callback_data: "m:my" };

/** What the client is told when the status (or their manager) changes. */
export function clientStatusNotice(lead: Lead, studioTelegram: string): { html: string; keyboard: InlineButton[][] } | null {
  const n = leadNumber(lead.id);
  switch (lead.status) {
    case "work": {
      const manager = lead.manager;
      const lines = [`🛠 <b>Заявка ${n} — в работе</b>`, ""];
      if (manager) {
        lines.push("Вашим проектом занимается менеджер:", `🙋 ${managerHtml(manager)}`);
        if (manager.phone) lines.push(`📞 ${esc(manager.phone)}`);
        lines.push("", manager.username ? "Он скоро свяжется с вами. Можно написать и самому — кнопка ниже." : "Он скоро свяжется с вами.");
      } else {
        lines.push("Мы уже занимаемся вашим проектом и скоро свяжемся с вами.");
      }
      const keyboard: InlineButton[][] = [];
      if (manager?.username) keyboard.push([{ text: `💬 Написать @${manager.username}`, url: `https://t.me/${manager.username}` }]);
      keyboard.push([MY_LEADS]);
      return { html: lines.join("\n"), keyboard };
    }
    case "done":
      return {
        html: `✅ <b>Заявка ${n} выполнена</b>\n\nСпасибо, что выбрали ICG! Если появится новая задача — просто оставьте заявку ещё раз.`,
        keyboard: [[MY_LEADS]],
      };
    case "rejected":
      return { html: `Заявка ${n} закрыта.\n\nЕсли это ошибка или остались вопросы — напишите нам: @${esc(studioTelegram)}`, keyboard: [[MY_LEADS]] };
    default:
      return null;
  }
}
