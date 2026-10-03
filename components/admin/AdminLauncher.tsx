"use client";

import { ADMIN_OPEN_EVENT } from "./events";

/**
 * The quiet "special button" in the footer's bottom bar: a small key glyph.
 * Opens the login dialog, or the admin bar when already signed in.
 */
export function AdminLauncher({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(ADMIN_OPEN_EVENT))}
      aria-label={label}
      title={label}
      className="group grid size-8 place-items-center rounded-[5px] border border-transparent text-fg-3/70 transition-[color,border-color,background-color] duration-200 hover:border-line-strong hover:bg-surface-2 hover:text-fg"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="7" cy="10" r="3.25" />
        <path d="M10.25 10h7M14.5 10v2.5M16.75 10v1.75" />
      </svg>
    </button>
  );
}
