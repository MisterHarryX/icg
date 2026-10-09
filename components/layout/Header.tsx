"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/messages/ru";
import { FULL_NAV, HEADER_NAV, SECTION_IDS } from "@/lib/constants/sections";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./LocaleSwitcher";

type NavCopy = Messages["nav"];

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [threshold]);
  return scrolled;
}

/** Tracks which section is under the header, for aria-current on nav links. */
function useActiveSection() {
  const [active, setActive] = useState<string>(SECTION_IDS.home);
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main section[id]"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  return active;
}

/** `reviewsUrl` (Yandex Maps, set in admin mode → Контакты) adds an external "Отзывы" item. */
export function Header({ locale, t, reviewsUrl }: { locale: Locale; t: NavCopy; reviewsUrl?: string }) {
  const scrolled = useScrolled();
  const active = useActiveSection();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) menuButton.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => desktop.matches && close();

    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    return () => {
      root.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
    };
  }, [open, close]);

  const solid = scrolled || open;

  return (
    <>
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ease-out-soft",
        solid ? "border-line bg-bg/75 backdrop-blur-xl backdrop-saturate-150" : "border-transparent bg-transparent",
      )}
    >
      <a
        href="#main"
        className="sr-only rounded-md bg-fg px-3 py-2 text-sm text-bg focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-10"
      >
        {t.skip}
      </a>

      <div className="container-page flex h-16 items-center justify-between gap-6">
        <a href={`#${SECTION_IDS.home}`} aria-label={t.homeAria} className="rounded-md" onClick={() => close()}>
          <Logo id="icg-mark-header" />
        </a>

        <nav aria-label={t.menu} className="hidden lg:block">
          <ul className="flex items-center">
            {HEADER_NAV.map((item) => (
              // With the extra "Отзывы" item the row is too wide for 1024–1279px; the logo already links home.
              <li key={item.id} className={reviewsUrl && item.id === SECTION_IDS.home ? "hidden xl:block" : undefined}>
                {/* White hairline: draws in from the left on hover, leaves to the right; stays on the active section. */}
                <a
                  href={`#${item.id}`}
                  aria-current={active === item.id ? "location" : undefined}
                  className="nav-link relative block px-2.5 py-2 text-[14px] whitespace-nowrap text-fg-2 transition-colors duration-200 hover:text-fg aria-[current]:text-fg xl:px-3.5"
                >
                  {t[item.key]}
                </a>
              </li>
            ))}
            {reviewsUrl && (
              <li>
                <a
                  href={reviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.reviewsAria}
                  className="nav-link relative flex items-center gap-1 px-2.5 py-2 text-[14px] whitespace-nowrap text-fg-2 transition-colors duration-200 hover:text-fg xl:px-3.5"
                >
                  {t.reviews}
                  <svg viewBox="0 0 12 12" aria-hidden="true" className="size-2.5 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
                  </svg>
                </a>
              </li>
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-4 sm:gap-5">
          <div className="hidden sm:block">
            <LocaleSwitcher locale={locale} label={t.language} switchLabel={t.switchTo} />
          </div>
          <div className="hidden md:block">
            <ButtonLink href={`#${SECTION_IDS.contact}`}>{t.cta}</ButtonLink>
          </div>
          <button
            ref={menuButton}
            type="button"
            className="-mr-2 grid size-10 place-items-center rounded-md text-fg lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.closeMenu : t.openMenu}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="relative block h-3 w-5" aria-hidden="true">
              <span
                className={cn(
                  "absolute left-0 h-px w-5 bg-current transition-transform duration-300 ease-out-soft",
                  open ? "top-1.5 rotate-45" : "top-0",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 h-px w-5 bg-current transition-transform duration-300 ease-out-soft",
                  open ? "top-1.5 -rotate-45" : "top-3",
                )}
              />
            </span>
          </button>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="scroll-progress absolute inset-x-0 -bottom-px hidden h-px bg-fg/40"
      />

    </header>

    {/* Mobile menu — outside <header>, whose backdrop-filter would trap position:fixed. */}
      <div
        id="mobile-menu"
        ref={panel}
        hidden={!open}
        className="fixed inset-x-0 top-16 bottom-0 z-40 animate-[menu-in_0.45s_var(--ease-out-soft)] overflow-y-auto bg-bg lg:hidden"
      >
        <div className="container-page flex min-h-full flex-col pt-4 pb-8">
          <nav aria-label={t.menu}>
            <ul className="flex flex-col">
              {FULL_NAV.map((item, i) => (
                <li key={item.id} className="border-b border-line">
                  <a
                    href={`#${item.id}`}
                    onClick={() => close()}
                    aria-current={active === item.id ? "location" : undefined}
                    className="flex items-baseline gap-4 py-3.5 text-[26px] font-medium tracking-[-0.03em] text-fg-2 transition-colors hover:text-fg aria-[current]:text-fg"
                  >
                    <span className="w-5 text-[13px] text-fg-3 tabular-nums">0{i + 1}</span>
                    {t[item.key]}
                  </a>
                </li>
              ))}
              {reviewsUrl && (
                <li className="border-b border-line">
                  <a
                    href={reviewsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t.reviewsAria}
                    onClick={() => close()}
                    className="flex items-baseline gap-4 py-3.5 text-[26px] font-medium tracking-[-0.03em] text-fg-2 transition-colors hover:text-fg"
                  >
                    <span className="w-5 text-[13px] text-fg-3 tabular-nums">0{FULL_NAV.length + 1}</span>
                    {t.reviews}
                    <span aria-hidden="true" className="text-[18px] text-fg-3">↗</span>
                  </a>
                </li>
              )}
            </ul>
          </nav>
          <div className="mt-auto flex flex-col gap-6 pt-8">
            <LocaleSwitcher locale={locale} label={t.language} switchLabel={t.switchTo} onNavigate={() => close()} />
            <ButtonLink href={`#${SECTION_IDS.contact}`} size="lg" arrow onClick={() => close()}>
              {t.cta}
            </ButtonLink>
          </div>
        </div>
      </div>
    </>
  );
}
