/**
 * Static copy of the site for GitHub Pages → out/.
 *
 *   npm run build:pages
 *
 * 1. Pulls what the admin published (texts, photos, fonts, contacts, map) from
 *    the Vercel server and downloads the uploaded photos, so the pages need
 *    nothing from Vercel to show.
 * 2. Builds the site without its server parts (app/api, app/admin, proxy.ts —
 *    moved aside for the build and put back afterwards). The request form,
 *    statistics and admin mode keep working against the Vercel server.
 * 3. Adds what GitHub Pages needs: WebP image sizes, "/" → /ru or /en,
 *    /admin → Vercel, 404.html, CNAME, .nojekyll.
 *
 * Settings (environment):
 *   API_ORIGIN   the Vercel server        (default https://icg-xi.vercel.app)
 *   SITE_URL     the public address        (default https://icg-xi.ru)
 *   PAGES_CNAME  custom domain for Pages   (default: SITE_URL's host; "" for none)
 *   SITE_CONTENT_FILE  read the content from this JSON file instead of the server (local tests)
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_ORIGIN = (process.env.API_ORIGIN || "https://icg-xi.vercel.app").replace(/\/$/, "");
const SITE_URL = (process.env.SITE_URL || "https://icg-xi.ru").replace(/\/$/, "");
const CNAME = process.env.PAGES_CNAME ?? new URL(SITE_URL).host;

const OUT = path.join(root, "out");
const CONTENT_FILE = path.join(root, ".data", "pages", "content.json");
const MEDIA_DIR = path.join(root, "public", "site-media");
const STASH = path.join(root, ".pages-stash");
const SERVER_ONLY = ["app/api", "app/admin", "proxy.ts"];

/** next.config defaults: every width the image loader may ask for. */
const IMAGE_WIDTHS = [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

const log = (...args) => console.log("[pages]", ...args);

// --- 1. Published content ------------------------------------------------------------------

/** The server's answer as text: its sha256 is the content version (the workflow computes it the same way). */
async function fetchContent() {
  if (process.env.SITE_CONTENT_FILE) {
    log(`content from ${process.env.SITE_CONTENT_FILE}`);
    return fs.readFile(process.env.SITE_CONTENT_FILE, "utf8");
  }
  log(`content from ${API_ORIGIN}/api/site-content`);
  const response = await fetch(`${API_ORIGIN}/api/site-content`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`site-content: HTTP ${response.status}`);
  return response.text();
}

async function pullContent() {
  const raw = await fetchContent();
  const version = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  const content = JSON.parse(raw);
  if (!content?.overrides || typeof content.overrides !== "object") throw new Error("site-content: unexpected answer");

  await fs.rm(MEDIA_DIR, { recursive: true, force: true });
  const media = content.overrides.media ?? {};
  for (const [id, value] of Object.entries(media)) {
    const url = new URL(value, API_ORIGIN);
    const name = path.basename(url.pathname);
    if (!/^[a-z0-9-]+\.(webp|jpg|png|avif)$/i.test(name)) throw new Error(`media ${id}: odd file name ${name}`);
    const file = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!file.ok) throw new Error(`media ${id}: HTTP ${file.status} for ${url}`);
    await fs.mkdir(MEDIA_DIR, { recursive: true });
    await fs.writeFile(path.join(MEDIA_DIR, name), Buffer.from(await file.arrayBuffer()));
    media[id] = `/site-media/${name}`;
  }
  log(`${Object.keys(media).length} uploaded photo(s), bot @${content.bot ?? "—"}`);

  await fs.mkdir(path.dirname(CONTENT_FILE), { recursive: true });
  await fs.writeFile(CONTENT_FILE, JSON.stringify(content));
  return { content, version };
}

// --- 2. next build without the server parts --------------------------------------------------

async function stashServerParts() {
  if (existsSync(STASH)) {
    throw new Error(`${STASH} exists: an earlier run stopped halfway. Move its contents back into the project, then delete it.`);
  }
  for (const item of SERVER_ONLY) {
    const from = path.join(root, item);
    if (!existsSync(from)) continue;
    const to = path.join(STASH, item);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.rename(from, to);
  }
}

async function restoreServerParts() {
  for (const item of SERVER_ONLY) {
    const from = path.join(STASH, item);
    if (existsSync(from)) await fs.rename(from, path.join(root, item));
  }
  await fs.rm(STASH, { recursive: true, force: true });
}

function nextBuild(bot) {
  const result = spawnSync(process.execPath, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ICG_STATIC_EXPORT: "1",
      ICG_STATIC_CONTENT: CONTENT_FILE,
      NEXT_PUBLIC_API_ORIGIN: API_ORIGIN,
      NEXT_PUBLIC_SITE_URL: SITE_URL,
      TELEGRAM_BOT_USERNAME: bot ?? "",
    },
  });
  if (result.status !== 0) throw new Error(`next build failed (exit ${result.status})`);
}

// --- 3. What GitHub Pages needs --------------------------------------------------------------

