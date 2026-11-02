import "server-only";
import { buildContacts } from "@/lib/constants/contacts";
import { getOverrides } from "@/lib/content/overrides";
import { kvDel, kvGet, kvSadd, kvSet, kvSetNx } from "@/lib/leads/kv";
import {
  LeadNotFoundError,
  LeadValidationError,
  changeStatus,
  createLead,
  linkClient,
  normalizeContact,
  syncManagerCard,
} from "@/lib/leads/service";
import { clientLeads, findLeadByToken, getLead, listLeads } from "@/lib/leads/store";
import { toLeadManager, upsertManager } from "@/lib/leads/managers";
import {
  LEAD_SERVICES,
  LIMITS,
  SERVICE_EMOJI,
  SERVICE_LABELS,
  STATUS_EMOJI,
  STATUS_LABELS,
  isLeadService,
  isLeadStatus,
  leadNumber,
  type LeadService,
} from "@/lib/leads/types";
import { SERVER_URL, SITE_URL } from "@/lib/site";
import {
  answerCallback,
  botUsername,
  editCaption,
  editPhoto,
  editMessage,
  esc,
  fullName,
  sendMessage,
  sendPhoto,
  type InlineButton,
  type ReplyMarkup,
  type TgCallbackQuery,
  type TgMessage,
  type TgUpdate,
  type TgUser,
} from "./api";
import { contactHtml, leadLine } from "./cards";
import { PROJECTS, projectHost, type Project } from "./projects";
import { consumeBindCode, getGroup, isManagersChat, setGroup } from "./settings";

/**
 * The ICG bot. Clients talk to it in private: a menu that lives in one
 * message (edited in place), and a 4-step request form. Managers work in
 * their group: every lead arrives as a card with status buttons.
 */

const SITE_HTTPS = SITE_URL.startsWith("https://");
// The banner is drawn by the server (the static copy of the site has no image endpoint).
const BANNER_URL = process.env.TELEGRAM_BANNER_URL || (SERVER_URL.startsWith("https://") ? `${SERVER_URL}/ru/opengraph-image` : "");

// --- Request form state (per user, 1 hour) -------------------------------------------

type Draft = {
  step: "service" | "name" | "contact" | "message" | "confirm";
  service?: LeadService;
  name?: string;
  contact?: string;
  message?: string;
};

const draftKey = (userId: number) => `icg:tg:draft:${userId}`;

