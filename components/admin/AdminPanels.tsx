"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isValidPhone, parseTelegramUsername } from "@/lib/constants/contacts";
import { FONT_OPTIONS, fontStack, type FontId } from "@/lib/content/fonts";
import { MEDIA_SLOTS, type MediaId } from "@/lib/content/media";
import { cn } from "@/lib/utils";
import { SECTION_LABELS, sectionLabel } from "./dom";

export function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      data-admin-ui
      role="dialog"
      aria-label={title}
      className="admin-pop-in fixed bottom-[110px] left-1/2 z-[92] flex max-h-[min(560px,calc(100dvh-130px))] sm:bottom-[76px] w-[min(440px,calc(100vw-24px))] -translate-x-1/2 flex-col rounded-[12px] border border-line-strong bg-[#0f0f14]/97 shadow-[0_30px_80px_-24px_rgb(0_0_0/0.85)] backdrop-blur"
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[14px] font-medium text-fg">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="-mr-1.5 grid size-7 place-items-center rounded-[5px] text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="m4 4 8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  );
}

// --- Fonts -------------------------------------------------------------------------------

export function FontPanel({
  sans,
  heading,
  onChange,
  onClose,
}: {
  sans: FontId;
  heading: FontId;
  onChange: (role: "sans" | "heading", font: FontId) => void;
  onClose: () => void;
}) {
  const groups = [
    { role: "sans" as const, title: "Основной текст", current: sans },
    { role: "heading" as const, title: "Заголовки", current: heading },
  ];
  return (
    <Panel title="Шрифты" onClose={onClose}>
      {groups.map((group) => (
        <div key={group.role} role="radiogroup" aria-labelledby={`font-${group.role}-title`} className="px-4 pt-4 pb-2">
          <p id={`font-${group.role}-title`} className="eyebrow mb-2.5">
            {group.title}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {FONT_OPTIONS.map((font) => {
              const active = font.id === group.current;
              return (
                <label
                  key={font.id}
                  className={cn(
                    "relative cursor-pointer rounded-[6px] border px-3 py-2.5 transition-colors duration-150",
                    active ? "border-blue/70 bg-blue/10" : "border-line hover:border-line-strong hover:bg-surface-2",
                  )}
                >
                  <input
                    type="radio"
                    name={`font-${group.role}`}
                    value={font.id}
                    checked={active}
                    onChange={() => onChange(group.role, font.id)}
                    className="sr-only"
                  />
                  <span className="block truncate text-[16px] leading-tight text-fg" style={{ fontFamily: fontStack(font.id) }}>
                    {group.role === "heading" ? "Аа Заголовок" : "Аа Текст"}
                  </span>
                  <span className="mt-1 block text-[11px] text-fg-3">
                    {font.label}
                    {font.id === "inter" && " · исходный"}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <p className="px-4 pb-4 text-[12px] leading-relaxed text-fg-3">Шрифт меняется сразу на странице. Посетители увидят его после публикации.</p>
    </Panel>
  );
}

// --- Photos -----------------------------------------------------------------------------

export function MediaPanel({
  focus,
  changed,
  onUpload,
  onReset,
  onClose,
}: {
  focus: MediaId | null;
  /** Slots that differ from the built-in photo (published or draft). */
  changed: Set<MediaId>;
  onUpload: (id: MediaId, file: File) => Promise<void>;
  onReset: (id: MediaId) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<MediaId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Partial<Record<MediaId, string>>>({});
  const list = useRef<HTMLUListElement>(null);

  // Thumbnails = whatever the page currently renders for each slot.
  useEffect(() => {
    const read = () => {
      const next: Partial<Record<MediaId, string>> = {};
      for (const id of Object.keys(MEDIA_SLOTS) as MediaId[]) {
        const image = document.querySelector<HTMLImageElement>(`img[data-media-id="${id}"]`);
        if (image) next[id] = image.currentSrc || image.src;
      }
      setThumbs(next);
    };
    read();
    const timer = window.setInterval(read, 800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (focus) list.current?.querySelector(`[data-slot="${focus}"]`)?.scrollIntoView({ block: "nearest" });
  }, [focus]);

  async function upload(id: MediaId, file: File | undefined) {
    if (!file) return;
    setBusy(id);
    setError(null);
    try {
      await onUpload(id, file);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить файл.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel title="Фото" onClose={onClose}>
      <ul ref={list} className="divide-y divide-line">
        {(Object.entries(MEDIA_SLOTS) as [MediaId, string][]).map(([id, label]) => (
          <li key={id} data-slot={id} className={cn("flex items-center gap-3 px-4 py-3 transition-colors", focus === id && "bg-blue/[0.07]")}>
            <span className="relative size-14 shrink-0 overflow-hidden rounded-[6px] border border-line bg-surface-2">
              {thumbs[id] && (
                // eslint-disable-next-line @next/next/no-img-element -- tiny admin-only preview of the live image
                <img src={thumbs[id]} alt="" className="size-full object-cover" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] text-fg">{label}</span>
              <span className="mt-0.5 block text-[12px] text-fg-3">{changed.has(id) ? "Заменено" : "Исходное фото"}</span>
            </span>
            {changed.has(id) && (
              <button type="button" onClick={() => onReset(id)} className="h-8 rounded-[5px] px-2 text-[12px] text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg">
                Вернуть
              </button>
            )}
            <label
              className={cn(
                "inline-flex h-8 cursor-pointer items-center rounded-[5px] border border-line-strong bg-surface-2 px-3 text-[13px] text-fg-2 transition-colors hover:border-white/20 hover:text-fg",
                busy === id && "pointer-events-none opacity-60",
              )}
            >
              {busy === id ? "Загрузка…" : "Заменить"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(event) => {
                  void upload(id, event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="px-4 pb-3 text-[13px] text-weak">
          {error}
        </p>
      )}
      <p className="border-t border-line px-4 py-3 text-[12px] leading-relaxed text-fg-3">JPG, PNG, WebP или AVIF до 12 МБ. Большие фото сжимаются автоматически.</p>
    </Panel>
  );
}

// --- All texts --------------------------------------------------------------------------

export function TextsPanel({
  values,
  original,
  changed,
  onApply,
  onClose,
}: {
  /** path → text currently shown */
  values: Record<string, string>;
  /** path → text in the code */
  original: Record<string, string>;
  changed: Set<string>;
  onApply: (path: string, value: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(values)
      .filter(([path, text]) => {
        if (section === "changed") return changed.has(path);
        if (section !== "all" && path.split(".")[0] !== section) return false;
        return !q || text.toLowerCase().includes(q) || path.toLowerCase().includes(q);
      })
      .slice(0, 120);
  }, [values, query, section, changed]);

  return (
    <Panel title="Все тексты" onClose={onClose}>
      <div className="sticky top-0 z-10 border-b border-line bg-[#0f0f14] px-4 py-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти текст…"
          aria-label="Поиск по текстам"
          className="h-9 w-full rounded-[5px] border border-line-strong bg-bg/70 px-3 text-[16px] text-fg sm:text-[14px] placeholder:text-fg-3 focus:border-blue/70 focus:outline-none"
        />
        <div className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {[["all", "Все"], ["changed", `Изменённые · ${changed.size}`], ...Object.entries(SECTION_LABELS)].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-pressed={section === id}
              className={cn(
                "h-7 shrink-0 rounded-[5px] px-2.5 text-[12px] transition-colors",
                section === id ? "bg-white/10 text-fg" : "text-fg-3 hover:bg-surface-2 hover:text-fg",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-line">
        {rows.map(([path, text]) => (
          <li key={path}>
            {open === path ? (
              <div className="bg-white/[0.02] px-4 py-3">
                <p className="text-[11px] text-fg-3">{sectionLabel(path)} · {path}</p>
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={Math.min(6, Math.max(2, Math.ceil(draft.length / 48)))}
                  className="mt-2 block w-full resize-y rounded-[5px] border border-line-strong bg-bg/70 px-3 py-2 text-[16px] leading-snug text-fg sm:text-[14px] focus:border-blue/70 focus:outline-none"
                />
                <div className="mt-2.5 flex items-center gap-2">
                  {draft !== original[path] && (
                    <button type="button" onClick={() => setDraft(original[path])} className="h-8 rounded-[5px] px-2 text-[12px] text-fg-3 hover:bg-surface-2 hover:text-fg">
                      Исходный
                    </button>
                  )}
                  <span className="flex-1" />
                  <button type="button" onClick={() => setOpen(null)} className="h-8 rounded-[5px] px-3 text-[13px] text-fg-2 hover:bg-surface-2 hover:text-fg">
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (draft.trim()) onApply(path, draft);
                      setOpen(null);
                    }}
                    className="h-8 rounded-[5px] bg-blue px-3 text-[13px] font-medium text-white hover:bg-[#4a86ff]"
                  >
                    Применить
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(path);
                  setDraft(text);
                }}
                className="group flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[13px] leading-snug text-fg-2 group-hover:text-fg">{text}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-fg-3">{sectionLabel(path)} · {path}</span>
                </span>
                {changed.has(path) && <span aria-label="изменено" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue" />}
              </button>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-fg-3">Ничего не найдено</li>}
      </ul>
    </Panel>
  );
}

// --- Contacts ---------------------------------------------------------------------------

export function ContactsPanel({
  telegram,
  phone,
  onApply,
  onClose,
}: {
  telegram: string;
  phone: string;
  onApply: (telegram: string, phone: string) => void;
  onClose: () => void;
}) {
  const [telegramValue, setTelegramValue] = useState(`@${telegram}`);
  const [phoneValue, setPhoneValue] = useState(phone);
  const telegramName = parseTelegramUsername(telegramValue);
  const phoneOk = isValidPhone(phoneValue);
  const field =
    "mt-2 h-10 w-full rounded-[5px] border bg-bg/70 px-3 text-[16px] text-fg sm:text-[14px] focus:border-blue/70 focus:outline-none";

  return (
    <Panel title="Контакты" onClose={onClose}>
      <form
        className="grid gap-4 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (telegramName && phoneOk) {
            onApply(telegramName, phoneValue.trim());
            onClose();
          }
        }}
      >
        <label className="block">
          <span className="eyebrow">Telegram</span>
          <input
            value={telegramValue}
            onChange={(event) => setTelegramValue(event.target.value)}
            placeholder="@username"
            autoComplete="off"
            spellCheck={false}
            className={cn(field, telegramName ? "border-line-strong" : "border-weak/60")}
          />
          <span className={cn("mt-1.5 block text-[12px]", telegramName ? "text-fg-3" : "text-weak")}>
            {telegramName ? `Ссылка: t.me/${telegramName}` : "Имя пользователя: 4–32 латинских буквы, цифры или _"}
          </span>
        </label>
        <label className="block">
          <span className="eyebrow">Телефон</span>
          <input
            value={phoneValue}
            onChange={(event) => setPhoneValue(event.target.value)}
            placeholder="+7 (900) 000-00-00"
            inputMode="tel"
            autoComplete="off"
            className={cn(field, phoneOk ? "border-line-strong" : "border-weak/60")}
          />
          {!phoneOk && <span className="mt-1.5 block text-[12px] text-weak">Проверьте номер</span>}
        </label>
        <p className="text-[12px] leading-relaxed text-fg-3">
          Меняется везде: в блоке «Контакты», в подвале и во всех кнопках «Написать в Telegram».
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-[5px] px-3 text-[13px] text-fg-2 hover:bg-surface-2 hover:text-fg">
            Отмена
          </button>
          <button
            type="submit"
            disabled={!telegramName || !phoneOk}
            className="h-9 rounded-[5px] bg-blue px-4 text-[13px] font-medium text-white transition-[background-color,transform] duration-[120ms] hover:bg-[#4a86ff] active:scale-[0.97] disabled:opacity-40"
          >
            Применить
          </button>
        </div>
      </form>
    </Panel>
  );
}
