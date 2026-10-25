import "server-only";
import { SITE_URL } from "@/lib/site";
import { WEBHOOK_SECRET, botConfigured, getMe, tg } from "./api";
import { getGroup } from "./settings";

export const WEBHOOK_PATH = "/api/telegram/webhook";

/** Points Telegram at this site and sets the bot's commands and descriptions. */
export async function setupBot(baseUrl = SITE_URL) {
  if (!botConfigured) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  if (!baseUrl.startsWith("https://")) throw new Error("Telegram принимает webhook только по https — запустите настройку на опубликованном сайте");
  const url = `${baseUrl.replace(/\/$/, "")}${WEBHOOK_PATH}`;

  await tg("setWebhook", {
    url,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query", "my_chat_member"],
    drop_pending_updates: false,
    max_connections: 20,
  });

  await Promise.all([
    tg("setMyCommands", {
      commands: [
        { command: "start", description: "Главное меню" },
        { command: "new", description: "Оставить заявку" },
        { command: "my", description: "Мои заявки" },
        { command: "help", description: "Что умеет бот" },
      ],
      scope: { type: "all_private_chats" },
    }),
    tg("setMyCommands", {
      commands: [
        { command: "leads", description: "Открытые заявки" },
        { command: "stats", description: "Статистика заявок" },
        { command: "lead", description: "Карточка заявки по номеру" },
        { command: "bind", description: "Подключить группу (код из админки)" },
      ],
      scope: { type: "all_group_chats" },
    }),
    tg("setMyShortDescription", { short_description: "Веб-студия ICG: сайты для бизнеса. Оставьте заявку за минуту." }),
    tg("setMyDescription", {
      description:
        "Привет! Это бот веб-студии ICG.\n\n📝 Оставьте заявку на сайт за минуту\n💼 Посмотрите наши работы\n🔔 Узнавайте статус заявки прямо здесь\n\nНажмите «Старт», чтобы начать.",
    }),
  ]);
  return { url };
}

export type BotStatus = {
  configured: boolean;
  username?: string;
  webhookUrl?: string;
  webhookOk: boolean;
  pending?: number;
  lastError?: string;
  group: { chatId: number; title?: string } | null;
};

export async function botStatus(): Promise<BotStatus> {
  if (!botConfigured) return { configured: false, webhookOk: false, group: null };
  try {
    const [me, info, group] = await Promise.all([
      getMe(),
      tg<{ url: string; pending_update_count: number; last_error_message?: string; last_error_date?: number }>("getWebhookInfo"),
      getGroup(),
    ]);
    const recentError = info.last_error_date && Date.now() / 1000 - info.last_error_date < 3600 ? info.last_error_message : undefined;
    return {
      configured: true,
      username: me.username,
      webhookUrl: info.url || undefined,
      webhookOk: Boolean(info.url && info.url.endsWith(WEBHOOK_PATH)),
      pending: info.pending_update_count,
      lastError: recentError,
      group: group ? { chatId: group.chatId, title: group.title } : null,
    };
  } catch (error) {
    return { configured: true, webhookOk: false, lastError: error instanceof Error ? error.message : String(error), group: null };
  }
}
