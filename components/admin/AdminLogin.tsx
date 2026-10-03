"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";

const ERRORS: Record<string, string> = {
  "wrong-password": "Неверный пароль.",
  "too-many": "Слишком много попыток. Попробуйте через 15 минут.",
  "not-configured": "Вход не настроен: задайте ADMIN_PASSWORD в .env.local и перезапустите сервер.",
  network: "Не удалось связаться с сервером.",
};

/** The password form, shared by the on-site dialog and the /admin page. */
export function AdminLoginForm({ onSuccess, autoFocus = true }: { onSuccess: () => void; autoFocus?: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputId = useId();
  const errorId = useId();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) return onSuccess();
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(ERRORS[body.error ?? ""] ?? ERRORS.network);
    } catch {
      setError(ERRORS.network);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={inputId} className="eyebrow block">
        Пароль
      </label>
      <input
        id={inputId}
        type="password"
        autoComplete="current-password"
        autoFocus={autoFocus}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setError(null);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "mt-2.5 h-11 w-full rounded-[5px] border bg-bg/60 px-3.5 text-[16px] text-fg sm:text-[15px] transition-[border-color,box-shadow] duration-200 focus:outline-none",
          error
            ? "border-weak/60 focus:shadow-[0_0_0_3px_rgb(240_122_106/0.18)]"
            : "border-line-strong focus:border-blue/70 focus:shadow-[0_0_0_3px_rgb(58_123_255/0.2)]",
        )}
      />
      <p id={errorId} role="alert" className={cn("text-[13px] leading-snug text-weak", error ? "mt-2.5" : "sr-only")}>
        {error}
      </p>
      <button
        type="submit"
        disabled={!password || pending}
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-[5px] bg-blue text-[14px] font-medium text-white transition-[background-color,transform,opacity] duration-[120ms] hover:bg-[#4a86ff] active:scale-[0.97] disabled:opacity-50"
      >
        {pending ? "Проверяем…" : "Войти"}
      </button>
    </form>
  );
}

/** Modal login over the site, opened by the key button in the footer. */
export function AdminLogin({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const succeeded = useRef(false);
  const titleId = useId();

  useEffect(() => {
    dialog.current?.showModal();
    // showModal() focuses the first button (×); the password field is what you want.
    dialog.current?.querySelector("input")?.focus();
  }, []);

  return (
    <dialog
      ref={dialog}
      data-admin-ui
      aria-labelledby={titleId}
      // Every way out (Esc, ×, backdrop, success) ends up here.
      onClose={() => (succeeded.current ? onSuccess() : onClose())}
      onClick={(event) => {
        // Click on the backdrop closes.
        if (event.target === dialog.current) dialog.current.close();
      }}
      className="admin-dialog m-auto w-[min(380px,calc(100vw-32px))] rounded-[12px] border border-line-strong bg-surface p-0 text-fg backdrop:bg-black/60 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-brand text-[11px] tracking-[0.3em] text-fg-3">ICG</p>
            <h2 id={titleId} className="mt-2 text-[20px] font-medium tracking-[-0.02em]">
              Вход для администратора
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Закрыть"
            className="-mt-1 -mr-2 grid size-8 place-items-center rounded-[5px] text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-2">Статистика посещений и редактирование сайта.</p>
        <div className="mt-6">
          <AdminLoginForm
            onSuccess={() => {
              succeeded.current = true;
              dialog.current?.close();
            }}
          />
        </div>
      </div>
    </dialog>
  );
}
