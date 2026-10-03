/**
 * FNV-1a 32-bit hash. Small, fast and stable across runs and browsers, so the
 * same URL always produces the same mock audit.
 */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic integer in [min, max] derived from a hash and a salt. */
export function pick(hash: number, salt: number, min: number, max: number): number {
  const mixed = hashString(`${hash}:${salt}`);
  return min + (mixed % (max - min + 1));
}
