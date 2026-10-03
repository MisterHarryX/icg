import { hashString, pick } from "./hash";
import { SCENARIOS, SCENARIO_HINTS, SCENARIO_ORDER } from "./scenarios";
import type { AuditCheck, AuditResult, CheckId, CheckStatus, ScenarioId } from "./types";

/** Conversion-critical checks are always shown; two more are picked per URL. */
const ALWAYS: CheckId[] = ["cta", "mobile"];
const OPTIONAL: CheckId[] = ["design", "structure", "hierarchy", "speed"];

export const SCORE_MIN = 38;
export const SCORE_MAX = 58;

export function statusFor(score: number): CheckStatus {
  return score < 45 ? "weak" : "fair";
}

function chooseScenario(host: string, hash: number): ScenarioId {
  for (const id of SCENARIO_ORDER) {
    if (SCENARIO_HINTS[id]?.test(host)) return id;
  }
  // Beauty-specific advice (online booking, specialists) only for beauty-looking hosts.
  const generic = SCENARIO_ORDER.filter((id) => id !== "beauty");
  return generic[pick(hash, 0, 0, generic.length - 1)];
}

/**
 * Local stand-in for a real audit. It does NOT fetch or inspect the site: the
 * normalized URL is hashed, so results look varied between sites but the same
 * URL always gets the same answer (no Math.random). Every result is in the
 * "needs work" range — the overall score stays within SCORE_MIN…SCORE_MAX and
 * no check is ever "good".
 */
export function mockAnalyzeWebsite(url: string, host: string): AuditResult {
  const key = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "");
  const hash = hashString(key);
  const scenario = SCENARIOS[chooseScenario(host, hash)];

  const score = SCORE_MIN + pick(hash, 1, 0, SCORE_MAX - SCORE_MIN);

  // Deterministic shuffle: every optional check gets a hash-derived sort key.
  const extra = OPTIONAL.map((id, i) => ({ id, key: pick(hash, 10 + i, 0, 9999) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, 2)
    .map((entry) => entry.id);
  const checks: AuditCheck[] = [...ALWAYS, ...extra].map((id, i) => {
    const value = clamp(score + pick(hash, 20 + i, -16, 8), 22, 62);
    return { id, score: value, status: statusFor(value) };
  });

  const count = pick(hash, 99, 3, 4);
  return {
    url,
    host,
    score,
    checks,
    recommendations: scenario.recommendations.slice(0, count),
    scenario: scenario.id,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
