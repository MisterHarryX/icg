import "server-only";

/**
 * Minimal Upstash Redis REST client (no SDK needed). Vercel's Upstash
 * integration sets KV_REST_API_URL / KV_REST_API_TOKEN; a direct Upstash
 * database uses UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
 */
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const redisConfigured = Boolean(URL_ && TOKEN);

type Command = (string | number)[];

async function call<T>(path: string, body: unknown): Promise<T> {
  // No `cache` option on purpose: an explicit "no-store" would turn the static
  // pages that read site content into per-request renders.
  const response = await fetch(`${URL_}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Redis ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

export async function redis<T = unknown>(command: Command): Promise<T> {
  const { result, error } = await call<{ result: T; error?: string }>("", command);
  if (error) throw new Error(`Redis: ${error}`);
  return result;
}

/** Several commands in one round trip. */
export async function redisPipeline<T = unknown>(commands: Command[]): Promise<T[]> {
  if (commands.length === 0) return [];
  const results = await call<{ result: T; error?: string }[]>("/pipeline", commands);
  return results.map((entry) => {
    if (entry.error) throw new Error(`Redis: ${entry.error}`);
    return entry.result;
  });
}
