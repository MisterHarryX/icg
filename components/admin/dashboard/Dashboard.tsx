import Link from "next/link";
import type { ReactNode } from "react";
import type { Stats, Totals } from "@/lib/admin/stats";
import { DIRECT, RANGES, type RangeId } from "@/lib/admin/stats";
import { cn } from "@/lib/utils";
import { LiveCount, LogoutButton, TrafficChart } from "./DashboardClient";

const regionNames = new Intl.DisplayNames(["ru"], { type: "region" });

function countryName(code: string) {
  if (!code) return "Не определено";
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

const PLACE_LABELS: Record<string, string> = {
  home: "Первый экран",
  services: "Услуги",
  process: "Как работаем",
  work: "Работы",
  redesign: "Редизайн",
  audit: "Аудит",
  about: "О студии",
  contact: "Контакты",
  header: "Шапка",
  nav: "Меню",
  footer: "Подвал",
  page: "Страница",
};

const DEVICE_LABELS = { desktop: "Компьютер", mobile: "Телефон", tablet: "Планшет" } as const;

const TYPE_LABELS: Record<string, string> = { pageview: "Открыл сайт", telegram: "Перешёл в Telegram", phone: "Нажал на телефон" };

const number = new Intl.NumberFormat("ru-RU");

function duration(seconds: number) {
  if (!seconds) return "—";
  const s = Math.round(seconds);
  if (s < 60) return `${s} с`;
  return `${Math.floor(s / 60)} мин ${String(s % 60).padStart(2, "0")} с`;
}

function percent(value: number) {
  return `${(value * 100).toFixed(value > 0 && value < 0.1 ? 1 : 0)}%`;
}

function delta(current: number, previous: number) {
  if (!previous) return null;
  const change = (current - previous) / previous;
  if (Math.abs(change) < 0.005) return { text: "без изменений", tone: "flat" as const };
  return { text: `${change > 0 ? "↑" : "↓"} ${Math.abs(Math.round(change * 100))}%`, tone: change > 0 ? ("up" as const) : ("down" as const) };
}

function timeFormat(range: RangeId) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: process.env.ADMIN_TZ || "Europe/Moscow",
    ...(range === "today" ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
  });
}

