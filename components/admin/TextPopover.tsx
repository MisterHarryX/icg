"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { captureText, previewText, restoreText, sectionLabel, setAttributeValue, type CapturedText, type TextRef } from "./dom";

export type TextTarget = {
  refs: TextRef[];
  /** Text as currently shown. */
  value: string;
  /** Text as written in the code. */
  original: string;
  rect: DOMRect;
  /** Set when the text is an attribute (e.g. an input placeholder) rather than a text node. */
  attribute?: { element: Element; name: string };
};

const WIDTH = 380;

/**
 * Inline editor anchored to the clicked text. Typing previews on the page at
 * once; "Применить" keeps it as a draft until the admin publishes.
 */
export function TextPopover({
  target,
  onApply,
  onClose,
}: {
  target: TextTarget;
  onApply: (refs: TextRef[], value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(target.value);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const [position, setPosition] = useState({ top: target.rect.bottom + 10, left: target.rect.left });
  const titleId = useId();

  // Nodes and their untouched text, captured once so Cancel can restore them.
  const nodes = useRef<CapturedText>([]);
  const attributeOriginal = useRef<string | null>(null);
  useEffect(() => {
    if (target.attribute) attributeOriginal.current = target.attribute.element.getAttribute(target.attribute.name);
    else nodes.current = captureText(target.value);
    const element = field.current;
    element?.focus();
    element?.setSelectionRange(element.value.length, element.value.length);
  }, [target.value, target.attribute]);

  // Place below the text, or above it when there is no room; keep inside the viewport.
  useLayoutEffect(() => {
    const height = box.current?.offsetHeight ?? 220;
    const below = target.rect.bottom + 10;
    const top = below + height > window.innerHeight - 120 ? Math.max(12, target.rect.top - height - 10) : below;
    const left = Math.min(Math.max(12, target.rect.left), window.innerWidth - Math.min(WIDTH, window.innerWidth - 24) - 12);
    setPosition({ top, left });
  }, [target.rect]);

  // Auto-grow the textarea.
  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    const border = element.offsetHeight - element.clientHeight;
    element.style.height = `${Math.min(element.scrollHeight + border, 260)}px`;
  }, [value]);

  function preview(next: string) {
    setValue(next);
    if (target.attribute) setAttributeValue(target.attribute.element, target.attribute.name, next || target.value);
    else previewText(nodes.current, next || target.value);
  }

  function cancel() {
    if (target.attribute) setAttributeValue(target.attribute.element, target.attribute.name, attributeOriginal.current);
    else restoreText(nodes.current);
    onClose();
  }

  function apply() {
    const next = value.trim() ? value : target.value;
    onApply(target.refs, next);
    onClose();
  }

  const changedFromCode = value !== target.original;

  return (
    <div
      ref={box}
      data-admin-ui
      role="dialog"
      aria-labelledby={titleId}
      className="admin-pop-in fixed z-[95] rounded-[10px] border border-line-strong bg-[#0f0f14]/97 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)] backdrop-blur"
      style={{ top: position.top, left: position.left, width: `min(${WIDTH}px, calc(100vw - 24px))` }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          cancel();
        }
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
        <p id={titleId} className="text-[12px] text-fg-3">
          {target.attribute ? "Подсказка в поле" : target.refs[0].line !== undefined ? `Строка ${target.refs[0].line + 1}` : "Текст"} ·{" "}
          <span className="text-fg-2">{sectionLabel(target.refs[0].path)}</span>
          {target.refs.length > 1 && <span> · в {target.refs.length} местах</span>}
        </p>
        <kbd className="text-[11px] text-fg-3">Enter: применить</kbd>
      </div>
      <div className="p-3.5">
        <textarea
          ref={field}
          value={value}
          rows={1}
          onChange={(event) => preview(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              apply();
            }
          }}
          aria-label="Новый текст"
          className="block w-full resize-none rounded-[5px] border border-line-strong bg-bg/70 px-3 py-2.5 text-[16px] leading-snug text-fg sm:text-[15px] focus:border-blue/70 focus:shadow-[0_0_0_3px_rgb(58_123_255/0.2)] focus:outline-none"
        />
        {changedFromCode && (
          <p className="mt-2.5 line-clamp-2 text-[12px] leading-snug text-fg-3">
            Исходный текст: <span className="text-fg-2">{target.original}</span>
          </p>
        )}
        <div className="mt-3.5 flex items-center gap-2">
          {changedFromCode && (
            <button
              type="button"
              onClick={() => preview(target.original)}
              className="h-8 rounded-[5px] px-2.5 text-[13px] text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
            >
              Вернуть исходный
            </button>
          )}
          <span className="flex-1" />
          <button type="button" onClick={cancel} className="h-8 rounded-[5px] px-3 text-[13px] text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg">
            Отмена
          </button>
          <button
            type="button"
            onClick={apply}
            className="h-8 rounded-[5px] bg-blue px-3.5 text-[13px] font-medium text-white transition-[background-color,transform] duration-[120ms] hover:bg-[#4a86ff] active:scale-[0.97]"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
