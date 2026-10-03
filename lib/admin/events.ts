import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import type { StoredEvent } from "@/lib/analytics/types";
import { BACKEND } from "./backend";
import { redis, redisPipeline } from "./redis";
import { appendLine, dataPath } from "./storage";

const EVENTS_DIR = dataPath("events");
const DAY_MS = 86_400_000;
/** Redis keeps each day's list for ~13 months. */
const RETENTION_SECONDS = 400 * 86_400;

const dayKeyRedis = (day: string) => `icg:events:${day}`;

function utcDay(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

// --- Anonymous visitor id ------------------------------------------------------

let salt: Promise<string> | null = null;

/** Random per-installation salt, created on first use. */
function getSalt() {
  salt ??= (async () => {
    const fresh = randomBytes(24).toString("hex");
    if (BACKEND === "redis") {
      await redis(["SET", "icg:salt", fresh, "NX"]);
      return (await redis<string>(["GET", "icg:salt"])) ?? fresh;
    }
    if (BACKEND === "none") return process.env.ADMIN_SECRET || fresh;
    const file = dataPath("salt");
    try {
      return (await fs.readFile(file, "utf8")).trim();
    } catch {
      await fs.mkdir(dataPath(), { recursive: true });
      await fs.writeFile(file, fresh, "utf8");
      return fresh;
    }
  })().catch((error) => {
    salt = null;
    throw error;
  });
  return salt;
}

/**
 * Same person, same day → same id; tomorrow it changes. Built from salt + IP +
 * user agent and hashed, so neither the IP nor any cookie is ever stored.
 */
export async function visitorId(ip: string, userAgent: string, now = Date.now()) {
  const hash = createHash("sha256").update(`${await getSalt()}|${utcDay(now)}|${ip}|${userAgent}`).digest("base64url");
  return hash.slice(0, 16);
}

// --- Write / read ---------------------------------------------------------------

export function analyticsEnabled() {
  return BACKEND !== "none";
}

export async function recordEvent(event: StoredEvent) {
  const day = utcDay(event.ts);
  const line = JSON.stringify(event);
  if (BACKEND === "redis") {
    await redisPipeline([
      ["RPUSH", dayKeyRedis(day), line],
      ["EXPIRE", dayKeyRedis(day), RETENTION_SECONDS],
    ]);
  } else if (BACKEND === "files") {
    await appendLine(`${EVENTS_DIR}/${day}.ndjson`, line);
  }
}

function parseLines(lines: string[]) {
  const events: StoredEvent[] = [];
  for (const line of lines) {
    if (!line) continue;
    try {
      events.push(JSON.parse(line) as StoredEvent);
    } catch {
      // Skip a torn line rather than failing the whole dashboard.
    }
  }
  return events;
}

/** Finished days never change, so their parsed events are kept in memory. */
const dayCache = new Map<string, { size: number; events: StoredEvent[] }>();

async function readFileDay(day: string): Promise<StoredEvent[]> {
  const file = `${EVENTS_DIR}/${day}.ndjson`;
  let size: number;
  try {
    size = (await fs.stat(file)).size;
  } catch {
    return [];
  }
  const cached = dayCache.get(day);
  if (cached && cached.size === size) return cached.events;
  const events = parseLines((await fs.readFile(file, "utf8")).split("\n"));
  dayCache.set(day, { size, events });
  return events;
}

async function readRedisDays(days: string[]): Promise<StoredEvent[]> {
  const today = utcDay(Date.now());
  const missing = days.filter((day) => day >= today || !dayCache.has(day));
  const results = await redisPipeline<string[]>(missing.map((day) => ["LRANGE", dayKeyRedis(day), 0, -1]));
  missing.forEach((day, i) => {
    const events = parseLines(results[i] ?? []);
    if (day < today) dayCache.set(day, { size: events.length, events });
    else dayCache.set(`live:${day}`, { size: events.length, events });
  });
  return days.flatMap((day) => (day < today ? dayCache.get(day)?.events : dayCache.get(`live:${day}`)?.events) ?? []);
}

/** Events with from <= ts < to. */
export async function readEvents(from: number, to: number) {
  const days: string[] = [];
  for (let t = from - DAY_MS; t < to + DAY_MS; t += DAY_MS) days.push(utcDay(t));
  const unique = [...new Set(days)];

  let all: StoredEvent[] = [];
  if (BACKEND === "redis") all = await readRedisDays(unique);
  else if (BACKEND === "files") all = (await Promise.all(unique.map(readFileDay))).flat();
  return all.filter((event) => event.ts >= from && event.ts < to);
}
