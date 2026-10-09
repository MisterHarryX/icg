import type { ContactSettings } from "@/lib/constants/contacts";
import type { Locale } from "@/lib/i18n/config";
import type { FontChoice } from "./fonts";
import type { MediaId } from "./media";

/** Everything the admin changed on top of the code. Stored in .data/content.json. */
export type ContentOverrides = {
  /** Message path (e.g. "hero.titleLead") → replacement text, per locale. */
  texts: Partial<Record<Locale, Record<string, string>>>;
  media: Partial<Record<MediaId, string>>;
  fonts: FontChoice;
  /** Telegram username, phone and the Yandex Maps reviews link. */
  settings: ContactSettings;
  updatedAt?: string;
};

export const EMPTY_OVERRIDES: ContentOverrides = { texts: {}, media: {}, fonts: {}, settings: {} };

/** Body of PUT /api/admin/content. `null` restores the original. */
export type ContentPatch = {
  locale: Locale;
  texts?: Record<string, string | null>;
  media?: Partial<Record<MediaId, string | null>>;
  fonts?: { sans?: string | null; heading?: string | null };
  settings?: { telegram?: string | null; phone?: string | null; reviews?: string | null };
};