async function walk(dir) {
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

/** WebP copies for lib/imageLoader.ts: every width the pages ask for, plus the defaults. */
async function imageSizes() {
  const mediaDir = path.join(OUT, "_next", "static", "media");
  const pageFiles = (await walk(OUT)).filter((file) => /\.(html|txt|js)$/.test(file));
  const wanted = new Map();
  for (const file of pageFiles) {
    const text = await fs.readFile(file, "utf8");
    for (const [, name, width] of text.matchAll(/\/_next\/static\/media\/([\w.-]+?\.(?:jpe?g|png|webp))\.(\d+)\.webp/gi)) {
      if (!wanted.has(name)) wanted.set(name, new Set());
      wanted.get(name).add(Number(width));
    }
  }
  const sources = (await fs.readdir(mediaDir)).filter((name) => /\.(jpe?g|png|webp)$/i.test(name) && !/\.\d+\.webp$/.test(name));
  for (const name of wanted.keys()) {
    if (!sources.includes(name)) throw new Error(`page asks for ${name}, which is not in _next/static/media`);
  }
  let count = 0;
  for (const name of sources) {
    const widths = new Set([...IMAGE_WIDTHS, ...(wanted.get(name) ?? [])]);
    const input = await fs.readFile(path.join(mediaDir, name));
    await Promise.all(
      [...widths].map(async (width) => {
        await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 75 }).toFile(path.join(mediaDir, `${name}.${width}.webp`));
        count += 1;
      }),
    );
  }
  log(`${count} WebP image sizes for ${sources.length} photos`);
}

/**
 * Link-preview cards: GitHub Pages picks the content type by extension, so
 * ru/opengraph-image becomes ru/opengraph-image.png (and every link to it).
 */
async function previewImages() {
  const pattern = /(\/(?:ru|en)\/opengraph-image)(?=[?"'\\])/g;
  for (const file of (await walk(OUT)).filter((name) => /\.(html|txt)$/.test(name))) {
    const text = await fs.readFile(file, "utf8");
    const next = text.replace(pattern, "$1.png");
    if (next !== text) await fs.writeFile(file, next);
  }
  for (const locale of ["ru", "en"]) {
    const image = path.join(OUT, locale, "opengraph-image");
    if (!existsSync(image)) throw new Error(`no ${locale}/opengraph-image in the build`);
    await fs.rename(image, `${image}.png`);
  }
}

/**
 * Prefetch data for client-side navigation (e.g. RU → EN): the export writes
 * en/__next.$d$locale/__PAGE__.txt, the browser asks for en/__next.$d$locale.__PAGE__.txt.
 * A dotted copy of each such file makes those requests hit.
 */
async function prefetchFiles() {
  let count = 0;
  for (const file of await walk(OUT)) {
    const parts = path.relative(OUT, file).split(path.sep);
    const first = parts.findIndex((part, i) => part.startsWith("__next.") && i < parts.length - 1);
    if (first === -1) continue;
    const flat = path.join(OUT, ...parts.slice(0, first), parts.slice(first).join("."));
    if (!existsSync(flat)) {
      await fs.copyFile(file, flat);
      count += 1;
    }
  }
  log(`${count} prefetch file(s) for client navigation`);
}

const redirectPage = (target, extra = "") => `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ICG</title>
<script>${extra}</script>
<meta http-equiv="refresh" content="0;url=${target}">
</head><body style="background:#060608"><a href="${target}" style="color:#9a9aa6;font:14px sans-serif">${target}</a></body></html>
`;

async function pagesFiles(version) {
  // "/" → /ru or /en by the browser language (what proxy.ts does on Vercel).
  // It is the Russian page itself, so link previews and search bots get real content.
  const ru = await fs.readFile(path.join(OUT, "ru", "index.html"), "utf8");
  const pick = `(function(){var l=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||"ru"],t="ru";for(var i=0;i<l.length;i++){var c=String(l[i]).toLowerCase().split("-")[0];if(c==="ru"||c==="uk"||c==="be"||c==="kk"){t="ru";break}if(c==="en"){t="en";break}t="en"}location.replace("/"+t+"/"+location.search+location.hash)})();`;
  if (!ru.includes("<head>")) throw new Error("ru.html: no <head>");
  await fs.writeFile(path.join(OUT, "index.html"), ru.replace("<head>", `<head><script>${pick}</script>`));

  // Admin mode and the leads board live on the server.
  const toServer = `location.replace(${JSON.stringify(API_ORIGIN)}+location.pathname+location.search+location.hash);`;
  for (const page of ["admin", "admin/leads"]) {
    await fs.mkdir(path.join(OUT, page), { recursive: true });
    await fs.writeFile(path.join(OUT, page, "index.html"), redirectPage(`${API_ORIGIN}/${page}`, toServer));
  }

  if (!existsSync(path.join(OUT, "404.html"))) throw new Error("no 404.html in the build");

  if (CNAME) await fs.writeFile(path.join(OUT, "CNAME"), `${CNAME}\n`);
  // Without it GitHub Pages hides folders that start with "_" (all of /_next).
  await fs.writeFile(path.join(OUT, ".nojekyll"), "");
  // The workflow compares this with the server to know when to rebuild.
  await fs.writeFile(path.join(OUT, "content-version.txt"), `${version}\n`);
}

// --- Run -----------------------------------------------------------------------------------

const { content, version } = await pullContent();
await fs.rm(OUT, { recursive: true, force: true });
await stashServerParts();
try {
  nextBuild(content.bot);
} finally {
  await restoreServerParts();
  await fs.rm(MEDIA_DIR, { recursive: true, force: true });
}
await imageSizes();
await previewImages();
await prefetchFiles();
await pagesFiles(version);
log(`done: out/ (content ${version})`);
