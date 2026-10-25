"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Messages } from "@/messages/ru";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const SERVICES = ["business", "beauty", "redesign", "other"] as const;
type Service = (typeof SERVICES)[number];
type Field = "name" | "contact";

type State =
  | { kind: "form" }
  | { kind: "sending" }
  | { kind: "error"; message: string }
  | { kind: "sent"; number: string; trackUrl: string | null };

/**
 * The request form, in a modal. Any element with `data-lead-open` (and links
 * to #request) opens it; `data-lead-service="beauty"` preselects a service.
 * Without JavaScript those links still lead to the contact section.
 */
export function LeadDialog({ t, locale, botUrl }: { t: Messages["lead"]; locale: string; botUrl: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: "form" });
  const [service, setService] = useState<Service>("business");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const id = useId();

  const open = useCallback((preset?: string | null) => {
    if (preset && (SERVICES as readonly string[]).includes(preset)) setService(preset as Service);
    setState((current) => (current.kind === "sent" ? { kind: "form" } : current));
    setErrors({});
    dialog.current?.showModal();
    // Focus the first field on desktop; on phones it would pop the keyboard over the form.
    if (window.matchMedia("(pointer: fine)").matches) window.setTimeout(() => nameInput.current?.focus(), 60);
  }, []);

  const close = useCallback(() => dialog.current?.close(), []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const trigger = (event.target as Element | null)?.closest?.<HTMLElement>("[data-lead-open], a[href='#request']");
      if (!trigger) return;
      event.preventDefault();
      open(trigger.dataset.leadService);
    };
    document.addEventListener("click", onClick);
    // A shared link to /ru#request opens the form right away.
    const timer = window.location.hash === "#request" ? window.setTimeout(() => open(), 300) : 0;
    return () => {
      document.removeEventListener("click", onClick);
      window.clearTimeout(timer);
    };
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const contact = String(data.get("contact") ?? "").trim();

    const found: Partial<Record<Field, string>> = {};
    if (name.length < 2) found.name = t.errors.name;
    if (contact.length < 3) found.contact = t.errors.contact;
    setErrors(found);
    if (Object.keys(found).length) return;

    setState({ kind: "sending" });
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, service, message: data.get("message"), website: data.get("website"), locale }),
      });
      const result = (await response.json().catch(() => ({}))) as { number?: string; trackUrl?: string | null; error?: string; field?: Field };
      if (response.ok && result.number) {
        setState({ kind: "sent", number: result.number, trackUrl: result.trackUrl ?? null });
        form.reset();
        return;
      }
      if (result.error === "invalid" && result.field && (result.field === "name" || result.field === "contact")) {
        setErrors({ [result.field]: t.errors[result.field] });
        setState({ kind: "form" });
        return;
      }
      setState({ kind: "error", message: result.error === "rate_limited" ? t.errors.rate_limited : t.errors.generic });
    } catch {
      setState({ kind: "error", message: t.errors.generic });
    }
  }

  const sending = state.kind === "sending";

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      className="lead-dialog"
      onClick={(event) => {
        // A click on the backdrop (the dialog element itself) closes it.
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="relative overflow-hidden rounded-[16px] border border-line-strong bg-bg-soft shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(60_200_255/0.6),rgb(139_92_246/0.6),transparent)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/2 h-56 w-[120%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(58_123_255/0.16),transparent)]" />

        <button
          type="button"
          onClick={close}
          aria-label={t.close}
          className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg"
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>

        {state.kind === "sent" ? (
          <div className="lead-success relative flex flex-col items-center px-6 pt-12 pb-8 text-center sm:px-10">
            <span className="relative grid size-16 place-items-center rounded-full border border-good/30 bg-good/10 text-good">
              <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path className="lead-check" d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h2 id={`${id}-title`} className="mt-6 text-[24px] font-medium tracking-[-0.02em] text-fg">
              {t.successTitle.replace("{number}", state.number)}
            </h2>
            <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-fg-2">{t.successText}</p>

            {state.trackUrl && (
              <div className="mt-7 w-full rounded-[12px] border border-line bg-surface p-4 text-left">
                <a
                  href={state.trackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#2aabee] text-white">
                    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
                      <path d="M21.6 4.2 2.9 11.4c-1.3.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.8.8s.6-.2.9-.5l2.4-2.3 4.9 3.6c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.5-1.5zM9.7 14.3l8.6-7.7c.4-.3-.1-.5-.6-.2L7.3 13.1" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-fg">{t.track}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-fg-3">{t.trackHint}</span>
                  </span>
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0 text-fg-3 transition-transform group-hover:translate-x-0.5 group-hover:text-fg" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 11 11 5M6 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            )}

            <Button variant="secondary" size="lg" onClick={close} className="mt-6 w-full">
              {t.done}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative px-5 pt-8 pb-6 sm:px-8 sm:pt-9 sm:pb-7">
            <div className="flex items-center gap-3">
              <LogoMark id={`${id}-mark`} className="size-8" />
              <p className="font-brand text-[11px] tracking-[0.3em] text-fg-3">{t.eyebrow.toUpperCase()}</p>
            </div>
            <h2 id={`${id}-title`} className="mt-5 pr-8 text-[26px] leading-tight font-medium tracking-[-0.03em] text-fg sm:text-[30px]">
              {t.title}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-fg-2">{t.text}</p>

            <fieldset className="mt-7">
              <legend className="mb-2.5 text-[13px] text-fg-3">{t.serviceLabel}</legend>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.map((key) => (
                  <label
                    key={key}
                    className={cn(
                      "relative flex h-11 cursor-pointer items-center gap-2.5 rounded-[8px] border px-3.5 text-[14px] transition-[border-color,background-color,color] duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cyan",
                      service === key ? "border-blue/70 bg-blue/[0.12] text-fg" : "border-line-strong bg-surface-2 text-fg-2 hover:border-white/20 hover:text-fg",
                    )}
                  >
                    <input type="radio" name="service" value={key} checked={service === key} onChange={() => setService(key)} className="sr-only" />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded-full border transition-colors",
                        service === key ? "border-blue bg-blue" : "border-white/25",
                      )}
                    >
                      {service === key && <span className="size-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="truncate">{t.services[key]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 grid gap-4">
              <TextField id={`${id}-name`} label={t.name} error={errors.name} onEdit={() => errors.name && setErrors((e) => ({ ...e, name: undefined }))}>
                <input
                  ref={nameInput}
                  id={`${id}-name`}
                  name="name"
                  autoComplete="name"
                  maxLength={80}
                  placeholder={t.namePlaceholder}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? `${id}-name-error` : undefined}
                  className="lead-input"
                />
              </TextField>
              <TextField id={`${id}-contact`} label={t.contact} error={errors.contact} onEdit={() => errors.contact && setErrors((e) => ({ ...e, contact: undefined }))}>
                <input
                  id={`${id}-contact`}
                  name="contact"
                  autoComplete="tel"
                  inputMode="text"
                  maxLength={80}
                  placeholder={t.contactPlaceholder}
                  aria-invalid={Boolean(errors.contact)}
                  aria-describedby={errors.contact ? `${id}-contact-error` : undefined}
                  className="lead-input"
                />
              </TextField>
              <TextField id={`${id}-message`} label={t.message} hint={t.optional}>
                <textarea id={`${id}-message`} name="message" rows={3} maxLength={1500} placeholder={t.messagePlaceholder} className="lead-input min-h-[92px] resize-none py-3" />
              </TextField>
              {/* Honeypot: hidden from people, tempting for bots. */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
            </div>

            {state.kind === "error" && (
              <p role="alert" className="mt-4 rounded-[8px] border border-weak/30 bg-weak/[0.08] px-3.5 py-2.5 text-[13px] leading-relaxed text-weak">
                {state.message}
              </p>
            )}

            <Button type="submit" size="lg" arrow={!sending} disabled={sending} className="mt-6 h-13 w-full text-[16px]">
              {sending && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {sending ? t.sending : t.submit}
            </Button>

            <div className="mt-4 flex flex-col items-center gap-1.5 text-center text-[12px] text-fg-3 sm:flex-row sm:justify-between sm:text-left">
              <span>{t.privacy}</span>
              {botUrl && (
                <a href={botUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-fg-2 underline decoration-white/20 underline-offset-4 transition-colors hover:text-fg">
                  {t.orBot} {t.orBotLink}
                </a>
              )}
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}

function TextField({
  id,
  label,
  hint,
  error,
  onEdit,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  onEdit?: () => void;
  children: ReactNode;
}) {
  return (
    <div className={cn("lead-field", error && "lead-field-error")} onInput={onEdit}>
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between text-[13px] text-fg-3">
        <span>{label}</span>
        {hint && <span className="text-[12px] text-fg-3/70">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[12px] text-weak">
          {error}
        </p>
      )}
    </div>
  );
}
