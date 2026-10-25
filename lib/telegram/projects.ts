/** ICG's real projects, shown in the bot ("💼 Работы"). Image = the site's own link preview. */
export type Project = {
  id: string;
  emoji: string;
  name: string;
  kind: string;
  /** One line for the list. */
  short: string;
  text: string;
  highlights: string[];
  url: string;
  image: string;
};

export const PROJECTS: Project[] = [
  {
    id: "taro",
    emoji: "🔮",
    name: "Мира Орлова",
    kind: "Таро-консультации онлайн · личный сайт эксперта",
    short: "сайт таролога",
    text: "Атмосферный тёмный сайт с живой анимацией карт и спокойной подачей — без «мистического тумана». Посетитель сразу понимает, с чем приходят, как проходит встреча и сколько она стоит.",
    highlights: ["Интерактив «Вытяните одну карту»", "Три формата консультаций и цены", "Как проходит встреча и частые вопросы", "Запись в пару касаний"],
    url: "https://taralog.vercel.app",
    image: "https://taralog.vercel.app/og.png",
  },
  {
    id: "ugrin",
    emoji: "🧠",
    name: "Иван Угрин",
    kind: "Интегральный психолог · Москва и онлайн",
    short: "сайт психолога",
    text: "Тёплый и глубокий сайт психолога с авторским методом «Преображение». Сначала — запросы клиента и принципы работы, затем метод по шагам, форматы и цены.",
    highlights: ["Шесть направлений запросов с подробностями", "Авторская методика по этапам", "Очно у м. Таганская и онлайн, пакеты сессий", "Отзывы, подкаст и 10+ лет практики"],
    url: "https://misterharryx.github.io/ivan-ugrin/",
    image: "https://misterharryx.github.io/ivan-ugrin/og-ivan.jpg",
  },
  {
    id: "territory",
    emoji: "💅",
    name: "Ваша территория",
    kind: "Студия красоты · Железнодорожный",
    short: "студия красоты",
    text: "Светлый сайт студии: маникюр, педикюр, лазер, LPG, брови и ресницы. Рейтинг 5,0 и «Хорошее место 2026» на Яндекс Картах — прямо на первом экране, чтобы доверие появлялось сразу.",
    highlights: ["Услуги и подробный прайс", "Мастера и галерея работ", "Онлайн-запись и карта", "Студия сама меняет цены и фото в админке"],
    url: "https://vasha-territoriya.vercel.app",
    image: "https://vasha-territoriya.vercel.app/og.png?v=4",
  },
  {
    id: "writelite",
    emoji: "✍️",
    name: "WriteLite",
    kind: "Корректор текста для Windows · сайт продукта",
    short: "сайт приложения",
    text: "Продуктовый сайт приложения-корректора. Главная фишка — живая демо-проверка прямо на странице: можно исправить ошибки так же, как в самом приложении.",
    highlights: ["Интерактивный пример проверки", "Анимированный ролик «одна фраза — три ошибки»", "Акцент на приватности и локальной работе", "Русская и английская версии, скачивание для Windows"],
    url: "https://writelite-web.vercel.app/ru",
    image: "https://writelite-web.vercel.app/ru/opengraph-image",
  },
];

export function projectHost(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
