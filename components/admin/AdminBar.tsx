"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearMediaDrafts, setMediaDraft } from "@/components/content/MediaImage";
import { DEFAULT_CONTACTS, buildContacts } from "@/lib/constants/contacts";
import { DEFAULT_FONTS, fontVariables, type FontId } from "@/lib/content/fonts";
import { MEDIA_SLOTS, type MediaId } from "@/lib/content/media";
import type { ContentOverrides } from "@/lib/content/types";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { ContactsPanel, FontPanel, MediaPanel, TextsPanel } from "./AdminPanels";
import { mediaAt, normalize, replaceHref, replaceOnPage, sectionLabel, textNodeAt, textRect, type TextRef } from "./dom";
import { shrinkImage } from "./shrinkImage";
import { TextPopover, type TextTarget } from "./TextPopover";

type Content = { base: Record<string, string>; overrides: ContentOverrides };

type Drafts = {
  /** path → new text, or null = back to the code's text */
  texts: Record<string, string | null>;
  media: Partial<Record<MediaId, string | null>>;
  fonts: { sans?: FontId | null; heading?: FontId | null };
  /** Telegram username / phone; null = back to the default from the code. */
  settings: { telegram?: string | null; phone?: string | null; reviews?: string | null };
};

const NO_DRAFTS: Drafts = { texts: {}, media: {}, fonts: {}, settings: {} };

type Hover =
  | { kind: "text"; refs: TextRef[]; rect: DOMRect; shown: string; attribute?: { element: Element; name: string } }
  | { kind: "media"; id: MediaId; rect: DOMRect }
  | { kind: "contacts"; rect: DOMRect };

type PanelId = "texts" | "media" | "fonts" | "contacts" | null;

/**
 * Floating admin toolbar on the live site: switch on edit mode, click any text
 * or photo to change it, pick fonts, then publish everything at once.
 */
