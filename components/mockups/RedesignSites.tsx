import type { Messages } from "@/messages/ru";
import { lines } from "@/lib/utils";
import { Photo } from "./Photo";

type BeforeCopy = Messages["mockups"]["before"];
type AfterCopy = Messages["mockups"]["after"];

/* ------------------------------------------------------------------ */
/* BEFORE — deliberately dated: clutter, mixed fonts, weak CTA.         */
/* ------------------------------------------------------------------ */

const oldBg = {
  backgroundColor: "#fdf3d6",
  backgroundImage:
    "repeating-linear-gradient(45deg, rgb(255 170 210 / 0.35) 0 calc(var(--u) * 0.6), transparent 0 calc(var(--u) * 1.2))",
};

const bevel = "border-[calc(var(--u)*0.25)] border-t-[#fff] border-l-[#fff] border-r-[#8a8a8a] border-b-[#8a8a8a]";
const comic = { fontFamily: '"Comic Sans MS", "Comic Neue", cursive' };
const times = { fontFamily: '"Times New Roman", Times, serif' };

function Sparkle({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M10 0l2.4 7.6L20 10l-7.6 2.4L10 20l-2.4-7.6L0 10l7.6-2.4z" fill="#ffd400" stroke="#ff3fa4" strokeWidth="1" />
    </svg>
  );
}

