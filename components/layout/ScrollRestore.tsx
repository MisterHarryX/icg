"use client";

import { useEffect } from "react";
import { SCROLL_RESTORE_KEY } from "./LocaleSwitcher";

/**
 * After a language switch, puts the visitor back at the same point of the
 * same section (section heights differ slightly between languages).
 */
export function ScrollRestore() {
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(SCROLL_RESTORE_KEY);
      sessionStorage.removeItem(SCROLL_RESTORE_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    try {
      const { id, progress } = JSON.parse(raw) as { id: string; progress: number };
      const section = document.getElementById(id);
      if (!section) return;
      const probe = window.innerHeight * 0.3;
      const top = section.getBoundingClientRect().top + window.scrollY + section.offsetHeight * progress - probe;
      window.scrollTo({ top, behavior: "instant" });
    } catch {
      /* ignore malformed state */
    }
  }, []);

  return null;
}