export function AdminBar({ locale, onHide, onLogout }: { locale: Locale; onHide: () => void; onLogout: () => void }) {
  const [content, setContent] = useState<Content | null>(null);
  const [drafts, setDrafts] = useState<Drafts>(NO_DRAFTS);
  // "Редактировать сайт" on the dashboard links here with ?edit: start in edit mode.
  // (This component only ever mounts in the browser.)
  const [editing, setEditing] = useState(() => new URLSearchParams(window.location.search).has("edit"));
  const [panel, setPanel] = useState<PanelId>(null);
  const [mediaFocus, setMediaFocus] = useState<MediaId | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [popover, setPopover] = useState<TextTarget | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const router = useRouter();

  // --- Load what is published ------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/content?locale=${locale}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data: Content) => !cancelled && setContent(data))
      .catch(() => !cancelled && setToast({ text: "Не удалось загрузить тексты. Обновите страницу.", tone: "error" }));
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const base = useMemo(() => content?.base ?? {}, [content]);
  const published = content?.overrides.texts[locale];

  /** path → text the page shows right now (code + published + drafts). */
  const values = useMemo(() => {
    const result: Record<string, string> = {};
    for (const [path, text] of Object.entries(base)) {
      const draft = drafts.texts[path];
      result[path] = path in drafts.texts ? (draft ?? text) : (published?.[path] ?? text);
    }
    return result;
  }, [base, published, drafts.texts]);

  /**
   * Normalized text → where it comes from, to recognise text under the cursor.
   * Multi-line messages are also indexed line by line (mockup headlines render
   * each line in its own element).
   */
  const index = useMemo(() => {
    const map = new Map<string, TextRef[]>();
    const add = (text: string, ref: TextRef) => {
      const key = normalize(text);
      if (key.length >= 2) map.set(key, [...(map.get(key) ?? []), ref]);
    };
    for (const [path, text] of Object.entries(values)) {
      add(text, { path });
      if (text.includes("\n")) text.split("\n").forEach((line, i) => add(line, { path, line: i }));
    }
    return map;
  }, [values]);

  const changedTexts = useMemo(() => new Set(Object.keys(values).filter((path) => values[path] !== base[path])), [values, base]);

  const publishedMedia = content?.overrides.media;
  const changedMedia = useMemo(() => {
    const set = new Set<MediaId>();
    for (const id of Object.keys(MEDIA_SLOTS) as MediaId[]) {
      const value = id in drafts.media ? drafts.media[id] : publishedMedia?.[id];
      if (value) set.add(id);
    }
    return set;
  }, [drafts.media, publishedMedia]);

  const sans = drafts.fonts.sans ?? content?.overrides.fonts.sans ?? DEFAULT_FONTS.sans;
  // Headings follow the body font unless picked separately.
  const fonts = { sans, heading: drafts.fonts.heading ?? content?.overrides.fonts.heading ?? sans };

  const publishedSettings = content?.overrides.settings;
  const contacts = buildContacts({
    telegram: drafts.settings.telegram === undefined ? publishedSettings?.telegram : (drafts.settings.telegram ?? undefined),
    phone: drafts.settings.phone === undefined ? publishedSettings?.phone : (drafts.settings.phone ?? undefined),
    reviews: drafts.settings.reviews === undefined ? publishedSettings?.reviews : (drafts.settings.reviews ?? undefined),
  });

  const draftCount =
    Object.keys(drafts.texts).length + Object.keys(drafts.media).length + Object.keys(drafts.fonts).length + Object.keys(drafts.settings).length;

  // --- Live font preview ---------------------------------------------------------------------

  useEffect(() => {
    if (!content) return;
    const style = document.documentElement.style;
    const vars = fontVariables(fonts);
    for (const name of ["--font-sans", "--font-heading"]) {
      if (vars[name]) style.setProperty(name, vars[name]);
      else style.removeProperty(name);
    }
  }, [content, fonts.sans, fonts.heading]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Draft helpers -----------------------------------------------------------------------

  const applyText = useCallback(
    (refs: TextRef[], value: string) => {
      setDrafts((current) => {
        const texts = { ...current.texts };
        for (const { path, line } of refs) {
          let next = value;
          if (line !== undefined) {
            const lines = values[path].split("\n");
            lines[line] = value;
            next = lines.join("\n");
          }
          if (next === (published?.[path] ?? base[path])) delete texts[path]; // same as what is live
          else texts[path] = next === base[path] ? null : next;
        }
        return { ...current, texts };
      });
    },
    [base, published, values],
  );

  /** Edits from the "all texts" list also update every place the text appears. */
  function applyFromList(path: string, value: string) {
    const before = values[path].split("\n");
    const after = value.split("\n");
    if (before.length === after.length && before.length > 1) before.forEach((line, i) => replaceOnPage(line, after[i]));
    else replaceOnPage(values[path], value);
    applyText([{ path }], value);
  }

  function applyContacts(telegram: string, phone: string, reviews: string) {
    const next = buildContacts({ telegram, phone, reviews });
    // Live preview everywhere the contacts appear.
    replaceOnPage(`@${contacts.telegramUsername}`, `@${next.telegramUsername}`);
    replaceHref(contacts.telegramUrl, next.telegramUrl);
    replaceOnPage(contacts.phone, next.phone);
    replaceHref(contacts.phoneHref, next.phoneHref);
    // An existing "Отзывы" button follows the new link; adding or removing it shows after publishing.
    if (contacts.reviewsUrl && next.reviewsUrl) replaceHref(contacts.reviewsUrl, next.reviewsUrl);

    setDrafts((current) => {
      const settings = { ...current.settings };
      const entries = [
        ["telegram", next.telegramUsername, DEFAULT_CONTACTS.telegramUsername],
        ["phone", next.phone, DEFAULT_CONTACTS.phone],
      ] as const;
      for (const [key, value, fallback] of entries) {
        const live = publishedSettings?.[key] ?? fallback;
        if (value === live) delete settings[key];
        else settings[key] = value === fallback ? null : value;
      }
      // Reviews link: no default; empty removes the button.
      const reviewsLive = publishedSettings?.reviews ?? "";
      if (reviews === reviewsLive) delete settings.reviews;
      else settings.reviews = reviews || null;
      return { ...current, settings };
    });
  }

  async function uploadMedia(id: MediaId, file: File) {
    const form = new FormData();
    form.append("file", await shrinkImage(file));
    const response = await fetch("/api/admin/upload", { method: "POST", body: form });
    if (!response.ok) {
      const { error } = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(
        error === "size" ? "Файл слишком большой." : error === "type" ? "Нужен JPG, PNG, WebP или AVIF." : error === "storage" ? "Хранилище фото не подключено." : "Не удалось загрузить файл.",
      );
    }
    const { url } = (await response.json()) as { url: string };
    setMediaDraft(id, url);
    setDrafts((current) => ({ ...current, media: { ...current.media, [id]: url } }));
  }

  function resetMedia(id: MediaId) {
    const isPublished = Boolean(publishedMedia?.[id]);
    setMediaDraft(id, null);
    setDrafts((current) => {
      const media = { ...current.media };
      if (isPublished) media[id] = null;
      else delete media[id];
      return { ...current, media };
    });
  }

  function changeFont(role: "sans" | "heading", font: FontId) {
    setDrafts((current) => {
      const next = { ...current.fonts };
      if (font === content?.overrides.fonts[role]) delete next[role];
      else next[role] = font;
      return { ...current, fonts: next };
    });
  }

  // --- Publish / discard ------------------------------------------------------------------

  const publish = useCallback(async () => {
    if (!draftCount || publishing) return;
    setPublishing(true);
    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, ...drafts }),
      });
      if (!response.ok) {
        const { error } = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          error === "telegram"
            ? "Проверьте Telegram: 4–32 латинских буквы, цифры или _."
            : error === "reviews"
              ? "Ссылка на отзывы должна вести на Яндекс Карты (https://yandex.ru/maps/…)."
              : error === "phone"
              ? "Проверьте номер телефона."
              : error === "storage"
                ? "Хранилище не подключено: правки нельзя сохранить."
                : "",
        );
      }
      const { overrides } = (await response.json()) as { overrides: ContentOverrides };
      setContent((current) => (current ? { ...current, overrides } : current));
      setDrafts(NO_DRAFTS);
      setToast({ text: "Опубликовано. Посетители уже видят изменения.", tone: "ok" });
      // Re-render the page from the server so every component shows the published version.
      router.refresh();
    } catch (reason) {
      const message = reason instanceof Error && reason.message ? reason.message : "Не получилось опубликовать. Попробуйте ещё раз.";
      setToast({ text: message, tone: "error" });
    } finally {
      setPublishing(false);
    }
  }, [draftCount, drafts, locale, publishing, router]);

  function discard() {
    if (!window.confirm("Отменить все неопубликованные правки?")) return;
    clearMediaDrafts();
    window.location.reload();
  }

  async function logout() {
    if (draftCount && !window.confirm("Есть неопубликованные правки. Всё равно выйти?")) return;
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    onLogout();
    window.location.reload();
  }

  // Warn before leaving with unpublished work; Ctrl/⌘+S publishes.
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (draftCount) event.preventDefault();
    }
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void publish();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("keydown", onKey);
    };
  }, [draftCount, publish]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // --- Edit mode: hover + click anything editable --------------------------------------------

  useEffect(() => {
    if (!editing || popover) return;
    const root = document.documentElement;
    root.dataset.adminEditing = "";

    let frame = 0;
    let lastX = -1;
    let lastY = -1;

    function hitTest(x: number, y: number): Hover | null {
      const node = textNodeAt(x, y);
      const shownText = normalize(node?.nodeValue ?? "");
      if (node && (shownText === `@${contacts.telegramUsername}` || shownText === contacts.phone)) return { kind: "contacts", rect: textRect(node) };
      const refs = node && index.get(shownText);
      if (node && refs) return { kind: "text", refs, rect: textRect(node), shown: normalize(node.nodeValue ?? "") };

      // Placeholders of form fields.
      const field = document.elementFromPoint(x, y);
      if ((field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) && !field.closest("[data-admin-ui]")) {
        const placeholder = field.getAttribute("placeholder") ?? "";
        const placeholderRefs = index.get(normalize(placeholder));
        if (placeholderRefs) {
          return { kind: "text", refs: placeholderRefs, rect: field.getBoundingClientRect(), shown: placeholder, attribute: { element: field, name: "placeholder" } };
        }
      }

      const media = mediaAt(x, y);
      if (media) return { kind: "media", id: media.dataset.mediaId as MediaId, rect: media.getBoundingClientRect() };
      return null;
    }

    function update() {
      frame = 0;
      const next = hitTest(lastX, lastY);
      setHover(next);
      root.toggleAttribute("data-admin-hover", Boolean(next));
    }

    function onMove(event: PointerEvent) {
      lastX = event.clientX;
      lastY = event.clientY;
      if (!frame) frame = requestAnimationFrame(update);
    }

    function onScroll() {
      if (lastX >= 0 && !frame) frame = requestAnimationFrame(update);
    }

    function onClick(event: MouseEvent) {
      if ((event.target as Element).closest?.("[data-admin-ui]")) return;
      const hit = hitTest(event.clientX, event.clientY);
      if (!hit) return;
      // Editing wins over the page's own behaviour (links, accordions…).
      event.preventDefault();
      event.stopPropagation();
      if (hit.kind === "text") {
        const ref = hit.refs[0];
        const code = base[ref.path] ?? hit.shown;
        const original = ref.line !== undefined ? (code.split("\n")[ref.line] ?? hit.shown) : code;
        setPopover({ refs: hit.refs, value: hit.shown, original, rect: hit.rect, attribute: hit.attribute });
      } else if (hit.kind === "contacts") {
        setPanel("contacts");
      } else {
        setMediaFocus(hit.id);
        setPanel("media");
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.querySelector("[data-admin-ui][role=dialog]")) setEditing(false);
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      setHover(null);
      delete root.dataset.adminEditing;
      root.removeAttribute("data-admin-hover");
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("keydown", onKey);
    };
  }, [editing, popover, index, base, contacts.telegramUsername, contacts.phone]);

  // --- Render ---------------------------------------------------------------------------------

  const ready = content !== null;

  return (
    <>
      {/* Hover outline */}
      {hover && editing && !popover && (
        <div
          data-admin-ui
          aria-hidden="true"
          className="pointer-events-none fixed z-[89] rounded-[4px] border border-blue bg-blue/[0.07] transition-[top,left,width,height] duration-75"
          style={{ top: hover.rect.top - 4, left: hover.rect.left - 6, width: hover.rect.width + 12, height: hover.rect.height + 8 }}
        >
          <span className="absolute -top-6 left-0 rounded-[4px] bg-blue px-1.5 py-0.5 text-[11px] whitespace-nowrap text-white">
            {hover.kind === "text"
              ? `${sectionLabel(hover.refs[0].path)}${hover.refs.some((ref) => changedTexts.has(ref.path)) ? " · изменено" : ""}`
              : hover.kind === "contacts"
                ? "Контакты"
                : `Фото · ${MEDIA_SLOTS[hover.id]}`}
          </span>
        </div>
      )}

      {/* Selected text stays outlined while its editor is open */}
      {popover && (
        <div
          data-admin-ui
          aria-hidden="true"
          className="pointer-events-none fixed z-[89] rounded-[4px] border border-blue"
          style={{ top: popover.rect.top - 4, left: popover.rect.left - 6, width: popover.rect.width + 12, height: popover.rect.height + 8 }}
        />
      )}

      {popover && <TextPopover target={popover} onApply={applyText} onClose={() => setPopover(null)} />}

      {panel === "fonts" && <FontPanel sans={fonts.sans} heading={fonts.heading} onChange={changeFont} onClose={() => setPanel(null)} />}
      {panel === "media" && (
        <MediaPanel
          focus={mediaFocus}
          changed={changedMedia}
          onUpload={uploadMedia}
          onReset={resetMedia}
          onClose={() => {
            setPanel(null);
            setMediaFocus(null);
          }}
        />
      )}
      {panel === "contacts" && (
        <ContactsPanel
          telegram={contacts.telegramUsername}
          phone={contacts.phone}
          reviews={contacts.reviewsUrl ?? ""}
          onApply={applyContacts}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "texts" && <TextsPanel values={values} original={base} changed={changedTexts} onApply={applyFromList} onClose={() => setPanel(null)} />}

      {editing && !hover && !popover && !panel && (
        <p data-admin-ui className="admin-pop-in pointer-events-none fixed bottom-[112px] left-1/2 z-[90] sm:bottom-[78px] w-max max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-[6px] bg-black/70 px-3 py-1.5 text-center text-[12px] text-fg-2 backdrop-blur">
          Наведите на текст или фото и нажмите, чтобы изменить · Esc — выйти
        </p>
      )}

      {toast && (
        <p
          data-admin-ui
          role="status"
          className={cn(
            "admin-pop-in fixed bottom-[112px] left-1/2 z-[93] sm:bottom-[78px] w-max max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-[6px] border px-3.5 py-2 text-[13px] backdrop-blur",
            toast.tone === "ok" ? "border-good/30 bg-[#0d1714]/95 text-good" : "border-weak/30 bg-[#1a0f0e]/95 text-weak",
          )}
        >
          {toast.text}
        </p>
      )}

      {/* The bar */}
      <div
        data-admin-ui
        role="toolbar"
        aria-label="Панель администратора"
        className="admin-bar-in fixed bottom-3 left-1/2 z-[91] flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-[10px] sm:bottom-4 sm:flex-nowrap sm:overflow-x-auto border border-line-strong bg-[#0d0d12]/95 p-1.5 shadow-[0_20px_50px_-18px_rgb(0_0_0/0.9)] backdrop-blur [scrollbar-width:none]"
      >
        <span className="hidden shrink-0 items-center gap-2 pr-2 pl-2.5 sm:flex">
          <span className="font-brand text-[10px] tracking-[0.25em] text-fg-2">ICG</span>
          <span className="rounded-[4px] border border-line-strong px-1.5 py-px text-[10px] text-fg-3">{locale.toUpperCase()}</span>
        </span>
        <Divider />

        <BarLink href="/admin" label="Статистика" icon={<path d="M3 15V9m4.5 6V5m4.5 10v-4m4.5 4V3" />}>
          Статистика
        </BarLink>
        <BarButton
          active={editing}
          disabled={!ready}
          onClick={() => {
            setEditing((value) => !value);
            setPanel(null);
          }}
          icon={<path d="m12.5 3.5 4 4L7 17H3v-4zM10.5 5.5l4 4" />}
        >
          {editing ? "Редактирую" : "Редактировать"}
        </BarButton>
        <BarButton active={panel === "texts"} disabled={!ready} onClick={() => setPanel(panel === "texts" ? null : "texts")} label="Тексты" icon={<path d="M4 5h12M4 10h12M4 15h7" />}>
          Тексты
        </BarButton>
        <BarButton
          active={panel === "media"}
          disabled={!ready}
          onClick={() => {
            setMediaFocus(null);
            setPanel(panel === "media" ? null : "media");
          }}
          label="Фото"
          icon={
            <>
              <rect x="3" y="4" width="14" height="12" rx="1.5" />
              <path d="m3.5 13.5 4-4 3 3 2-2 4 4" />
            </>
          }
        >
          Фото
        </BarButton>
        <BarButton active={panel === "fonts"} disabled={!ready} onClick={() => setPanel(panel === "fonts" ? null : "fonts")} label="Шрифты" icon={<path d="M4 16 9 4h1l5 12M6 11.5h7" />}>
          Шрифты
        </BarButton>
        <BarButton
          active={panel === "contacts"}
          disabled={!ready}
          onClick={() => setPanel(panel === "contacts" ? null : "contacts")}
          label="Контакты"
          icon={<path d="M5.5 3h2.5l1.2 3.2-1.6 1.2a9 9 0 0 0 5 5l1.2-1.6L17 12v2.5a1.5 1.5 0 0 1-1.5 1.5A12.5 12.5 0 0 1 4 4.5 1.5 1.5 0 0 1 5.5 3z" />}
        >
          Контакты
        </BarButton>

        <Divider />
        {draftCount > 0 ? (
          <>
            <span className="shrink-0 px-2 text-[12px] text-fg-2 tabular-nums">
              {draftCount} {plural(draftCount, ["правка", "правки", "правок"])}
            </span>
            <button type="button" onClick={discard} className="h-8 shrink-0 rounded-[6px] px-2.5 text-[13px] text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg">
              Отменить
            </button>
          </>
        ) : (
          <span className="hidden shrink-0 px-2 text-[12px] text-fg-3 lg:inline">Всё опубликовано</span>
        )}
        <button
          type="button"
          onClick={publish}
          disabled={!draftCount || publishing}
          title="Ctrl + S"
          className="h-8 shrink-0 rounded-[6px] bg-blue px-3.5 text-[13px] font-medium text-white transition-[background-color,transform,opacity] duration-[120ms] hover:bg-[#4a86ff] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35"
        >
          {publishing ? "Публикую…" : "Опубликовать"}
        </button>

        <Divider />
        <button type="button" onClick={logout} className="h-8 shrink-0 rounded-[6px] px-2.5 text-[13px] text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg">
          Выйти
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setPanel(null);
            onHide();
          }}
          aria-label="Скрыть панель (вернуть — ключом в подвале)"
          title="Скрыть панель"
          className="grid size-8 shrink-0 place-items-center rounded-[6px] text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M4 6.5 8 10.5l4-4" />
          </svg>
        </button>
      </div>
    </>
  );
}

function plural(n: number, [one, few, many]: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 hidden h-5 w-px shrink-0 bg-line-strong sm:block" />;
}

const itemClass = "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] transition-colors duration-150";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

/** With `label`, the text hides on narrow screens and the icon carries the name. */
function BarText({ label, children }: { label?: string; children: ReactNode }) {
  return label ? <span className="hidden lg:inline">{children}</span> : <>{children}</>;
}

function BarButton({
  active,
  disabled,
  onClick,
  icon,
  label,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
  label?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(itemClass, active ? "bg-blue/15 text-[#9dbcff]" : "text-fg-2 hover:bg-white/[0.06] hover:text-fg", "disabled:opacity-40")}
    >
      <Icon>{icon}</Icon>
      <BarText label={label}>{children}</BarText>
    </button>
  );
}

function BarLink({ href, icon, label, children }: { href: string; icon: ReactNode; label?: string; children: ReactNode }) {
  return (
    <a href={href} aria-label={label} title={label} className={cn(itemClass, "text-fg-2 hover:bg-white/[0.06] hover:text-fg")}>
      <Icon>{icon}</Icon>
      <BarText label={label}>{children}</BarText>
    </a>
  );
}