export function BeforeSite({ t }: { t: BeforeCopy }) {
  return (
    <div className="flex h-full flex-col text-[#222]" style={{ ...oldBg, ...times }}>
      <div className="flex items-center justify-between bg-[linear-gradient(#b0137a,#6d0a4b)] px-3 py-2.5 text-white">
        <div className="flex items-center gap-2.5">
          <Sparkle className="size-8" />
          <div>
            <div className="text-3xl font-bold italic [text-shadow:2px_2px_0_#000]">{t.brand}</div>
            <div className="text-sm text-[#ffe36e]" style={comic}>
              {t.slogan}
            </div>
          </div>
        </div>
        <div className="text-xs font-bold text-[#ffe36e]">{t.phone}</div>
      </div>

      <div className="flex flex-wrap gap-x-1 bg-[#dcdcdc] px-2 py-1 text-xs" style={{ fontFamily: "Verdana, sans-serif" }}>
        {t.nav.map((item, i) => (
          <span key={item}>
            <span className="text-[#0000ee] underline">{item}</span>
            {i < t.nav.length - 1 && <span className="px-1 text-[#777]">|</span>}
          </span>
        ))}
      </div>

      <div
        className="animate-[blink-old_1.2s_steps(1)_infinite] bg-[#ff0000] py-1 text-center text-base font-bold text-[#ffff00]"
        style={{ fontFamily: "Impact, sans-serif" }}
      >
        ★ {t.sale} ★
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[calc(var(--u)*15)_1fr_calc(var(--u)*14)] gap-2 p-2">
        <div className={`flex flex-col gap-2 bg-[#e8e8ff] p-1.5 ${bevel}`}>
          <div>
            <div className="bg-[#000080] px-1 text-xs font-bold text-white">{t.news}</div>
            {t.newsItems.map((item) => (
              <div key={item} className="mt-1 text-xs text-[#0000ee] underline">
                » {item}
              </div>
            ))}
          </div>
          <div>
            <div className="bg-[#006400] px-1 text-xs font-bold text-white">{t.servicesTitle}</div>
            {t.services.map((item) => (
              <div key={item} className="mt-0.5 text-xs" style={comic}>
                ✿ {item}
              </div>
            ))}
          </div>
          <div className="mt-auto text-center text-sm font-bold text-[#c00]" style={comic}>
            NEW!!!
          </div>
        </div>

        <div className="flex min-h-0 flex-col bg-white/80 p-2 text-center">
          <div className="text-3xl leading-tight font-black text-[#7a1fa2] uppercase" style={{ fontFamily: '"Arial Black", Arial, sans-serif' }}>
            {t.welcome}
          </div>
          <div className="mt-2 flex gap-2">
            <div className="h-[calc(var(--u)*10)] w-[calc(var(--u)*13)] shrink-0 overflow-hidden border-[calc(var(--u)*0.35)] border-[#b8860b] saturate-200 contrast-125 [border-style:ridge]">
              <div className="relative size-full">
                <Photo id="salonStock" sizes="160px" />
              </div>
            </div>
            <p className="text-left text-sm leading-snug">{t.text}</p>
          </div>
          <div className="mt-1 self-end text-xs text-[#0000ee] underline">{t.more}</div>
          <div className="mt-auto">
            <div className="text-left text-xs font-bold text-[#b0137a] underline">{t.gallery}:</div>
            <div className="mt-1 grid grid-cols-5 gap-1">
              {["#ffb6c1", "#dda0dd", "#f0e68c", "#98fb98", "#87cefa"].map((color) => (
                <span key={color} className="h-[calc(var(--u)*4.5)] border-2 border-[#666]" style={{ background: `linear-gradient(135deg, ${color}, #fff 55%, ${color})` }} />
              ))}
            </div>
          </div>
        </div>

        <div className={`flex flex-col items-center gap-2 bg-[#ffffe0] p-1.5 ${bevel}`}>
          <Sparkle className="size-6" />
          <div className="text-center text-xs" style={comic}>
            {t.counter}
          </div>
          <div className="bg-black px-1.5 py-0.5 font-mono text-sm text-[#00ff00]">000137</div>
          <Sparkle className="size-4" />
          <div className="text-center text-2xs text-[#555]">{t.phone}</div>
          <div className={`mt-auto w-full bg-[#dcdcdc] py-0.5 text-center text-2xs ${bevel}`} style={{ fontFamily: "Verdana, sans-serif" }}>
            {t.nav[6]}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BeforeMobile({ t }: { t: BeforeCopy }) {
  // The old site isn't responsive: a squeezed desktop page.
  return (
    <div className="flex h-full flex-col text-[#222]" style={{ ...oldBg, ...times }}>
      <div className="bg-[linear-gradient(#b0137a,#6d0a4b)] px-2 pt-8 pb-1.5 text-white">
        <div className="text-sm font-bold italic [text-shadow:1px_1px_0_#000]">{t.brand}</div>
        <div className="text-3xs text-[#ffe36e]" style={comic}>
          {t.slogan}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-1 bg-[#dcdcdc] px-1 py-0.5 text-3xs" style={{ fontFamily: "Verdana, sans-serif" }}>
        {t.nav.map((item) => (
          <span key={item} className="text-[#0000ee] underline">
            {item}
          </span>
        ))}
      </div>
      <div className="bg-[#ff0000] py-0.5 text-center text-2xs font-bold text-[#ffff00]" style={{ fontFamily: "Impact, sans-serif" }}>
        {t.sale}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-1.5">
        <div className="text-center text-sm font-black text-[#7a1fa2] uppercase" style={{ fontFamily: '"Arial Black", Arial, sans-serif' }}>
          {t.welcome}
        </div>
        <div className="flex gap-1.5">
          <div className="h-[calc(var(--u)*6)] w-[calc(var(--u)*7)] shrink-0 overflow-hidden border border-[#b8860b] saturate-200">
            <div className="relative size-full">
              <Photo id="salonStock" sizes="80px" />
            </div>
          </div>
          <p className="text-3xs leading-snug">{t.text}</p>
        </div>
        <div className="self-end text-3xs text-[#0000ee] underline">{t.more}</div>
        <div className={`bg-[#e8e8ff] p-1 ${bevel}`}>
          <div className="bg-[#000080] px-1 text-3xs font-bold text-white">{t.news}</div>
          {t.newsItems.map((item) => (
            <div key={item} className="mt-0.5 text-3xs text-[#0000ee] underline">
              » {item}
            </div>
          ))}
        </div>
        <div className={`bg-[#e8ffe8] p-1 ${bevel}`}>
          <div className="bg-[#006400] px-1 text-3xs font-bold text-white">{t.servicesTitle}</div>
          {t.services.map((item) => (
            <div key={item} className="mt-0.5 text-3xs" style={comic}>
              ✿ {item}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {["#ffb6c1", "#dda0dd", "#f0e68c"].map((color) => (
            <span key={color} className="h-[calc(var(--u)*3.5)] border border-[#666]" style={{ background: `linear-gradient(135deg, ${color}, #fff 55%, ${color})` }} />
          ))}
        </div>
        <div className="text-center text-3xs text-[#555]">{t.phone}</div>
        <div className="text-center text-3xs" style={comic}>
          {t.counter} 000137
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AFTER — clear hierarchy, one type system, obvious booking CTA.       */
/* ------------------------------------------------------------------ */

function AfterTitle({ text, className }: { text: string; className: string }) {
  return (
    <div className={`font-serif leading-[0.98] tracking-[-0.025em] ${className}`}>
      {lines(text).map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </div>
  );
}

export function AfterSite({ t }: { t: AfterCopy }) {
  return (
    <div className="grid h-full grid-cols-[0.9fr_1.1fr] bg-[#faf6f4] text-[#2b1f22]">
      <div className="relative min-h-0 overflow-hidden">
        <Photo id="beautyPortrait" sizes="(min-width: 1024px) 420px, 45vw" className="object-[50%_25%]" />
        <span className="absolute top-5 left-6 font-serif text-xl tracking-[0.3em] text-[#f4efe9]">{t.brand}</span>
      </div>
      <div className="flex flex-col px-8 py-5">
        <div className="flex items-center justify-end gap-6">
          <div className="flex gap-5 text-xs opacity-60">
            {t.nav.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <span className="rounded-full border border-[#2b1f22]/20 px-3.5 py-1.5 text-2xs">{t.button}</span>
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <span className="text-2xs tracking-[0.28em] text-[#a0707a] uppercase">{t.eyebrow}</span>
          <AfterTitle text={t.title} className="mt-3 text-6xl" />
          <p className="mt-4 max-w-[22em] text-sm opacity-65">{t.text}</p>
          <span className="mt-7 w-fit rounded-full bg-[#2b1f22] px-6 py-3 text-sm text-white shadow-[0_10px_24px_-10px_rgb(43_31_34/0.6)]">
            {t.button} →
          </span>
        </div>
        <div className="flex gap-2">
          {t.services.map((service) => (
            <span key={service} className="rounded-full border border-[#2b1f22]/15 px-3 py-1.5 text-2xs">
              {service}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AfterMobile({ t }: { t: AfterCopy }) {
  return (
    <div className="flex h-full flex-col bg-[#faf6f4] text-[#2b1f22]">
      <div className="flex items-center justify-between px-5 pt-10 pb-3">
        <span className="font-serif text-base tracking-[0.3em]">{t.brand}</span>
        <span className="flex flex-col gap-1" aria-hidden="true">
          <span className="block h-px w-5 bg-[#2b1f22]" />
          <span className="block h-px w-5 bg-[#2b1f22]" />
        </span>
      </div>
      <div className="relative mx-4 h-[40%] overflow-hidden rounded-3xl">
        <Photo id="beautyPortrait" sizes="(min-width: 640px) 200px, 40vw" className="object-[50%_25%]" />
      </div>
      <div className="flex flex-1 flex-col px-5 pt-5">
        <span className="text-3xs tracking-[0.28em] text-[#a0707a] uppercase">{t.eyebrow}</span>
        <AfterTitle text={t.title} className="mt-2 text-3xl" />
        <p className="mt-3 text-xs opacity-65">{t.text}</p>
        <span className="mt-auto mb-6 rounded-full bg-[#2b1f22] py-3.5 text-center text-sm text-white">{t.button}</span>
      </div>
    </div>
  );
}