export function Dashboard({
  stats,
  live,
  geoReady,
  editsCount,
  storageReady,
}: {
  stats: Stats;
  live: number;
  geoReady: boolean;
  editsCount: number;
  storageReady: boolean;
}) {
  const { totals, previous } = stats;
  const unknownGeo = stats.countries.find((country) => country.code === "")?.value ?? 0;
  const knownGeo = stats.countries.some((country) => country.code !== "");
  const time = timeFormat(stats.range);

  const kpis: { label: string; value: string; hint?: string; key: keyof Totals; accent?: boolean }[] = [
    { label: "Посетители", value: number.format(totals.visitors), key: "visitors" },
    { label: "Просмотры", value: number.format(totals.pageviews), key: "pageviews" },
    { label: "Переходы в Telegram", value: number.format(totals.telegram), key: "telegram", accent: true },
    { label: "Конверсия в Telegram", value: percent(totals.conversion), key: "conversion", hint: "Доля посетителей, нажавших на Telegram" },
    { label: "Время на сайте", value: duration(totals.avgDuration), key: "avgDuration", hint: "В среднем на посетителя" },
  ];

  return (
    <div className="min-h-dvh pb-20">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-brand text-[12px] tracking-[0.3em] text-fg">ICG</span>
            <span className="text-[13px] text-fg-3">Админ</span>
          </Link>
          <span className="hidden sm:block">
            <LiveCount initial={live} />
          </span>
          <span className="flex-1" />
          <Link href="/ru?edit" className="h-8 rounded-[5px] border border-line-strong bg-surface-2 px-3 text-[13px] leading-8 text-fg-2 transition-colors hover:border-white/20 hover:text-fg">
            Редактировать сайт
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 pt-8 sm:px-6 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-medium tracking-[-0.03em] text-fg sm:text-[32px]">Статистика</h1>
            <p className="mt-1 text-[14px] text-fg-3">Посещения сайта без cookies: IP-адреса не сохраняются.</p>
          </div>
          <nav aria-label="Период" className="flex rounded-[7px] border border-line bg-surface p-1">
            {(Object.entries(RANGES) as [RangeId, { label: string }][]).map(([id, { label }]) => (
              <a
                key={id}
                href={`?range=${id}`}
                aria-current={stats.range === id ? "page" : undefined}
                className={cn(
                  "h-8 rounded-[5px] px-3 text-[13px] leading-8 transition-colors",
                  stats.range === id ? "bg-white/10 text-fg" : "text-fg-3 hover:text-fg",
                )}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="mt-3 sm:hidden">
          <LiveCount initial={live} />
        </div>

        {!storageReady && (
          <p className="mt-6 rounded-[10px] border border-fair/25 bg-fair/[0.06] px-4 py-3 text-[14px] leading-relaxed text-fair">
            Статистика пока не записывается: не подключено хранилище Upstash Redis. Правки сайта и фото работают. Чтобы включить
            статистику, в Vercel откройте проект → Storage → Upstash for Redis → Connect и сделайте Redeploy.
          </p>
        )}

        {storageReady && !stats.hasData && (
          <p className="mt-6 rounded-[10px] border border-line bg-surface px-4 py-3 text-[14px] text-fg-2">
            За этот период посещений пока нет. Как только кто-нибудь откроет сайт, данные появятся здесь.
          </p>
        )}

        {/* KPIs */}
        <section aria-label="Главные цифры" className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line lg:grid-cols-5">
          {kpis.map((kpi, i) => {
            const change = delta(totals[kpi.key], previous[kpi.key]);
            return (
              <div key={kpi.key} className={cn("bg-bg-soft p-4 sm:p-5", i === kpis.length - 1 && "col-span-2 lg:col-span-1")} title={kpi.hint}>
                <p className="text-[13px] text-fg-3">{kpi.label}</p>
                <p className={cn("mt-2 text-[28px] leading-none font-medium tracking-[-0.03em] tabular-nums sm:text-[32px]", kpi.accent ? "text-[#8fb2ff]" : "text-fg")}>
                  {kpi.value}
                </p>
                <p
                  className={cn(
                    "mt-2 text-[12px]",
                    change?.tone === "up" ? "text-good" : change?.tone === "down" ? "text-weak" : "text-fg-3",
                  )}
                >
                  {change ? `${change.text} к прошлому периоду` : "раньше данных не было"}
                </p>
              </div>
            );
          })}
        </section>
        <p className="mt-3 text-[13px] text-fg-3">
          Звонки по телефону: <span className="text-fg-2 tabular-nums">{totals.phone}</span> · Запусков экспресс-аудита:{" "}
          <span className="text-fg-2 tabular-nums">{totals.audits}</span>
          {editsCount > 0 && (
            <>
              {" "}
              · Правок на сайте: <span className="text-fg-2 tabular-nums">{editsCount}</span>
            </>
          )}
        </p>

        <Card title="Посещаемость" className="mt-6">
          <TrafficChart series={stats.series} />
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <Card title="География" note="Страна → город. Нажмите на страну, чтобы увидеть города.">
            {stats.countries.length === 0 ? (
              <Empty />
            ) : (
              <ul className="-mx-2">
                {stats.countries.map((country) => (
                  <li key={country.code || "unknown"}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[6px] px-2 py-2 transition-colors hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                        <span className="grid h-5 w-7 shrink-0 place-items-center rounded-[3px] border border-line-strong text-[10px] font-medium text-fg-2">
                          {country.code || "?"}
                        </span>
                        <Bar label={countryName(country.code)} value={country.value} total={totals.visitors} />
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 shrink-0 text-fg-3 transition-transform duration-200 group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="m6 4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </summary>
                      <ul className="mb-2 ml-12 border-l border-line pl-3">
                        {country.cities.map((city) => (
                          <li key={city.name || "unknown"} className="flex items-center justify-between gap-3 py-1 text-[13px]">
                            <span className={city.name ? "text-fg-2" : "text-fg-3"}>{city.name || "Город не определён"}</span>
                            <span className="text-fg-3 tabular-nums">{city.value}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            )}
            {!geoReady && unknownGeo > 0 && !knownGeo && (
              <p className="mt-4 rounded-[8px] border border-fair/25 bg-fair/[0.06] px-3 py-2.5 text-[12px] leading-relaxed text-fair">
                Страна и город пока не определяются. На Vercel или за Cloudflare это работает само; на своём сервере выполните{" "}
                <code className="text-fg">npm run geo:update</code> (бесплатная база городов DB-IP).
              </p>
            )}
          </Card>

          <div className="grid gap-6">
            <Card title="Устройства">
              <DeviceSplit devices={stats.devices} total={stats.devices.reduce((sum, d) => sum + d.value, 0)} />
              <h3 className="mt-6 mb-2 text-[13px] text-fg-3">Система</h3>
              <Rows rows={stats.os} total={totals.visitors} />
              <h3 className="mt-6 mb-2 text-[13px] text-fg-3">Браузер</h3>
              <Rows rows={stats.browsers} total={totals.visitors} />
            </Card>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card title="Откуда приходят">
            <Rows rows={stats.sources} total={totals.visitors} muted={DIRECT} />
          </Card>
          <Card title="Где нажимают Telegram" note="Блок сайта, в котором была ссылка">
            <Rows rows={stats.telegramPlaces.map((row) => ({ ...row, name: PLACE_LABELS[row.name] ?? row.name }))} total={totals.telegram} accent />
          </Card>
          <Card title="Язык сайта">
            <Rows rows={stats.locales} total={totals.visitors} />
          </Card>
        </div>

        <Card title="До каких блоков доходят" note="Доля посетителей, увидевших блок" className="mt-6">
          {stats.funnelBase === 0 ? (
            <Empty />
          ) : (
            <ol className="grid gap-x-10 gap-y-1 md:grid-cols-2">
              {stats.funnel.map((step, i) => (
                <li key={step.id} className="flex items-center gap-3 py-1.5">
                  <span className="w-5 text-[12px] text-fg-3 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <Bar label={PLACE_LABELS[step.id] ?? step.id} value={step.value} total={stats.funnelBase} showPercent />
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Последние действия" className="mt-6">
          {stats.recent.length === 0 ? (
            <Empty />
          ) : (
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="text-[12px] text-fg-3">
                  <tr className="border-b border-line">
                    <th className="px-5 py-2 font-normal sm:px-6">Время</th>
                    <th className="py-2 font-normal">Действие</th>
                    <th className="py-2 font-normal">Откуда</th>
                    <th className="py-2 font-normal">Устройство</th>
                    <th className="px-5 py-2 font-normal sm:px-6">Источник</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((event, i) => (
                    <tr key={`${event.ts}-${i}`} className="border-b border-line-soft last:border-0">
                      <td className="px-5 py-2.5 whitespace-nowrap text-fg-3 tabular-nums sm:px-6">{time.format(event.ts)}</td>
                      <td className={cn("py-2.5 whitespace-nowrap", event.type === "telegram" ? "text-[#8fb2ff]" : "text-fg-2")}>
                        {TYPE_LABELS[event.type] ?? event.type}
                        {event.place && event.type !== "pageview" && <span className="text-fg-3"> · {PLACE_LABELS[event.place] ?? event.place}</span>}
                      </td>
                      <td className="py-2.5 text-fg-2">
                        {event.country ? countryName(event.country) : <span className="text-fg-3">—</span>}
                        {event.city && <span className="text-fg-3">, {event.city}</span>}
                      </td>
                      <td className="py-2.5 whitespace-nowrap text-fg-2">
                        {event.os} <span className="text-fg-3">· {event.browser} · {DEVICE_LABELS[event.device]}</span>
                      </td>
                      <td className="px-5 py-2.5 text-fg-3 sm:px-6">{event.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

function Card({ title, note, className, children }: { title: string; note?: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-[12px] border border-line bg-bg-soft p-5 sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[15px] font-medium text-fg">{title}</h2>
        {note && <p className="text-[12px] text-fg-3">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="py-6 text-center text-[13px] text-fg-3">Пока нет данных</p>;
}

function Bar({ label, value, total, accent, muted, showPercent }: { label: string; value: number; total: number; accent?: boolean; muted?: boolean; showPercent?: boolean }) {
  const share = total ? value / total : 0;
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className={cn("truncate", muted ? "text-fg-3" : "text-fg-2")}>{label}</span>
        <span className="shrink-0 text-fg-3 tabular-nums">
          {showPercent ? percent(share) : number.format(value)}
          {!showPercent && total > 0 && <span className="ml-2 inline-block w-9 text-right text-fg-3/70">{percent(share)}</span>}
        </span>
      </span>
      <span className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <span className={cn("block h-full origin-left rounded-full", accent ? "bg-blue" : "bg-white/45")} style={{ transform: `scaleX(${Math.min(1, share)})` }} />
      </span>
    </span>
  );
}

function Rows({ rows, total, accent, muted }: { rows: { name: string; value: number }[]; total: number; accent?: boolean; muted?: string }) {
  if (rows.length === 0) return <Empty />;
  return (
    <ul className="grid gap-2.5">
      {rows.map((row) => (
        <li key={row.name} className="flex">
          <Bar label={row.name} value={row.value} total={total} accent={accent} muted={row.name === muted} />
        </li>
      ))}
    </ul>
  );
}

function DeviceSplit({ devices, total }: { devices: { name: keyof typeof DEVICE_LABELS; value: number }[]; total: number }) {
  const tones = { desktop: "bg-white/70", mobile: "bg-blue", tablet: "bg-violet" } as const;
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]">
        {total > 0 && devices.map((device) => <span key={device.name} className={tones[device.name]} style={{ width: `${(device.value / total) * 100}%` }} />)}
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {devices.map((device) => (
          <li key={device.name}>
            <span className="flex items-center gap-1.5 text-[12px] text-fg-3">
              <span className={cn("size-2 rounded-[2px]", tones[device.name])} />
              {DEVICE_LABELS[device.name]}
            </span>
            <span className="mt-1 block text-[18px] font-medium text-fg tabular-nums">{total ? percent(device.value / total) : "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
