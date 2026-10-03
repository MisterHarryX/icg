"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLogin";
import { cn } from "@/lib/utils";

/** "Active in the last 5 minutes", refreshed every 15 s. */
export function LiveCount({ initial }: { initial: number }) {
  const [live, setLive] = useState(initial);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/admin/live", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { live: number } | null) => data && setLive(data.live))
        .catch(() => {});
    }, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-fg-2" title="Посетители, активные за последние 5 минут">
      <span className="relative flex size-2">
        {live > 0 && <span className="absolute inset-0 animate-ping rounded-full bg-good/60" />}
        <span className={cn("relative size-2 rounded-full", live > 0 ? "bg-good" : "bg-fg-3")} />
      </span>
      Сейчас на сайте: <span className="text-fg tabular-nums">{live}</span>
    </span>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
        router.push("/");
      }}
      className="h-8 rounded-[5px] px-2.5 text-[13px] text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
    >
      Выйти
    </button>
  );
}

export function LoginScreen() {
  const router = useRouter();
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-[360px]">
        <p className="font-brand text-[11px] tracking-[0.3em] text-fg-3">ICG</p>
        <h1 className="mt-2 text-[24px] font-medium tracking-[-0.02em] text-fg">Вход для администратора</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-2">Статистика посещений и редактирование сайта.</p>
        <div className="mt-7">
          <AdminLoginForm onSuccess={() => router.refresh()} />
        </div>
        <Link href="/" className="mt-6 inline-block text-[13px] text-fg-3 transition-colors hover:text-fg">
          ← На сайт
        </Link>
      </div>
    </main>
  );
}

type Point = { key: string; label: string; visitors: number; pageviews: number; telegram: number };

/** Visitors as bars, Telegram clicks as a line; hover/tap shows the numbers for a bucket. */
export function TrafficChart({ series }: { series: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const width = 1000;
  const height = 240;
  const pad = { top: 16, bottom: 28 };
  const max = Math.max(4, ...series.map((point) => Math.max(point.visitors, point.telegram)));
  const step = width / series.length;
  const barWidth = Math.max(2, Math.min(28, step * 0.62));
  const y = (value: number) => pad.top + (height - pad.top - pad.bottom) * (1 - value / max);
  const labelEvery = Math.ceil(series.length / 10);
  const linePath = series.map((point, i) => `${i ? "L" : "M"}${(i + 0.5) * step},${y(point.telegram)}`).join(" ");
  const shown = active !== null ? series[active] : null;

  function pick(clientX: number) {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect) return;
    const index = Math.floor(((clientX - rect.left) / rect.width) * series.length);
    setActive(Math.min(series.length - 1, Math.max(0, index)));
  }

  return (
    <div className="relative">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px] bg-white/70" /> Посетители
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-blue" /> Переходы в Telegram
        </span>
        <span className="ml-auto min-h-[18px] text-fg-2 tabular-nums">
          {shown ? (
            <>
              <span className="text-fg">{shown.label}</span> · {shown.visitors} посет. · {shown.pageviews} просм. · <span className="text-[#8fb2ff]">{shown.telegram} в Telegram</span>
            </>
          ) : (
            "Наведите на столбец"
          )}
        </span>
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block h-[220px] w-full touch-none select-none"
        onPointerMove={(event) => pick(event.clientX)}
        onPointerDown={(event) => pick(event.clientX)}
        onPointerLeave={() => setActive(null)}
        role="img"
        aria-label="График посещений"
      >
        {[0.25, 0.5, 0.75, 1].map((fraction) => (
          <line key={fraction} x1="0" x2={width} y1={y(max * fraction)} y2={y(max * fraction)} stroke="rgb(255 255 255 / 0.05)" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1="0" x2={width} y1={y(0)} y2={y(0)} stroke="rgb(255 255 255 / 0.12)" vectorEffect="non-scaling-stroke" />
        {series.map((point, i) => (
          <rect
            key={point.key}
            x={(i + 0.5) * step - barWidth / 2}
            y={y(point.visitors)}
            width={barWidth}
            height={Math.max(0, y(0) - y(point.visitors))}
            rx="2"
            fill={active === i ? "rgb(255 255 255 / 0.9)" : "rgb(255 255 255 / 0.55)"}
          />
        ))}
        <path d={linePath} fill="none" stroke="#3a7bff" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {active !== null && <line x1={(active + 0.5) * step} x2={(active + 0.5) * step} y1={pad.top} y2={y(0)} stroke="rgb(255 255 255 / 0.18)" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="mt-2 flex text-[11px] text-fg-3 tabular-nums">
        {series.map((point, i) => (
          <span key={point.key} className="flex-1 text-center">
            {i % labelEvery === 0 ? point.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
