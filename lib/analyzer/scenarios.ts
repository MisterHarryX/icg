import type { RecommendationId, ScenarioId } from "./types";

export interface Scenario {
  id: ScenarioId;
  /** Recommendations in priority order; the mock shows the first 3–4. */
  recommendations: RecommendationId[];
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  beauty: { id: "beauty", recommendations: ["booking", "primaryCta", "trust", "mobile", "visuals"] },
  business: { id: "business", recommendations: ["heroMessage", "primaryCta", "hierarchy", "contacts", "speed"] },
  minimal: { id: "minimal", recommendations: ["primaryCta", "heroMessage", "trust", "spacing", "contacts"] },
  legacy: { id: "legacy", recommendations: ["mobile", "hierarchy", "speed", "typography", "navigation"] },
};

export const SCENARIO_ORDER: ScenarioId[] = ["beauty", "business", "minimal", "legacy"];

/** Keyword hints make the demo feel relevant; still fully deterministic. */
export const SCENARIO_HINTS: Partial<Record<ScenarioId, RegExp>> = {
  beauty:
    /beauty|salon|studio|nail|hair|brow|lash|spa|barber|kosmet|cosmet|makeup|manicure|krasot|красот|салон|барбер|ногт|маникюр|стриж/i,
  legacy: /narod|ucoz|boom|jimdo|\.info$|\.biz$/i,
};
