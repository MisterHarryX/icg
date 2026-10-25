"use client";

import { useState, type ReactNode } from "react";
import type { BotStatus } from "@/lib/telegram/setup";
import { cn } from "@/lib/utils";

/** Telegram bot connection: webhook, managers' group, bind code. */
export function BotPanel({ initial }: { initial: BotStatus }) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "good" | "weak"; text: string } | null>(null);
  const [bind, setBind] = useState<{ code: string; expiresAt: number } | null>(null);
  const [copied, setCopied] = useState(false);

  async function call(action: "setup" | "bind-code" | "unbind" | "status") {
    setBusy(action);
    setMessage(null);
    try {
      const response =
        action === "status"
          ? await fetch("/api/admin/telegram", { cache: "no-store" })
          : await fetch("/api/admin/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = (await response.json().catch(() => ({}))) as Partial<BotStatus> & {
        error?: string;
        status?: BotStatus;
        code?: string;
        expiresAt?: number;
      };
      if (!response.ok) throw new Error(data.error || "Ошибка");
      if (action === "status") setStatus(data as BotStatus);
      if (data.status) setStatus(data.status);
      if (action === "setup") setMessage({ tone: "good", text: "Бот подключён к сайту: webhook, команды и описание обновлены." });
      if (action === "bind-code" && data.code && data.expiresAt) setBind({ code: data.code, expiresAt: data.expiresAt });
      if (action === "unbind") setMessage({ tone: "good", text: "Группа отключена." });
    } catch (error) {
      setMessage({ tone: "weak", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(null);
    }
  }

  const command = bind ? `/bind@${status.username ?? "bot"} ${bind.code}` : "";

  return (
    <aside className="grid gap-4 rounded-[12px] border border-line bg-bg-soft p-5 lg:sticky lg:top-20">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#2aabee] text-white">
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
            <path d="M21.6 4.2 2.9 11.4c-1.3.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.8.8s.6-.2.9-.5l2.4-2.3 4.9 3.6c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.5-1.5zM9.7 14.3l8.6-7.7c.4-.3-.1-.5-.6-.2L7.3 13.1" />
          </svg>
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium text-fg">Telegram-бот</h2>
          {status.username ? (
            <a href={`https://t.me/${status.username}`} target="_blank" rel="noreferrer" className="text-[13px] text-[#8fb2ff] hover:underline">
              @{status.username}
            </a>
          ) : (
            <p className="text-[13px] text-fg-3">{status.configured ? "нет связи с Telegram" : "не настроен"}</p>
          )}
        </div>
      </div>

      {!status.configured ? (
        <p className="text-[13px] leading-relaxed text-fg-2">
          Добавьте переменную <code className="text-fg">TELEGRAM_BOT_TOKEN</code> в настройках проекта на Vercel и сделайте Redeploy.
        </p>
      ) : (
        <>
          <ul className="grid gap-2 text-[13px]">
            <Check ok={status.webhookOk} label="Бот получает сообщения" hint={status.webhookOk ? undefined : "Нажмите «Подключить бота»"} />
            <Check
              ok={Boolean(status.group)}
              label={status.group ? `Группа: ${status.group.title ?? status.group.chatId}` : "Группа менеджеров"}
              hint={status.group ? undefined : "Не подключена — заявки сохраняются только здесь"}
            />
          </ul>

          {status.lastError && <p className="rounded-[8px] border border-fair/25 bg-fair/[0.06] px-3 py-2 text-[12px] leading-relaxed text-fair">Последняя ошибка: {status.lastError}</p>}

          <div className="grid gap-2">
            <PanelButton primary={!status.webhookOk} busy={busy === "setup"} onClick={() => call("setup")}>
              {status.webhookOk ? "Обновить настройки бота" : "Подключить бота"}
            </PanelButton>
            {status.group ? (
              <PanelButton busy={busy === "unbind"} onClick={() => confirm("Отключить группу? Новые заявки перестанут туда приходить.") && call("unbind")}>
                Отключить группу
              </PanelButton>
            ) : (
              <PanelButton primary={status.webhookOk} busy={busy === "bind-code"} onClick={() => call("bind-code")}>
                Подключить группу
              </PanelButton>
            )}
          </div>

          {bind && !status.group && (
            <div className="rounded-[10px] border border-line bg-surface p-4 text-[13px] leading-relaxed text-fg-2">
              <ol className="grid list-decimal gap-1.5 pl-4">
                <li>Добавьте @{status.username} в группу менеджеров.</li>
                <li>Отправьте в группу команду:</li>
              </ol>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(command).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  });
                }}
                className="mt-2 flex w-full items-center justify-between gap-2 rounded-[6px] border border-line-strong bg-bg px-3 py-2 text-left font-mono text-[13px] text-fg transition-colors hover:border-white/20"
              >
                <span className="truncate">{command}</span>
                <span className="shrink-0 font-sans text-[11px] text-fg-3">{copied ? "Скопировано" : "Копировать"}</span>
              </button>
              <p className="mt-2 text-[12px] text-fg-3">Код действует 15 минут. Потом нажмите «Проверить».</p>
              <PanelButton busy={busy === "status"} onClick={() => call("status")} className="mt-3 w-full">
                Проверить
              </PanelButton>
            </div>
          )}

          {message && <p className={cn("text-[12px] leading-relaxed", message.tone === "good" ? "text-good" : "text-weak")}>{message.text}</p>}

          <details className="text-[12px] leading-relaxed text-fg-3">
            <summary className="cursor-pointer text-fg-2 hover:text-fg">Как это работает</summary>
            <ul className="mt-2 grid list-disc gap-1 pl-4">
              <li>Заявки с сайта и из бота попадают сюда и в группу менеджеров.</li>
              <li>Кнопки в группе («Взять в работу», «Готово») меняют статус и здесь.</li>
              <li>Клиенту в Telegram приходит сообщение, когда статус меняется.</li>
              <li>В группе работают команды /leads, /stats и /lead 42.</li>
            </ul>
          </details>
        </>
      )}
    </aside>
  );
}

function Check({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <li className="flex gap-2.5">
      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px]", ok ? "bg-good/15 text-good" : "bg-white/[0.06] text-fg-3")}>{ok ? "✓" : "•"}</span>
      <span className="min-w-0">
        <span className={cn("block truncate", ok ? "text-fg" : "text-fg-2")}>{label}</span>
        {hint && <span className="block text-[12px] text-fg-3">{hint}</span>}
      </span>
    </li>
  );
}

function PanelButton({ primary, busy, onClick, className, children }: { primary?: boolean; busy?: boolean; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-[6px] px-3 text-[13px] transition-colors disabled:opacity-60",
        primary ? "bg-blue text-white hover:bg-[#4a86ff]" : "border border-line-strong bg-surface-2 text-fg-2 hover:border-white/20 hover:text-fg",
        className,
      )}
    >
      {busy && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}
