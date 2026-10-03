/**
 * Locale-agnostic audit result. The UI maps ids to localized copy, so a real
 * API can return exactly this shape later without touching components.
 */

export type CheckId = "design" | "structure" | "mobile" | "cta" | "hierarchy" | "speed";

/** The express audit only reports what needs work — there is no "good" state. */
export type CheckStatus = "fair" | "weak";

export type RecommendationId =
  | "heroMessage"
  | "primaryCta"
  | "navigation"
  | "hierarchy"
  | "mobile"
  | "booking"
  | "trust"
  | "contacts"
  | "typography"
  | "visuals"
  | "spacing"
  | "speed";

export type ScenarioId = "beauty" | "business" | "minimal" | "legacy";

export interface AuditCheck {
  id: CheckId;
  score: number;
  status: CheckStatus;
}

export interface AuditResult {
  /** Normalized URL that was audited. */
  url: string;
  /** Hostname without "www.", for display. */
  host: string;
  /** 0–100; the express audit always lands in 38–58. */
  score: number;
  checks: AuditCheck[];
  /** In priority order; the first two are shown as high priority. */
  recommendations: RecommendationId[];
  /** Which mock scenario produced the result (absent for real audits). */
  scenario?: ScenarioId;
}
