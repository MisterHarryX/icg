import "server-only";
import type { Locale } from "./config";
import type { Messages } from "@/messages/ru";
import { getOverrides } from "@/lib/content/overrides";
import { applyTexts } from "@/lib/content/paths";

const loaders: Record<Locale, () => Promise<Messages>> = {
  ru: () => import("@/messages/ru").then((m) => m.default),
  en: () => import("@/messages/en").then((m) => m.default),
};

/** Copy as written in messages/*.ts, without admin edits. */
export function getBaseMessages(locale: Locale): Promise<Messages> {
  return loaders[locale]();
}

/** Copy as shown on the site: the code's messages plus texts edited in admin mode. */
export async function getMessages(locale: Locale): Promise<Messages> {
  const [base, overrides] = await Promise.all([getBaseMessages(locale), getOverrides()]);
  return applyTexts(base, overrides.texts[locale]);
}

export type { Messages };
