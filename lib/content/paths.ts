/** Helpers for addressing strings inside the nested messages object. Client-safe. */

/** { a: { b: "x", c: ["y"] } } → { "a.b": "x", "a.c.0": "y" } */
export function flattenMessages(value: unknown, prefix = "", out: Record<string, string> = {}) {
  if (typeof value === "string") {
    out[prefix] = value;
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => flattenMessages(item, prefix ? `${prefix}.${i}` : String(i), out));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) flattenMessages(item, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

/** Returns a copy of `messages` with the given paths replaced. Unknown paths are ignored. */
export function applyTexts<T>(messages: T, texts: Record<string, string> | undefined): T {
  if (!texts || Object.keys(texts).length === 0) return messages;
  const copy = structuredClone(messages) as unknown;
  for (const [path, text] of Object.entries(texts)) {
    const keys = path.split(".");
    let node = copy as Record<string, unknown>;
    for (const key of keys.slice(0, -1)) {
      const next = node?.[key];
      if (!next || typeof next !== "object") {
        node = undefined as never;
        break;
      }
      node = next as Record<string, unknown>;
    }
    const last = keys[keys.length - 1];
    if (node && typeof node[last] === "string") node[last] = text;
  }
  return copy as T;
}
