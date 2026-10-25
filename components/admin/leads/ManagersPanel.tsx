"use client";

import { useState } from "react";
import { inputClass, type Manager } from "./shared";

/** The team list: who can take leads. Group members who press "Взять в работу" appear here by themselves. */
export function ManagersPanel({ managers, onChange }: { managers: Manager[]; onChange: (managers: Manager[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", username: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(method: "POST" | "DELETE", body?: unknown, id?: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/managers${id ? `?id=${encodeURIComponent(id)}` : ""}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await response.json().catch(() => ({}))) as { managers?: Manager[]; message?: string };
      if (!response.ok || !data.managers) throw new Error(data.message || "Не получилось сохранить");
      onChange(data.managers);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[12px] border border-line bg-bg-soft p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-medium text-fg">Менеджеры</h2>
        <span className="text-[12px] text-fg-3">{managers.length}</span>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-fg-3">Их имя и @username клиент увидит, когда заявку возьмут в работу.</p>

      {managers.length > 0 && (
        <ul className="mt-3 grid gap-1.5">
          {managers.map((manager) => (
            <li key={manager.id} className="group flex items-center gap-2.5 rounded-[7px] px-2 py-1.5 transition-colors hover:bg-white/[0.03]">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue/15 text-[12px] text-[#8fb2ff] uppercase">{manager.name.slice(0, 1)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-fg">{manager.name}</span>
                <span className="block truncate text-[12px] text-fg-3">
                  {manager.username ? `@${manager.username}` : "без @username"}
                  {manager.phone && ` · ${manager.phone}`}
                </span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => confirm(`Убрать ${manager.name} из списка? Заявки, которые у него, останутся за ним.`) && call("DELETE", undefined, manager.id)}
                aria-label={`Убрать ${manager.name}`}
                className="grid size-7 place-items-center rounded-full text-fg-3 opacity-60 transition hover:bg-white/[0.06] hover:text-weak hover:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form
          className="mt-3 grid gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await call("POST", draft)) {
              setDraft({ name: "", username: "", phone: "" });
              setAdding(false);
            }
          }}
        >
          <input className={inputClass} placeholder="Имя" maxLength={60} required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className={inputClass} placeholder="@username в Telegram" maxLength={40} value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} />
          <input className={inputClass} placeholder="Телефон (необязательно)" maxLength={30} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="h-9 flex-1 rounded-[6px] bg-blue text-[13px] text-white transition-colors hover:bg-[#4a86ff] disabled:opacity-50">
              Добавить
            </button>
            <button type="button" onClick={() => setAdding(false)} className="h-9 rounded-[6px] px-3 text-[13px] text-fg-3 hover:text-fg">
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 h-9 w-full rounded-[6px] border border-dashed border-line-strong text-[13px] text-fg-3 transition-colors hover:border-white/20 hover:text-fg"
        >
          + Добавить менеджера
        </button>
      )}
      {error && <p className="mt-2 text-[12px] text-weak">{error}</p>}
    </section>
  );
}
