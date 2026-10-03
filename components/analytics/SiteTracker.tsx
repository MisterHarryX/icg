"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";
import type { TrackPayload } from "@/lib/analytics/types";

/** Section id (or header/footer) a link sits in, for "where do people click Telegram". */
function placeOf(element: Element) {
  const area = element.closest("section[id], header, footer, nav");
  if (!area) return "page";
  return area.id || area.tagName.toLowerCase();
}

/**
 * Cookie-free visit analytics: one pageview, Telegram/phone clicks, and on leave
 * how long the tab was visible plus which sections reached the screen.
 * Device, country and city are worked out on the server.
 */
export function SiteTracker({ locale }: { locale: string }) {
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const context: Partial<TrackPayload> = {
      locale,
      path: location.pathname,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lang: navigator.language,
      sw: screen.width,
      touch: navigator.maxTouchPoints ?? 0,
    };

    track({ ...context, type: "pageview", ref: document.referrer || undefined, utm: params.get("utm_source") ?? undefined });

    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") ?? "";
      if (/^(https?:)?\/\/(t\.me|telegram\.me)\//i.test(href) || href.startsWith("tg:")) {
        track({ ...context, type: "telegram", place: placeOf(link) });
      } else if (href.startsWith("tel:")) {
        track({ ...context, type: "phone", place: placeOf(link) });
      }
    }
    document.addEventListener("click", onClick, { capture: true });

    // Sections that were at least a third on screen.
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) seen.add((entry.target as HTMLElement).id || "footer");
        }
      },
      { threshold: [0, 0.35], rootMargin: "-30% 0px -30% 0px" },
    );
    document.querySelectorAll("main section[id], footer").forEach((element) => observer.observe(element));

    // Visible time, flushed whenever the tab is hidden (the reliable "leave" signal on mobile).
    let visibleSince = document.visibilityState === "visible" ? performance.now() : 0;
    let pending = 0;

    function flush() {
      if (visibleSince) {
        pending += performance.now() - visibleSince;
        visibleSince = 0;
      }
      const dur = Math.round(pending / 1000);
      if (dur < 1 && seen.size === 0) return;
      track({ ...context, type: "engage", dur, seen: [...seen] });
      pending = 0;
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
      else visibleSince = performance.now();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      observer.disconnect();
    };
  }, [locale]);

  return null;
}
