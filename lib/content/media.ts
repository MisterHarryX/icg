/**
 * Image slots the admin can replace. Client-safe.
 * Uploaded files are served from /api/media/<file>.
 */
export const MEDIA_SLOTS = {
  beauty: "Салон AURA: главное фото",
  beautyPortrait: "Редизайн: портрет",
  salonStock: "Редизайн: фото «до»",
  barber: "Барбершоп FORMA",
  coffee: "Пекарня NOVA",
  contactLeft: "Контакты: фон слева",
  contactRight: "Контакты: фон справа",
} as const;

export type MediaId = keyof typeof MEDIA_SLOTS;

export function isMediaId(value: string): value is MediaId {
  return Object.hasOwn(MEDIA_SLOTS, value);
}

/** Local uploads (/api/media/…) or Vercel Blob (https://<store>.public.blob.vercel-storage.com/icg/media/…). */
export const MEDIA_URL_PATTERN =
  /^(\/api\/media\/|https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/icg\/media\/)[a-z0-9-]+\.(webp|jpg|png|avif)$/;
