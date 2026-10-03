"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { locales, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export const SCROLL_RESTORE_KEY = "icg:locale-scroll";

/** Section under a probe line at 30% of the viewport, and how far into it the probe is. */
function captureScrollAnchor() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("main section[id]"));
  const probe = window.innerHeight * 0.3;
  let current: HTMLElement | undefined;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= probe) current = section;
  }
  if (!current) return null;
  const rect = current.getBoundingClientRect();
  return { id: current.id, progress: Math.min(1, Math.max(0, (probe - rect.top) / rect.height)) };
}

export function LocaleSwitcher({
  locale,
  label,
  switchLabel,
  className,
  onNavigate,
}: {
  locale: Locale;
  label: string;
  switchLabel: string;
  className?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>, target: Locale) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const anchor = captureScrollAnchor();
    try {
      if (anchor) sessionStorage.setItem(SCROLL_RESTORE_KEY, JSON.stringify(anchor));
    } catch {
      /* storage unavailable — fall back to the section hash below */
    }
    onNavigate?.();
    router.push(`/${target}${anchor && anchor.id !== "home" ? `#${anchor.id}` : ""}`, { scroll: false });
  }

  return (
    <nav aria-label={label} className={cn("flex items-center text-[13px] font-medium tracking-[0.06em]", className)}>
      {locales.map((item, i) => (
        <span key={item} className="flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="px-1 text-fg-3">
              /
            </span>
          )}
          {item === locale ? (
            <span aria-current="true" className="inline-flex min-h-8 items-center px-1 text-fg uppercase">
              {item}
            </span>
          ) : (
            <Link
              href={`/${item}`}
              hrefLang={item}
              lang={item}
              aria-label={switchLabel}
              onClick={(event) => handleClick(event, item)}
              className="relative inline-flex min-h-8 items-center px-1 text-fg-3 uppercase transition-colors before:absolute before:-inset-x-2 before:-inset-y-1.5 before:content-[''] hover:text-fg"
            >
              {item}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
