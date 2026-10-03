# ICG — Impact · Conversion · Growth

One-page commercial site for the ICG web studio. RU / EN, dark premium UI.

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /ru or /en
npm run lint
npm run typecheck
npm run build && npm run start
```

Stack: Next.js 16 (App Router, static generation), React 19, TypeScript, Tailwind CSS v4.
No animation library — motion is CSS plus two tiny client hooks.

## Structure

```
app/
  [locale]/layout.tsx      root layout per locale (fonts, <html lang>)
  [locale]/page.tsx        composes the sections, metadata per locale
  global-not-found.tsx     bilingual 404 for unmatched URLs
  globals.css              design tokens, reveal/intro motion, mockup scaling
proxy.ts                   "/" → /ru or /en by Accept-Language
messages/ru.ts, en.ts      all copy (en.ts is typed against ru.ts)
lib/
  i18n/                    locales + server-only message loader
  constants/contacts.ts    TELEGRAM_URL, PHONE_NUMBER … (placeholders!)
  constants/sections.ts    section ids + nav order
  analyzer/                website audit: validation, mock, public facade
  portfolio/projects.ts    portfolio entries (concepts today)
components/
  layout/                  Header (mobile menu), Footer, LocaleSwitcher, ScrollRestore
  sections/                Hero, Services, Process, Work, Redesign, Audit, About, Contact
  analyzer/                AuditTool (form, state, panels), AuditLaptop (screen states)
  portfolio/               ProjectShowcase
  redesign/                BeforeAfterSlider
  mockups/                 fictional sites (AURA, FORMA, NOVA, before/after) + StillLife art
  ui/                      Button, Frames (browser/phone), SectionHeader, Section, Logo, …
```

## Things to replace before launch

- **Contacts** — `lib/constants/contacts.ts` holds placeholder Telegram/phone. Nothing else hardcodes them.
- **Site URL** — set `NEXT_PUBLIC_SITE_URL` (used for canonical / hreflang URLs).
- **Portfolio** — add real projects in `lib/portfolio/projects.ts` with
  `preview: { kind: "screenshot", desktop: "/work/x.jpg", mobile: "/work/x-m.jpg" }` and
  `isConcept: false`; add copy under `work.projects.<slug>` in both message files.
- **Admin password** — set a strong `ADMIN_PASSWORD` (and `ADMIN_SECRET`) on the server.
  For the Vercel project they are already set; a local copy is in `.vercel-admin.local`.

## Deploy (Vercel)

Live: https://icg-xi.vercel.app — project `icg` in the WriteLite team (CLI account
misterstavit-4756), functions in Frankfurt (`vercel.json` → `regions: ["fra1"]`), Blob store
`icg-media` (photos + published edits, versioned under `icg/content/`).

```bash
vercel deploy --prod    # the folder is already linked (.vercel/project.json)
```

- Env vars on the project: `ADMIN_PASSWORD`, `ADMIN_SECRET` (local copy in `.vercel-admin.local`),
  `ADMIN_TZ`, `BLOB_READ_WRITE_TOKEN` (added by the Blob store).
- Visit statistics need Upstash Redis: Vercel → project → Storage → Upstash for Redis → Connect
  (accepting Upstash's terms needs a person), then redeploy.
- Set `NEXT_PUBLIC_SITE_URL` once a custom domain is attached; until then the Vercel domain is used.
- Don't `vercel env pull` into `.env.local`: cloud tokens there make local dev write to production.

## Admin mode

The key button in the footer's bottom bar opens a password prompt (`ADMIN_PASSWORD`, see
`.env.example`; a local test password is in `.env.local`). After sign-in:

- **On the site** a floating bar appears: *Редактировать* (click any text or photo on the page to
  change it, with a live preview), *Тексты* (every string incl. SEO, with search), *Фото*
  (replace any of the 7 photo slots), *Шрифты* (body / heading font). *Опубликовать* (Ctrl+S)
  saves everything and re-renders `/ru` and `/en`; visitors get the new version on the next load.
  Text edits are per language; photos and fonts are shared.
- **`/admin`** shows statistics: visitors, views, Telegram clicks and conversion, time on site,
  countries → cities, OS (Windows / macOS / iOS / iPadOS / Android…), device type, browsers,
  traffic sources, where Telegram is clicked, how far people scroll, recent activity, live count.

How it works:

- `components/analytics/SiteTracker.tsx` sends a pageview, Telegram/phone clicks and, on leave,
  visible time + seen sections to `/api/track`. No cookies; IPs are never stored — a visitor is a
  salted hash of IP + user agent that changes daily. The admin's own visits are not counted.
- Geo: Vercel / Cloudflare headers when present, otherwise a local city database
  (`npm run geo:update` downloads the free DB-IP Lite file; CC BY 4.0, refresh monthly).
- Storage (`lib/admin/backend.ts`) is picked automatically:
  - **Vercel:** Upstash Redis (`KV_REST_API_URL` / `KV_REST_API_TOKEN`, added by the Upstash
    integration) keeps edits, statistics and login throttling; Vercel Blob (`BLOB_READ_WRITE_TOKEN`)
    keeps uploaded photos. Without Redis the site still works, but edits can't be published and
    visits aren't recorded (the dashboard says so).
  - **Own server / dev:** the local `ICG_DATA_DIR` folder (default `.data/`, git-ignored):
    `events/*.ndjson`, `content.json`, `media/` (served by `/api/media/*`).
- Copy edits are applied on top of `messages/*.ts` by `getMessages()`; the code stays the source.

## Motion

- Hero uses CSS-only intro animations (`data-intro`) — never waits for hydration.
- Sections use `data-reveal`; one `IntersectionObserver` (`RevealObserver`) marks them.
  Hidden state only applies under `@media (scripting: enabled)`.
- `prefers-reduced-motion` disables reveals, floats, glows, parallax, the slider hint and
  shortens the audit run.
- Mockups scale via container-query units: inside `.mock-canvas`, Tailwind spacing/text/radius
  tokens are remapped so 1u = 1/80 of the frame width.
