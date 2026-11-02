"use client";

import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { STATIC_SITE } from "@/lib/deploy";
import { ADMIN_OPEN_EVENT, hasAdminHint } from "./events";

// Admin code only downloads for the admin, never for visitors.
const AdminLogin = lazy(() => import("./AdminLogin").then((m) => ({ default: m.AdminLogin })));
const AdminBar = lazy(() => import("./AdminBar").then((m) => ({ default: m.AdminBar })));

type State = "visitor" | "login" | "admin" | "hidden";

/** Mounted on every page; stays inert (renders nothing) for regular visitors. */
export function AdminHost({ locale }: { locale: Locale }) {
  const [state, setState] = useState<State>("visitor");

  // Restore the bar after a reload if the session is still valid.
  useEffect(() => {
    if (STATIC_SITE || !hasAdminHint()) return;
    let cancelled = false;
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((session: { admin: boolean }) => {
        if (cancelled || !session.admin) return;
        const hidden = sessionStorage.getItem("icg-admin-hidden") && !new URLSearchParams(window.location.search).has("edit");
        setState(hidden ? "hidden" : "admin");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function open() {
      setState((current) => {
        if (current === "admin" || current === "hidden") {
          sessionStorage.removeItem("icg-admin-hidden");
          return "admin";
        }
        return "login";
      });
    }
    window.addEventListener(ADMIN_OPEN_EVENT, open);
    return () => window.removeEventListener(ADMIN_OPEN_EVENT, open);
  }, []);

  // Arriving from the footer key on the GitHub Pages copy (…/ru?admin): open sign-in right away
  // (a saved session restores the bar on its own, above).
  useEffect(() => {
    if (STATIC_SITE) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("admin")) return;
    url.searchParams.delete("admin");
    window.history.replaceState(window.history.state, "", url);
    if (!hasAdminHint()) window.dispatchEvent(new Event(ADMIN_OPEN_EVENT));
  }, []);

  const hide = useCallback(() => {
    sessionStorage.setItem("icg-admin-hidden", "1");
    setState("hidden");
  }, []);

  return (
    <Suspense fallback={null}>
      {state === "login" && <AdminLogin onSuccess={() => setState("admin")} onClose={() => setState("visitor")} />}
      {state === "admin" && <AdminBar locale={locale} onHide={hide} onLogout={() => setState("visitor")} />}
    </Suspense>
  );
}