async function getDraft(userId: number): Promise<Draft | null> {
  const raw = await kvGet(draftKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

const saveDraft = (userId: number, draft: Draft) => kvSet(draftKey(userId), JSON.stringify(draft), 3600);
const clearDraft = (userId: number) => kvDel(draftKey(userId));

// --- Small helpers ------------------------------------------------------------------

const btn = (text: string, data: string): InlineButton => ({ text, callback_data: data });
const link = (text: string, url: string): InlineButton => ({ text, url });
const inline = (rows: InlineButton[][]): ReplyMarkup => ({ inline_keyboard: rows });

const BACK = btn("← Меню", "m:home");
const CANCEL = btn("✕ Отмена", "w:cancel");
const CANCEL_TEXT = "✕ Отменить заявку";

async function studio() {
  const { settings } = await getOverrides();
  return buildContacts(settings);
}

function siteUrl(hash = "") {
  return SITE_HTTPS ? `${SITE_URL}/ru${hash}` : null;
}

function parseCommand(text: string, username: string | null) {
  const match = text.match(/^\/([a-z_]+)(?:@([A-Za-z0-9_]+))?(?:\s+([\s\S]*))?$/i);
  if (!match) return null;
  const [, name, target, args = ""] = match;
  if (target && username && target.toLowerCase() !== username.toLowerCase()) return null;
  return { name: name.toLowerCase(), args: args.trim() };
}

// --- Screens (the menu message) ---------------------------------------------------------

/** `image` replaces the photo of the menu message (projects); menu screens show the ICG banner. */
type Screen = { html: string; keyboard: InlineButton[][]; image?: string; link?: string };

async function homeScreen(user: TgUser): Promise<Screen> {
  const site = siteUrl();
  const keyboard: InlineButton[][] = [
    [btn("📝 Оставить заявку", "m:new")],
    [btn("💼 Работы", "m:work"), btn("🧭 Как мы работаем", "m:how")],
    [btn("📋 Мои заявки", "m:my"), btn("💬 Контакты", "m:contact")],
  ];
  if (site) keyboard.push([link("🌐 Открыть сайт", site)]);
  return {
    html: [
      "<b>ICG — сайты для бизнеса</b>",
      "<i>Проще, чем вы думаете.</i>",
      "",
      `Привет, ${esc(user.first_name)}! 👋`,
      "Я бот веб-студии ICG. Помогу оставить заявку на сайт за минуту, покажу наши работы и сообщу, когда менеджер возьмёт заявку в работу.",
    ].join("\n"),
    keyboard,
  };
}

function workScreen(): Screen {
  return {
    html: [
      "<b>💼 Наши работы</b>",
      "",
      "Реальные сайты, которые мы сделали. Нажмите на проект — покажу подробнее и дам ссылку.",
      "",
      ...PROJECTS.map((project) => `${project.emoji} <b>${esc(project.name)}</b> — ${esc(project.short)}`),
    ].join("\n"),
    keyboard: [
      ...PROJECTS.map((project) => [btn(`${project.emoji} ${project.name}`, `p:${project.id}`)]),
      [btn("📝 Хочу такой же сайт", "m:new")],
      [BACK],
    ],
  };
}

function projectScreen(project: Project): Screen {
  const index = PROJECTS.indexOf(project);
  const prev = PROJECTS[(index - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(index + 1) % PROJECTS.length];
  return {
    html: [
      `${project.emoji} <b>${esc(project.name)}</b>`,
      `<i>${esc(project.kind)}</i>`,
      "",
      esc(project.text),
      "",
      ...project.highlights.map((item) => `• ${esc(item)}`),
      "",
      `🔗 <a href="${project.url}">${esc(projectHost(project.url))}</a>`,
    ].join("\n"),
    keyboard: [
      [link("🌐 Открыть сайт ↗", project.url)],
      [btn("‹", `p:${prev.id}`), btn(`${index + 1} / ${PROJECTS.length}`, "m:work"), btn("›", `p:${next.id}`)],
      [btn("📝 Хочу такой же", "m:new")],
      [btn("← Все работы", "m:work"), btn("🏠 Меню", "m:home")],
    ],
    image: project.image,
    link: project.url,
  };
}

function howScreen(): Screen {
  return {
    html: [
      "<b>🧭 Как мы работаем</b>",
      "",
      "<b>1. Расскажите о бизнесе</b>",
      "Чем занимаетесь, кто клиенты и что должен делать сайт.",
      "",
      "<b>2. Предлагаем концепцию</b>",
      "Структура и визуальное направление — согласуем с вами.",
      "",
      "<b>3. Проектируем и собираем</b>",
      "Дизайн, вёрстка и разработка — на нас.",
      "",
      "<b>4. Запускаем</b>",
      "Домен, хостинг, SSL, проверка на всех устройствах. Отдаём сайт с админ-панелью.",
      "",
      "Разбираться в макетах, коде или серверах не нужно.",
    ].join("\n"),
    keyboard: [[btn("📝 Оставить заявку", "m:new")], [BACK]],
  };
}

async function contactScreen(): Promise<Screen> {
  const contacts = await studio();
  return {
    html: [
      "<b>💬 Контакты</b>",
      "",
      `✈️ Telegram: <a href="${contacts.telegramUrl}">@${esc(contacts.telegramUsername)}</a>`,
      `📞 Телефон: ${esc(contacts.phone)}`,
      "",
      "Или оставьте заявку здесь — менеджер сам свяжется с вами.",
    ].join("\n"),
    keyboard: [[link("✈️ Написать в Telegram", contacts.telegramUrl)], [btn("📝 Оставить заявку", "m:new")], [BACK]],
  };
}

async function myScreen(user: TgUser): Promise<Screen> {
  const leads = await clientLeads(user.id);
  if (leads.length === 0) {
    return {
      html: "<b>📋 Мои заявки</b>\n\nПока заявок нет. Оставьте первую — это займёт минуту.",
      keyboard: [[btn("📝 Оставить заявку", "m:new")], [BACK]],
    };
  }
  return {
    html: ["<b>📋 Мои заявки</b>", "", ...leads.slice(0, 10).map((lead) => leadLine(lead)), "", "Об изменениях статуса я напишу сюда."].join("\n\n").replace(/\n{3,}/g, "\n\n"),
    keyboard: [[btn("📝 Новая заявка", "m:new")], [BACK]],
  };
}

async function renderScreen(name: string, user: TgUser): Promise<Screen | null> {
  switch (name) {
    case "home":
      return homeScreen(user);
    case "work":
      return workScreen();
    case "how":
      return howScreen();
    case "contact":
      return contactScreen();
    case "my":
      return myScreen(user);
    default:
      return null;
  }
}

/** Shows a screen in place of `message` when given, else as a new message. */
async function showScreen(chatId: number, screen: Screen, message?: TgMessage) {
  const reply_markup = inline(screen.keyboard);
  if (message?.photo) {
    // Swap the picture too: a project's preview, or back to the ICG banner.
    const photo = screen.image ?? BANNER_URL;
    if (photo) {
      try {
        await editPhoto(chatId, message.message_id, photo, screen.html, { reply_markup });
        return;
      } catch (error) {
        console.error("[bot] could not swap the photo", error);
      }
    }
    await editCaption(chatId, message.message_id, screen.html, { reply_markup });
    return;
  }
  // Text messages show a project as a large link preview instead.
  const options = { reply_markup, preview_url: screen.link };
  if (message) await editMessage(chatId, message.message_id, screen.html, options);
  else await sendMessage(chatId, screen.html, options);
}

/** The home menu as a fresh message, with the ICG banner when available. */
async function sendHome(chatId: number, user: TgUser) {
  const screen = await homeScreen(user);
  const reply_markup = inline(screen.keyboard);
  if (BANNER_URL) {
    try {
      await sendPhoto(chatId, BANNER_URL, screen.html, { reply_markup });
      return;
    } catch (error) {
      console.error("[bot] banner failed, sending text", error);
    }
  }
  await sendMessage(chatId, screen.html, { reply_markup });
}

// --- Request form --------------------------------------------------------------------

function serviceKeyboard(): InlineButton[][] {
  const buttons = LEAD_SERVICES.map((service) => btn(`${SERVICE_EMOJI[service]} ${SERVICE_LABELS[service]}`, `w:svc:${service}`));
  return [[buttons[0]], [buttons[1]], [buttons[2], buttons[3]], [CANCEL]];
}

const STEP_SERVICE = "📝 <b>Новая заявка</b> · шаг 1 из 4\n\nЧто нужно сделать?";

async function startForm(chatId: number, user: TgUser, message?: TgMessage) {
  await saveDraft(user.id, { step: "service" });
  // Form steps are plain text messages; a photo menu stays as it is.
  if (message && !message.photo) await editMessage(chatId, message.message_id, STEP_SERVICE, { reply_markup: inline(serviceKeyboard()) });
  else await sendMessage(chatId, STEP_SERVICE, { reply_markup: inline(serviceKeyboard()) });
}

async function askName(chatId: number, user: TgUser, draft: Draft, message?: TgMessage) {
  const html = [
    "📝 <b>Новая заявка</b> · шаг 2 из 4",
    "",
    `${SERVICE_EMOJI[draft.service ?? "other"]} ${SERVICE_LABELS[draft.service ?? "other"]}`,
    "",
    "Как к вам обращаться? Напишите имя или нажмите кнопку.",
  ].join("\n");
  const keyboard = [[btn(`✓ ${fullName(user).slice(0, 40)}`, "w:name")], [CANCEL]];
  if (message) await editMessage(chatId, message.message_id, html, { reply_markup: inline(keyboard) });
  else await sendMessage(chatId, html, { reply_markup: inline(keyboard) });
}

async function askContact(chatId: number, user: TgUser) {
  const rows: { text: string; request_contact?: boolean }[][] = [[{ text: "📱 Поделиться номером", request_contact: true }]];
  if (user.username) rows.push([{ text: `✈️ Пишите в Telegram: @${user.username}` }]);
  rows.push([{ text: CANCEL_TEXT }]);
  await sendMessage(
    chatId,
    "📝 <b>Новая заявка</b> · шаг 3 из 4\n\nКак с вами связаться? Нажмите кнопку внизу или отправьте телефон, @username или e-mail.",
    { reply_markup: { keyboard: rows, resize_keyboard: true, one_time_keyboard: true, input_field_placeholder: "+7 900 000-00-00" } },
  );
}

async function askMessage(chatId: number, contact: string) {
  // Close the contact keyboard first (a message can't carry both keyboards).
  await sendMessage(chatId, `✓ Контакт: ${contactHtml(contact)}`, { reply_markup: { remove_keyboard: true } });
  await sendMessage(
    chatId,
    "📝 <b>Новая заявка</b> · шаг 4 из 4\n\nРасскажите пару слов о бизнесе и задаче. Например: «Небольшой салон, нужна онлайн-запись».",
    { reply_markup: inline([[btn("Пропустить →", "w:skip")], [CANCEL]]) },
  );
}

function summary(draft: Draft) {
  return [
    "📝 <b>Проверьте заявку</b>",
    "",
    `${SERVICE_EMOJI[draft.service ?? "other"]} ${SERVICE_LABELS[draft.service ?? "other"]}`,
    `👤 ${esc(draft.name ?? "")}`,
    `📞 ${contactHtml(draft.contact ?? "")}`,
    ...(draft.message ? ["", `<blockquote>${esc(draft.message)}</blockquote>`] : []),
    "",
    "Всё верно?",
  ].join("\n");
}

const CONFIRM_KEYBOARD = inline([[btn("✅ Отправить заявку", "w:send")], [btn("✏️ Заново", "w:restart"), CANCEL]]);

async function showConfirm(chatId: number, draft: Draft, message?: TgMessage) {
  if (message) await editMessage(chatId, message.message_id, summary(draft), { reply_markup: CONFIRM_KEYBOARD });
  else await sendMessage(chatId, summary(draft), { reply_markup: CONFIRM_KEYBOARD });
}

async function submitForm(chatId: number, user: TgUser, message: TgMessage | undefined, draft: Draft) {
  try {
    const lead = await createLead(
      { name: draft.name, contact: draft.contact, service: draft.service, message: draft.message, locale: "ru" },
      "bot",
      { kind: "client", name: draft.name || fullName(user), tgId: user.id },
      { tgId: user.id, username: user.username, name: fullName(user) },
    );
    await clearDraft(user.id);
    const html = [
      `🎉 <b>Заявка ${leadNumber(lead.id)} принята!</b>`,
      "",
      "Менеджер свяжется с вами в течение рабочего дня.",
      "Когда статус заявки изменится, я напишу сюда.",
    ].join("\n");
    const reply_markup = inline([[btn("📋 Мои заявки", "m:my"), btn("🏠 Меню", "m:home")]]);
    if (message) await editMessage(chatId, message.message_id, html, { reply_markup });
    else await sendMessage(chatId, html, { reply_markup });
  } catch (error) {
    if (error instanceof LeadValidationError) {
      await sendMessage(chatId, `⚠️ ${esc(error.message)}. Давайте заполним заявку заново.`);
      await startForm(chatId, user);
      return;
    }
    throw error;
  }
}

async function cancelForm(chatId: number, user: TgUser, message?: TgMessage) {
  await clearDraft(user.id);
  const html = "Заявка отменена. Если передумаете — она всегда в меню.";
  if (message) await editMessage(chatId, message.message_id, html, { reply_markup: inline([[btn("🏠 Меню", "m:home")]]) });
  else {
    await sendMessage(chatId, html, { reply_markup: { remove_keyboard: true } });
    await sendHome(chatId, user);
  }
}

/** Text the user typed while filling the form. True when it was consumed. */
async function formInput(msg: TgMessage, user: TgUser): Promise<boolean> {
  const draft = await getDraft(user.id);
  if (!draft) return false;
  const chatId = msg.chat.id;
  const text = msg.text?.trim() ?? "";

  if (text === CANCEL_TEXT) {
    await cancelForm(chatId, user);
    return true;
  }

  switch (draft.step) {
    case "service":
      await sendMessage(chatId, "Выберите вариант кнопкой выше 👆");
      return true;

    case "name": {
      if (text.length < 2 || text.startsWith("/")) {
        await sendMessage(chatId, "Напишите, пожалуйста, имя — хотя бы пару букв.");
        return true;
      }
      draft.name = text.slice(0, LIMITS.name);
      draft.step = "contact";
      await saveDraft(user.id, draft);
      await askContact(chatId, user);
      return true;
    }

    case "contact": {
      let contact: string | null = null;
      if (msg.contact) contact = msg.contact.phone_number.startsWith("+") ? msg.contact.phone_number : `+${msg.contact.phone_number}`;
      else if (user.username && text === `✈️ Пишите в Telegram: @${user.username}`) contact = `@${user.username}`;
      else if (text) contact = normalizeContact(text);
      if (!contact) {
        await sendMessage(chatId, "Не получилось распознать контакт. Отправьте телефон (+7 900 000-00-00), @username или e-mail — или нажмите кнопку внизу.");
        return true;
      }
      draft.contact = contact;
      draft.step = "message";
      await saveDraft(user.id, draft);
      await askMessage(chatId, contact);
      return true;
    }

    case "message": {
      if (!text) {
        await sendMessage(chatId, "Напишите текстом или нажмите «Пропустить».");
        return true;
      }
      draft.message = text.slice(0, LIMITS.message);
      draft.step = "confirm";
      await saveDraft(user.id, draft);
      await showConfirm(chatId, draft);
      return true;
    }

    case "confirm":
      await sendMessage(chatId, "Нажмите «Отправить заявку» выше 👆 или «Заново», чтобы изменить данные.");
      return true;
  }
}

// --- Private chat --------------------------------------------------------------------------

async function handleStart(msg: TgMessage, user: TgUser, payload: string) {
  const chatId = msg.chat.id;

  if (payload === "new") {
    await startForm(chatId, user);
    return;
  }

  if (payload.startsWith("lead_")) {
    const lead = await findLeadByToken(payload.slice(5));
    if (lead) {
      await linkClient(lead, { tgId: user.id, username: user.username, name: fullName(user) });
      await sendMessage(
        chatId,
        [
          `🔔 <b>Вы подписались на заявку ${leadNumber(lead.id)}</b>`,
          "",
          `Статус: ${STATUS_EMOJI[lead.status]} ${STATUS_LABELS[lead.status]}`,
          "",
          "Как только менеджер возьмёт её в работу, я напишу сюда.",
        ].join("\n"),
        { reply_markup: inline([[btn("📋 Мои заявки", "m:my"), btn("🏠 Меню", "m:home")]]) },
      );
      return;
    }
  }

  await clearDraft(user.id);
  await sendHome(chatId, user);
}

async function handlePrivate(msg: TgMessage, user: TgUser) {
  const chatId = msg.chat.id;
  await kvSadd("icg:tg:users", String(user.id)).catch(() => {});

  const command = msg.text ? parseCommand(msg.text, await botUsername()) : null;
  if (command) {
    switch (command.name) {
      case "start":
        return handleStart(msg, user, command.args);
      case "new":
        return startForm(chatId, user);
      case "my":
        return showScreen(chatId, await myScreen(user));
      case "cancel":
        return cancelForm(chatId, user);
      case "help":
        return showScreen(chatId, {
          html: "<b>Что я умею</b>\n\n/new — оставить заявку\n/my — мои заявки\n/start — главное меню\n/cancel — отменить заполнение",
          keyboard: [[btn("🏠 Меню", "m:home")]],
        });
    }
  }

  if (await formInput(msg, user)) return;

  await sendMessage(chatId, "Я лучше понимаю кнопки 🙂 Вот меню:");
  await sendHome(chatId, user);
}

// --- Managers' group --------------------------------------------------------------------------

async function groupStats() {
  const leads = await listLeads(1000);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const count = (status: string) => leads.filter((lead) => lead.status === status).length;
  return [
    "<b>📊 Заявки</b>",
    "",
    `🔵 Новые: <b>${count("new")}</b>`,
    `🟡 В работе: <b>${count("work")}</b>`,
    `🟢 Готово: <b>${count("done")}</b>`,
    `⚪️ Отклонены: <b>${count("rejected")}</b>`,
    "",
    `За 7 дней: <b>${leads.filter((lead) => lead.createdAt >= weekAgo).length}</b> · всего: <b>${leads.length}</b>`,
    `С сайта: ${leads.filter((lead) => lead.source === "site").length} · из бота: ${leads.filter((lead) => lead.source === "bot").length}`,
  ].join("\n");
}

async function handleGroup(msg: TgMessage, user: TgUser) {
  const chatId = msg.chat.id;

  // A group upgraded to a supergroup gets a new id.
  if (msg.migrate_to_chat_id) {
    const group = await getGroup();
    if (group?.chatId === chatId) await setGroup({ ...group, chatId: msg.migrate_to_chat_id });
    return;
  }

  const username = await botUsername();
  const command = msg.text ? parseCommand(msg.text, username) : null;
  if (!command) return;

  if (command.name === "bind") {
    if (!command.args) {
      await sendMessage(chatId, "Отправьте команду вместе с кодом из админки сайта: <code>/bind 123456</code>");
      return;
    }
    if (!(await consumeBindCode(command.args))) {
      await sendMessage(chatId, "❌ Код неверный или устарел. Получите новый в админке сайта → Заявки.");
      return;
    }
    await setGroup({ chatId, title: msg.chat.title, boundAt: Date.now(), by: fullName(user) });
    await sendMessage(chatId, "✅ <b>Группа подключена</b>\n\nНовые заявки с сайта и из бота будут приходить сюда.\n\n/leads — открытые заявки\n/stats — статистика");
    return;
  }

  if (!(await isManagersChat(chatId))) {
    if (["leads", "stats", "lead"].includes(command.name)) await sendMessage(chatId, "Эта группа не подключена к заявкам ICG.");
    return;
  }

  if (command.name === "stats") {
    await sendMessage(chatId, await groupStats());
    return;
  }

  if (command.name === "leads") {
    const open = (await listLeads(300)).filter((lead) => lead.status === "new" || lead.status === "work");
    if (open.length === 0) {
      await sendMessage(chatId, "🎉 Открытых заявок нет.");
      return;
    }
    await sendMessage(
      chatId,
      [`<b>Открытые заявки · ${open.length}</b>`, "", ...open.slice(0, 25).map((lead) => leadLine(lead, true)), "", "Карточка заявки: /lead <i>номер</i>"].join("\n\n").replace(/\n{3,}/g, "\n\n"),
    );
    return;
  }

  if (command.name === "lead") {
    const lead = await getLead(Number(command.args.replace(/\D/g, "")));
    if (!lead) {
      await sendMessage(chatId, "Заявка не найдена. Пример: <code>/lead 42</code>");
      return;
    }
    // Re-post the card at the bottom of the chat.
    lead.card = undefined;
    await syncManagerCard(lead);
  }
}

async function welcomeGroup(chatId: number) {
  const username = await botUsername();
  if (await isManagersChat(chatId)) {
    await sendMessage(chatId, "👋 Снова здесь. Заявки будут приходить в эту группу.");
    return;
  }
  await sendMessage(
    chatId,
    [
      "👋 <b>Привет! Я бот заявок ICG.</b>",
      "",
      "Чтобы новые заявки приходили в эту группу:",
      "1. Откройте админку сайта → «Заявки»",
      "2. Нажмите «Подключить группу»",
      `3. Отправьте сюда команду с кодом: <code>/bind@${esc(username ?? "bot")} 123456</code>`,
    ].join("\n"),
  );
}

// --- Buttons -------------------------------------------------------------------------------

async function handleCallback(query: TgCallbackQuery) {
  const data = query.data ?? "";
  const user = query.from;
  const message = query.message;
  const chatId = message?.chat.id ?? user.id;

  // Managers: status buttons on a lead card.
  if (data.startsWith("ls:")) {
    const [, idRaw, status] = data.split(":");
    if (!message || !(await isManagersChat(message.chat.id))) {
      await answerCallback(query.id, "Нет доступа", true);
      return;
    }
    if (!isLeadStatus(status)) return answerCallback(query.id);
    try {
      const actor = { kind: "manager" as const, name: fullName(user), tgId: user.id, username: user.username };
      // Whoever takes leads in the group joins the team list (the site can then assign to them too).
      const saved = status === "work" ? await upsertManager({ name: actor.name, username: user.username, tgId: user.id }).catch(() => null) : null;
      const lead = await changeStatus(Number(idRaw), status, actor, saved ? toLeadManager(saved) : undefined);
      const hint = status === "work" && !user.username ? " · Добавьте себе @username в Telegram, чтобы клиент мог вам написать" : "";
      await answerCallback(query.id, `${leadNumber(lead.id)}: ${STATUS_LABELS[status]}${hint}`, Boolean(hint));
    } catch (error) {
      if (error instanceof LeadNotFoundError) return answerCallback(query.id, "Заявка не найдена", true);
      throw error;
    }
    return;
  }

  if (message?.chat.type !== "private") return answerCallback(query.id);

  // Menu screens.
  if (data.startsWith("m:")) {
    const name = data.slice(2);
    if (name === "new") {
      await answerCallback(query.id);
      return startForm(chatId, user, message);
    }
    const screen = await renderScreen(name, user);
    await answerCallback(query.id);
    if (!screen) return;
    // Old messages (a finished form, a status notice) open the menu as a new message.
    if (name === "home" && message && !message.photo) return sendHome(chatId, user);
    return showScreen(chatId, screen, message);
  }

  // A project card in "Работы".
  if (data.startsWith("p:")) {
    const project = PROJECTS.find((item) => item.id === data.slice(2));
    await answerCallback(query.id);
    if (project) return showScreen(chatId, projectScreen(project), message);
    return;
  }

  // Request form.
  if (data.startsWith("w:")) {
    const draft = await getDraft(user.id);
    const action = data.slice(2);

    if (action === "cancel") {
      await answerCallback(query.id, "Отменено");
      return cancelForm(chatId, user, message);
    }
    if (action === "restart") {
      await answerCallback(query.id);
      return startForm(chatId, user, message);
    }
    if (!draft) {
      await answerCallback(query.id, "Заявка устарела — начнём заново");
      return startForm(chatId, user);
    }

    if (action.startsWith("svc:") && draft.step === "service") {
      const service = action.slice(4);
      if (!isLeadService(service)) return answerCallback(query.id);
      draft.service = service;
      draft.step = "name";
      await saveDraft(user.id, draft);
      await answerCallback(query.id);
      return askName(chatId, user, draft, message);
    }

    if (action === "name" && draft.step === "name") {
      draft.name = fullName(user).slice(0, LIMITS.name);
      draft.step = "contact";
      await saveDraft(user.id, draft);
      await answerCallback(query.id);
      if (message) await editMessage(chatId, message.message_id, `📝 <b>Новая заявка</b> · шаг 2 из 4\n\n👤 ${esc(draft.name)}`);
      return askContact(chatId, user);
    }

    if (action === "skip" && draft.step === "message") {
      draft.message = "";
      draft.step = "confirm";
      await saveDraft(user.id, draft);
      await answerCallback(query.id);
      return showConfirm(chatId, draft, message);
    }

    if (action === "send" && draft.step === "confirm") {
      await answerCallback(query.id, "Отправляем…");
      return submitForm(chatId, user, message, draft);
    }

    return answerCallback(query.id, "Эта кнопка уже не активна");
  }

  await answerCallback(query.id);
}

// --- Entry point ------------------------------------------------------------------------------

export async function handleUpdate(update: TgUpdate) {
  // Telegram retries an update if we were slow; handle each one once.
  if (!(await kvSetNx(`icg:tg:update:${update.update_id}`, "1", 3600))) return;

  if (update.callback_query) return handleCallback(update.callback_query);

  if (update.my_chat_member) {
    const { chat, new_chat_member } = update.my_chat_member;
    if (chat.type !== "private" && ["member", "administrator"].includes(new_chat_member.status)) await welcomeGroup(chat.id);
    return;
  }

  const msg = update.message;
  if (!msg?.from || msg.from.is_bot) return;
  if (msg.chat.type === "private") return handlePrivate(msg, msg.from);
  if (msg.chat.type === "group" || msg.chat.type === "supergroup") return handleGroup(msg, msg.from);
}
