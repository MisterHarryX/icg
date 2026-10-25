"use client";

import { useState } from "react";
import { leadNumber, type LeadView } from "@/lib/leads/types";
import { cn } from "@/lib/utils";
import { inputClass, lastManagerKey, managerKey, rememberManager, type Manager, type UpdateLead } from "./shared";

/** "Кто берёт заявку?" — pick a team member or add a new one, then take / reassign the lead. */
export function AssignPanel({
  lead,
  managers,
  onDone,
  onCancel,
  update,
  onManagersChanged,
}: {
  lead: LeadView;
  managers: Manager[];
  onDone: () => void;
  onCancel: () => void;
  update: UpdateLead;
  onManagersChanged: () => void;
}) {
  const reassign = lead.status === "work" && Boolean(lead.manager);
  const [picked, setPicked] = useState<string | "new">(() => {
    // Taking: whoever this admin picked last time. Reassigning: someone other than the current manager.
    const current = lead.manager ? managerKey(lead.manager) : null;
    const candidates = reassign ? managers.filter((m) => managerKey(m) !== current) : managers;
    const last = lastManagerKey();
    return (candidates.find((m) => managerKey(m) === last) ?? candidates[0])?.id ?? "new";
  });
  const [draft, setDraft] = useState({ name: "", username: "", phone: "" });
  const [busy, setBusy] = useState(false);

  const chosen = managers.find((m) => m.id === picked);
  const preview = picked === "new" ? draft : chosen;

  async function submit() {
    setBusy(true);
    const result = await update(
      lead.id,
      picked === "new"
        ? { assign: { manager: { name: draft.name, username: draft.username || undefined, phone: draft.phone || undefined } } }
        : { assign: { managerId: picked } },
    );
    setBusy(false);
    if (!result) return;
    if (result.manager) rememberManager(managerKey(result.manager));
    if (picked === "new") onManagersChanged();
    onDone();
  }

  return (
    <div className="border-t border-line bg-surface/60 px-4 py-4 sm:px-5">
      <p className="text-[14px] font-medium text-fg">{reassign ? "Передать заявку другому менеджеру" : `Кто берёт заявку ${leadNumber(lead.id)}?`}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {managers.map((manager) => (
          <button
            key={manager.id}
            type="button"
            onClick={() => setPicked(manager.id)}
            aria-pressed={picked === manager.id}
            className={cn(
              "flex h-9 items-center gap-2 rounded-[7px] border px-3 text-[13px] transition-colors",
              picked === manager.id ? "border-blue/70 bg-blue/[0.12] text-fg" : "border-line-strong bg-surface-2 text-fg-2 hover:border-white/20 hover:text-fg",
            )}
          >
            <span className="grid size-5 place-items-center rounded-full bg-white/10 text-[10px] uppercase">{manager.name.slice(0, 1)}</span>
            {manager.name}
            {manager.username && <span className="text-fg-3">@{manager.username}</span>}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPicked("new")}
          aria-pressed={picked === "new"}
          className={cn(
            "h-9 rounded-[7px] border border-dashed px-3 text-[13px] transition-colors",
            picked === "new" ? "border-blue/70 bg-blue/[0.08] text-fg" : "border-line-strong text-fg-3 hover:text-fg",
          )}
        >
          + Новый менеджер
        </button>
      </div>

      {picked === "new" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input className={inputClass} placeholder="Имя" maxLength={60} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className={inputClass} placeholder="@username в Telegram" maxLength={40} value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} />
          <input className={inputClass} placeholder="Телефон (необязательно)" maxLength={30} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        </div>
      )}

      {lead.client ? (
        <p className="mt-3 text-[12px] leading-relaxed text-fg-3">
          Клиенту в Telegram придёт: «Заявка {leadNumber(lead.id)} — в работе. Менеджер: {preview?.name || "…"}
          {preview?.username ? ` · @${preview.username.replace(/^@/, "")}` : ""}
          {preview?.phone ? ` · ${preview.phone}` : ""}».
          {!preview?.username && " Без @username клиент не сможет написать менеджеру сам."}
        </p>
      ) : (
        <p className="mt-3 text-[12px] leading-relaxed text-fg-3">Клиент не подписан на бота — свяжитесь с ним по контакту из заявки.</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy || (picked === "new" && draft.name.trim().length < 2)}
          onClick={submit}
          className="inline-flex h-9 items-center gap-2 rounded-[6px] bg-blue px-4 text-[13px] text-white transition-colors hover:bg-[#4a86ff] disabled:opacity-50"
        >
          {busy && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          {reassign ? "Передать" : "🙋 Взять в работу"}
        </button>
        <button type="button" onClick={onCancel} className="h-9 rounded-[6px] px-3 text-[13px] text-fg-3 transition-colors hover:text-fg">
          Отмена
        </button>
      </div>
    </div>
  );
}
