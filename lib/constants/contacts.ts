/**
 * Contact details. The constants are the defaults from the code; the admin can
 * change them on the site (admin mode → Контакты), see `buildContacts`.
 *
 * TODO: these are PLACEHOLDERS — replace with the real Telegram username and
 * phone number before launch (here or from admin mode).
 */
export const TELEGRAM_USERNAME = "icg_studio";
export const PHONE_NUMBER = "+7 (000) 000-00-00";

export type ContactSettings = { telegram?: string; phone?: string };

export type Contacts = {
  telegramUsername: string;
  telegramUrl: string;
  phone: string;
  phoneHref: string;
  /** Where "Start a project" CTAs lead. */
  requestUrl: string;
};

export function buildContacts(settings: ContactSettings = {}): Contacts {
  const telegramUsername = settings.telegram || TELEGRAM_USERNAME;
  const phone = settings.phone || PHONE_NUMBER;
  const telegramUrl = `https://t.me/${telegramUsername}`;
  return { telegramUsername, telegramUrl, phone, phoneHref: `tel:${phone.replace(/[^\d+]/g, "")}`, requestUrl: telegramUrl };
}

/** "@name", "t.me/name", "https://t.me/name" → "name"; null when not a valid username. */
export function parseTelegramUsername(value: string) {
  const name = value.trim().replace(/^(https?:\/\/)?(t\.me|telegram\.me)\//i, "").replace(/^@/, "").replace(/\/$/, "");
  return /^[A-Za-z0-9_]{4,32}$/.test(name) ? name : null;
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^\+?[\d\s()\-.]{5,24}$/.test(value.trim()) && digits.length >= 5 && digits.length <= 15;
}

/** Defaults, for code that has no access to admin settings. */
export const DEFAULT_CONTACTS = buildContacts();
