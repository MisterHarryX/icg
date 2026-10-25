"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LEAD_STATUSES,
  SERVICE_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  leadNumber,
  type LeadStatus,
  type LeadView,
} from "@/lib/leads/types";
import type { BotStatus } from "@/lib/telegram/setup";
import { cn } from "@/lib/utils";
import { BotPanel } from "./BotPanel";

type Filter = "all" | LeadStatus;

const STATUS_TONE: Record<LeadStatus, string> = {
  new: "border-blue/40 bg-blue/[0.12] text-[#8fb2ff]",
  work: "border-fair/35 bg-fair/[0.1] text-fair",
  done: "border-good/35 bg-good/[0.1] text-good",
  rejected: "border-line-strong bg-white/[0.04] text-fg-3",
};

const STATUS_DOT: Record<LeadStatus, string> = { new: "bg-blue", work: "bg-fair", done: "bg-good", rejected: "bg-fg-3" };

const ACTOR_LABELS = { client: "Клиент", manager: "Менеджер", admin: "Сайт", api: "API", system: "Система" } as const;

/** Leads from the site and the bot. Polls every 15 s so changes made in Telegram show up here. */
export function LeadsBoard({
  initialLeads,
  storageReady,
  initialBot,
  timeZone,
  focusId,
  renderedAt,
}: {
  renderedAt: number;
  initialLeads: LeadView[];
  storageReady: boolean;
  initialBot: BotStatus;
  timeZone: string;
  focusId?: number;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(renderedAt);
  const [expanded, setExpanded] = useState<number | null>(focusId ?? null);

  const time = useMemo(() => new Intl.DateTimeFormat("ru-RU", { timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), [timeZone]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/leads", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { leads: LeadView[] };
      setLeads(data.leads);
      setSynced(Date.now());
    } catch {
      // Offline for a moment; the next tick retries.
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15_000);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Opened from the "В админке" button of a Telegram card.
  const focused = useRef(false);
  useEffect(() => {
    if (!focusId || focused.current) return;
    focused.current = true;
    document.getElementById(`lead-${focusId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusId]);

  async function update(id: number, body: { status?: LeadStatus; note?: string }) {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { lead?: LeadView };
      if (!response.ok || !data.lead) throw new Error();
      setLeads((current) => current.map((lead) => (lead.id === id ? data.lead! : lead)));
    } catch {
      setError("Не получилось сохранить. Обновите страницу и попробуйте ещё раз.");
    } finally {
      setBusy(null);
    }
  }

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: leads.length, new: 0, work: 0, done: 0, rejected: 0 };
    for (const lead of leads) result[lead.status] += 1;
    return result;
  }, [leads]);

  const weekCount = useMemo(() => {
    const weekAgo = synced - 7 * 86_400_000;
    return leads.filter((lead) => lead.createdAt >= weekAgo).length;
  }, [leads, synced]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (filter !== "all" && lead.status !== filter) return false;
      if (!q) return true;
      return [leadNumber(lead.id), String(lead.id), lead.name, lead.contact, lead.message, lead.client?.username ?? "", lead.manager?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [leads, filter, query]);

  const kpis = [
    { label: "Новые", value: counts.new, tone: "text-[#8fb2ff]" },
    { label: "В работе", value: counts.work, tone: "text-fair" },
    { label: "Готово", value: counts.done, tone: "text-good" },
    { label: "За 7 дней", value: weekCount, tone: "text-fg" },
  ];

  return (
    <main className="mx-auto max-w-[1240px] px-4 pt-8 sm:px-6 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-medium tracking-[-0.03em] text-fg sm:text-[32px]">Заявки</h1>
          <p className="mt-1 text-[14px] text-fg-3">С сайта и из Telegram-бота. Статусы синхронизируются с группой менеджеров.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex h-8 items-center gap-2 rounded-[5px] border border-line-strong bg-surface-2 px-3 text-[13px] text-fg-2 transition-colors hover:border-white/20 hover:text-fg"
        >
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-good/50" />
            <span className="relative size-2 rounded-full bg-good" />
          </span>
          Синхронизация · {new Intl.DateTimeFormat("ru-RU", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(synced)}
        </button>
      </div>

      {!storageReady && (
        <p className="mt-6 rounded-[10px] border border-fair/25 bg-fair/[0.06] px-4 py-3 text-[14px] leading-relaxed text-fair">
          Заявки не сохраняются: не подключено хранилище Upstash Redis.
        </p>
      )}

      <section aria-label="Сводка" className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-bg-soft p-4 sm:p-5">
            <p className="text-[13px] text-fg-3">{kpi.label}</p>
            <p className={cn("mt-2 text-[28px] leading-none font-medium tracking-[-0.03em] tabular-nums sm:text-[32px]", kpi.tone)}>{kpi.value}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <nav aria-label="Статус" className="flex overflow-x-auto rounded-[7px] border border-line bg-surface p-1 [scrollbar-width:none]">
              {(["all", ...LEAD_STATUSES] as Filter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-1.5 rounded-[5px] px-3 text-[13px] transition-colors",
                    filter === key ? "bg-white/10 text-fg" : "text-fg-3 hover:text-fg",
                  )}
                >
                  {key === "all" ? "Все" : STATUS_LABELS[key]}
                  <span className="text-[11px] text-fg-3 tabular-nums">{counts[key]}</span>
                </button>
              ))}
            </nav>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск: имя, телефон, номер…"
              className="h-10 w-full rounded-[7px] border border-line bg-surface px-3 text-[14px] text-fg placeholder:text-fg-3 focus:border-blue/60 focus:outline-none sm:w-64"
            />
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-[8px] border border-weak/30 bg-weak/[0.08] px-3.5 py-2.5 text-[13px] text-weak">
              {error}
            </p>
          )}

          {visible.length === 0 ? (
            <div className="mt-4 rounded-[12px] border border-line bg-bg-soft px-6 py-14 text-center">
              <p className="text-[15px] text-fg-2">{leads.length === 0 ? "Заявок пока нет" : "Ничего не найдено"}</p>
              <p className="mt-1 text-[13px] text-fg-3">
                {leads.length === 0 ? "Они появятся здесь, как только кто-то заполнит форму на сайте или в боте." : "Измените фильтр или запрос."}
              </p>
            </div>
          ) : (
            <ul className="mt-4 grid gap-3">
              {visible.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  time={time}
                  busy={busy === lead.id}
                  open={expanded === lead.id}
                  highlight={focusId === lead.id}
                  onToggle={() => setExpanded((current) => (current === lead.id ? null : lead.id))}
                  onStatus={(status) => update(lead.id, { status })}
                  onNote={(note) => update(lead.id, { note })}
                />
              ))}
            </ul>
          )}
        </div>

        <BotPanel initial={initialBot} />
      </div>
    </main>
  );
}

function contactHref(contact: string) {
  const username = contact.match(/^@([A-Za-z0-9_]{4,32})$/)?.[1];
  if (username) return `https://t.me/${username}`;
  if (contact.includes("@")) return `mailto:${contact}`;
  return `tel:${contact.replace(/[^\d+]/g, "")}`;
}

function LeadCard({
  lead,
  time,
  busy,
  open,
  highlight,
  onToggle,
  onStatus,
  onNote,
}: {
  lead: LeadView;
  time: Intl.DateTimeFormat;
  busy: boolean;
  open: boolean;
  highlight: boolean;
  onToggle: () => void;
  onStatus: (status: LeadStatus) => void;
  onNote: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <li
      id={`lead-${lead.id}`}
      className={cn(
        "rounded-[12px] border bg-bg-soft transition-[border-color,opacity]",
        highlight ? "border-blue/50" : "border-line",
        lead.status === "rejected" && "opacity-70",
        busy && "opacity-60",
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-mono text-[13px] text-fg-2">{leadNumber(lead.id)}</span>
          <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[12px]", STATUS_TONE[lead.status])}>
            <span className={cn("size-1.5 rounded-full", STATUS_DOT[lead.status])} />
            {STATUS_LABELS[lead.status]}
          </span>
          <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-fg-3">{SOURCE_LABELS[lead.source]}</span>
          {lead.client && (
            <span className="rounded-full border border-[#2aabee]/30 bg-[#2aabee]/10 px-2 py-0.5 text-[11px] text-[#7fd0f7]" title="Клиент получает уведомления в боте">
              🔔 в Telegram
            </span>
          )}
          <span className="ml-auto text-[12px] text-fg-3 tabular-nums">{time.format(lead.createdAt)}</span>
        </div>

        <div className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="truncate text-[17px] font-medium text-fg">{lead.name}</p>
            <p className="mt-0.5 flex flex-wrap gap-x-3 text-[14px]">
              <a href={contactHref(lead.contact)} target={lead.contact.startsWith("@") ? "_blank" : undefined} rel="noreferrer" className="text-[#8fb2ff] hover:underline">
                {lead.contact}
              </a>
              {lead.client?.username && lead.contact !== `@${lead.client.username}` && (
                <a href={`https://t.me/${lead.client.username}`} target="_blank" rel="noreferrer" className="text-fg-3 hover:text-fg">
                  @{lead.client.username}
                </a>
              )}
            </p>
          </div>
          <p className="text-[13px] text-fg-2 sm:text-right">
            {SERVICE_LABELS[lead.service]}
            {lead.manager && <span className="block text-fg-3">Менеджер: {lead.manager.name}</span>}
          </p>
        </div>

        {lead.message && <p className={cn("mt-3 text-[14px] leading-relaxed whitespace-pre-line text-fg-2", !open && "line-clamp-3")}>{lead.message}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-[7px] border border-line bg-surface p-0.5" role="group" aria-label="Статус">
            {LEAD_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                disabled={busy || lead.status === status}
                onClick={() => onStatus(status)}
                className={cn(
                  "h-7 rounded-[5px] px-2.5 text-[12px] transition-colors disabled:cursor-default",
                  lead.status === status ? "bg-white/10 text-fg" : "text-fg-3 hover:text-fg",
                )}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
          <button type="button" onClick={onToggle} aria-expanded={open} className="ml-auto h-7 rounded-[5px] px-2 text-[12px] text-fg-3 transition-colors hover:text-fg">
            {open ? "Свернуть" : `История · ${lead.history.length}`}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <ol className="grid gap-2.5">
            {lead.history.map((event, i) => (
              <li key={`${event.ts}-${i}`} className="flex gap-3 text-[13px]">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-white/25" />
                <span className="min-w-0 flex-1">
                  <span className="text-fg-2">
                    {event.action === "created" && "Заявка создана"}
                    {event.action === "status" && <>Статус: {event.status ? STATUS_LABELS[event.status] : event.text}</>}
                    {event.action === "linked" && "Клиент подписался на уведомления в Telegram"}
                    {event.action === "note" && <span className="whitespace-pre-line text-fg">{event.text}</span>}
                  </span>
                  <span className="block text-[12px] text-fg-3">
                    {event.by.name} · {ACTOR_LABELS[event.by.kind]} · {time.format(event.ts)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!note.trim()) return;
              onNote(note);
              setNote("");
            }}
          >
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Заметка для команды…"
              maxLength={1000}
              className="h-9 min-w-0 flex-1 rounded-[6px] border border-line-strong bg-surface-2 px-3 text-[13px] text-fg placeholder:text-fg-3 focus:border-blue/60 focus:outline-none"
            />
            <button type="submit" disabled={busy || !note.trim()} className="h-9 rounded-[6px] bg-blue px-3 text-[13px] text-white transition-colors hover:bg-[#4a86ff] disabled:opacity-50">
              Добавить
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
