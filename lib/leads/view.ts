import type { Lead, LeadView } from "./types";

/** What leaves the server: everything but the secret tracking token. */
export function toView(lead: Lead): LeadView {
  const { token: _token, ...view } = lead;
  void _token;
  return view;
}
