/** The footer button talks to AdminHost through this window event. */
export const ADMIN_OPEN_EVENT = "icg:admin-open";

/** Set by the server on login; only a hint for the static page (the real session is httpOnly). */
export function hasAdminHint() {
  return typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith("icg_admin_ui="));
}
