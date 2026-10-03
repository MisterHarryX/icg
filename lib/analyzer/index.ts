import { mockAnalyzeWebsite } from "./mock-analyze";
import { validateWebsiteUrl } from "./validate-url";
import type { AuditResult } from "./types";

export { validateWebsiteUrl } from "./validate-url";
export type * from "./types";

export class InvalidUrlError extends Error {
  constructor(public reason: "empty" | "invalid") {
    super(`Invalid website URL: ${reason}`);
    this.name = "InvalidUrlError";
  }
}

/**
 * Public entry point used by the UI.
 *
 * Today it runs the local mock. To connect a real service later, replace the
 * body with a fetch to your API that returns an `AuditResult` — the audit UI
 * only depends on this function's signature.
 */
export async function analyzeWebsite(
  input: string,
  options: { signal?: AbortSignal } = {},
): Promise<AuditResult> {
  const validation = validateWebsiteUrl(input);
  if (!validation.ok) throw new InvalidUrlError(validation.reason);
  options.signal?.throwIfAborted();

  return mockAnalyzeWebsite(validation.url, validation.host);
}
