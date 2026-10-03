import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getBaseMessages } from "@/lib/i18n/messages";

/**
 * Link preview card (Telegram, WhatsApp, VK…), 1200×630: the ICG logo, one
 * line of text and a short accent rule, on the site's black. Rendered at build
 * time. Fonts and the logo live in /assets (not served publicly).
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ICG";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const asset = (...parts: string[]) => readFile(join(process.cwd(), "assets", ...parts));

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "ru";
  const [t, logo, inter] = await Promise.all([getBaseMessages(locale), asset("og", "icg-logo.png"), asset("fonts", "Inter-Medium.ttf")]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", padding: 26, background: "#000" }}>
        <div
          style={{
            position: "relative",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 26,
            border: "1px solid rgba(255,255,255,0.09)",
            background: "#040507",
          }}
        >
          {/* Thin blue glint along the top edge */}
          <div
            style={{
              position: "absolute",
              top: -1,
              left: 40,
              width: 280,
              height: 1,
              background: "linear-gradient(90deg, rgba(58,123,255,0), #3a7bff, rgba(58,123,255,0))",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
          <img src={logoSrc} width={840} height={329} alt="" style={{ marginTop: -18 }} />
          <div style={{ marginTop: 6, fontSize: 42, color: "#f3f4f7", fontFamily: "Inter", letterSpacing: -0.5 }}>{t.meta.ogImageText}</div>
          <div
            style={{
              marginTop: 30,
              width: 190,
              height: 3,
              borderRadius: 2,
              background: "linear-gradient(90deg, #3cc8ff, #3a7bff, #8b5cf6)",
            }}
          />
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Inter", data: inter, weight: 500, style: "normal" }] },
  );
}
