// Downloads the free DB-IP "IP to City Lite" database (CC BY 4.0, updated monthly)
// to .data/geo/city.mmdb so the admin dashboard can show country and city on a
// plain server. Not needed on Vercel or behind Cloudflare (they send geo headers).
//
//   npm run geo:update
//
// Re-run monthly (e.g. from cron) to keep it fresh.
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const dataDir = path.resolve(process.env.ICG_DATA_DIR || ".data");
const target = process.env.GEOIP_DB || path.join(dataDir, "geo", "city.mmdb");

function monthStamp(offset) {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - offset);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// The current month's file appears a few days into the month, so fall back to last month.
for (const offset of [0, 1]) {
  const url = `https://download.db-ip.com/free/dbip-city-lite-${monthStamp(offset)}.mmdb.gz`;
  console.log(`Downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    console.log(`  not available (${response.status})`);
    continue;
  }
  const data = gunzipSync(Buffer.from(await response.arrayBuffer()));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(`${target}.tmp`, data);
  await rename(`${target}.tmp`, target);
  console.log(`Saved ${(data.length / 1e6).toFixed(1)} MB to ${target}`);
  console.log("Restart the server (or wait for the next deploy) to start using it.");
  process.exit(0);
}

console.error("Could not download the DB-IP database. Try again later.");
process.exit(1);
