import "server-only";
import { userAgent, type NextRequest } from "next/server";
import type { DeviceType } from "@/lib/analytics/types";

const OS_NAMES: Record<string, string> = {
  "Mac OS": "macOS",
  "Chrome OS": "ChromeOS",
  "Chromium OS": "ChromeOS",
  Ubuntu: "Linux",
  Debian: "Linux",
  Fedora: "Linux",
  Arch: "Linux",
};

const BROWSER_NAMES: Record<string, string> = {
  "Mobile Safari": "Safari",
  "Chrome Headless": "Chrome",
  "Chrome WebView": "Chrome",
  "Mobile Chrome": "Chrome",
  "Mobile Firefox": "Firefox",
  "Opera Touch": "Opera",
  "Opera Mobi": "Opera",
  "Opera GX": "Opera",
  "Samsung Internet": "Samsung",
  Yandex: "Яндекс Браузер",
  "Yandex Browser": "Яндекс Браузер",
};

export type DeviceInfo = { os: string; device: DeviceType; browser: string; isBot: boolean };

/** OS / device type / browser from the User-Agent, with an iPad fix-up from touch points. */
export function deviceInfo(request: NextRequest, touchPoints = 0): DeviceInfo {
  const ua = userAgent(request);
  let os = ua.os.name ? (OS_NAMES[ua.os.name] ?? ua.os.name) : "Другое";
  let device: DeviceType = ua.device.type === "mobile" ? "mobile" : ua.device.type === "tablet" ? "tablet" : "desktop";

  if (os === "iOS" && device === "tablet") os = "iPadOS";
  // iPadOS 13+ reports itself as a Mac; a Mac has no touch screen.
  if (os === "macOS" && touchPoints > 1) {
    os = "iPadOS";
    device = "tablet";
  }

  const rawBrowser = ua.browser.name ?? "Другой";
  const browser = BROWSER_NAMES[rawBrowser] ?? rawBrowser;
  const botLike = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|monitor/i.test(ua.ua);

  return { os, device, browser, isBot: ua.isBot || botLike };
}
