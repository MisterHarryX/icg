import "server-only";
import { BACKEND } from "@/lib/admin/backend";
import { redis, redisPipeline } from "@/lib/admin/redis";
import { dataPath, readJson, writeJsonAtomic } from "@/lib/admin/storage";

/**
 * The few key-value operations leads and the bot need. Upstash Redis on Vercel;
 * on a plain server or in development, one JSON file under `.data/`.
 */

export const leadsStorageReady = BACKEND !== "none";

type FileStore = {
  strings: Record<string, { v: string; e?: number }>;
  sets: Record<string, string[]>;
  zsets: Record<string, Record<string, number>>;
};

const FILE = dataPath("leads", "kv.json");
let queue: Promise<unknown> = Promise.resolve();

/** File operations run one at a time so concurrent requests never lose a write. */
function withFile<T>(fn: (store: FileStore) => T | Promise<T>, write = false): Promise<T> {
  const run = queue.then(async () => {
    const store = await readJson<FileStore>(FILE, { strings: {}, sets: {}, zsets: {} });
    const now = Date.now();
    for (const [key, entry] of Object.entries(store.strings)) if (entry.e && entry.e < now) delete store.strings[key];
    const result = await fn(store);
    if (write) await writeJsonAtomic(FILE, store);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

function assertReady() {
  if (BACKEND === "none") throw new Error("Хранилище не подключено: нужен Upstash Redis (KV_REST_API_*).");
}

export async function kvGet(key: string): Promise<string | null> {
  assertReady();
  if (BACKEND === "redis") return redis<string | null>(["GET", key]);
  return withFile((s) => s.strings[key]?.v ?? null);
}

export async function kvMget(keys: string[]): Promise<(string | null)[]> {
  assertReady();
  if (keys.length === 0) return [];
  if (BACKEND === "redis") return redis<(string | null)[]>(["MGET", ...keys]);
  return withFile((s) => keys.map((key) => s.strings[key]?.v ?? null));
}

export async function kvSet(key: string, value: string, ttlSeconds?: number) {
  assertReady();
  if (BACKEND === "redis") {
    await redis(ttlSeconds ? ["SET", key, value, "EX", ttlSeconds] : ["SET", key, value]);
    return;
  }
  await withFile((s) => {
    s.strings[key] = { v: value, e: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined };
  }, true);
}

/** Sets the key only when it does not exist yet. True when it was set. */
export async function kvSetNx(key: string, value: string, ttlSeconds: number) {
  assertReady();
  if (BACKEND === "redis") return (await redis<string | null>(["SET", key, value, "NX", "EX", ttlSeconds])) === "OK";
  return withFile((s) => {
    if (s.strings[key]) return false;
    s.strings[key] = { v: value, e: Date.now() + ttlSeconds * 1000 };
    return true;
  }, true);
}

export async function kvDel(key: string) {
  assertReady();
  if (BACKEND === "redis") {
    await redis(["DEL", key]);
    return;
  }
  await withFile((s) => {
    delete s.strings[key];
    delete s.sets[key];
    delete s.zsets[key];
  }, true);
}

/** Increments a counter; the expiry is set on the first increment only. */
export async function kvIncr(key: string, ttlSeconds?: number): Promise<number> {
  assertReady();
  if (BACKEND === "redis") {
    const commands: (string | number)[][] = [["INCR", key]];
    if (ttlSeconds) commands.push(["EXPIRE", key, ttlSeconds, "NX"]);
    const [value] = await redisPipeline<number>(commands);
    return Number(value);
  }
  return withFile((s) => {
    const current = Number(s.strings[key]?.v ?? 0) + 1;
    s.strings[key] = { v: String(current), e: s.strings[key]?.e ?? (ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined) };
    return current;
  }, true);
}

export async function kvSadd(key: string, member: string) {
  assertReady();
  if (BACKEND === "redis") {
    await redis(["SADD", key, member]);
    return;
  }
  await withFile((s) => {
    const set = new Set(s.sets[key] ?? []);
    set.add(member);
    s.sets[key] = [...set];
  }, true);
}

export async function kvSmembers(key: string): Promise<string[]> {
  assertReady();
  if (BACKEND === "redis") return redis<string[]>(["SMEMBERS", key]);
  return withFile((s) => s.sets[key] ?? []);
}

export async function kvScard(key: string): Promise<number> {
  assertReady();
  if (BACKEND === "redis") return Number(await redis<number>(["SCARD", key]));
  return withFile((s) => (s.sets[key] ?? []).length);
}

export async function kvZadd(key: string, score: number, member: string) {
  assertReady();
  if (BACKEND === "redis") {
    await redis(["ZADD", key, score, member]);
    return;
  }
  await withFile((s) => {
    s.zsets[key] = { ...(s.zsets[key] ?? {}), [member]: score };
  }, true);
}

/** Members from the highest score down (newest first for timestamps). */
export async function kvZrevrange(key: string, start: number, stop: number): Promise<string[]> {
  assertReady();
  if (BACKEND === "redis") return redis<string[]>(["ZRANGE", key, start, stop, "REV"]);
  return withFile((s) => {
    const sorted = Object.entries(s.zsets[key] ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([member]) => member);
    return sorted.slice(start, stop === -1 ? undefined : stop + 1);
  });
}
