import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Desktop browser window. Children are rendered on a scaled canvas where
 * 1u = 1/80 of the frame width (see .mock-canvas in globals.css).
 */
export function BrowserFrame({
  url,
  children,
  className,
  aspect = "16 / 10",
  canvasClassName,
}: {
  url: string;
  children: ReactNode;
  className?: string;
  aspect?: string;
  canvasClassName?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[12px] border border-white/10 bg-[#0c0c10] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8),0_0_0_1px_rgb(255_255_255/0.02)]",
        className,
      )}
    >
      <div className="flex h-7 items-center gap-3 border-b border-white/[0.06] bg-[#111116] px-3 sm:h-8">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/10" />
          <span className="size-2 rounded-full bg-white/10" />
        </div>
        <div className="mx-auto flex h-4.5 max-w-[60%] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-white/[0.04] px-2 sm:h-5">
          <svg viewBox="0 0 12 12" className="size-2 shrink-0 text-fg-3" aria-hidden="true">
            <path d="M3.5 5V3.8a2.5 2.5 0 0 1 5 0V5M2.5 5h7v5h-7z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="truncate text-[9px] text-fg-3 sm:text-[10px]">{url}</span>
        </div>
        <span className="w-8" aria-hidden="true" />
      </div>
      <div className="mock relative overflow-hidden" style={{ aspectRatio: aspect }}>
        <div className={cn("mock-canvas absolute inset-0", canvasClassName)}>{children}</div>
      </div>
    </div>
  );
}

/** Phone mockup. Canvas unit: 1u = 1/24 of the screen width (~16px on a 390px phone). */
export function PhoneFrame({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "rounded-[18%/8.5%] border border-white/12 bg-[#101014] p-[3.5%] shadow-[0_40px_80px_-24px_rgb(0_0_0/0.85),inset_0_0_0_1px_rgb(255_255_255/0.04)]",
        className,
      )}
      style={style}
    >
      <div className="mock relative overflow-hidden rounded-[14%/6.5%]" style={{ aspectRatio: "9 / 19" }}>
        <div className="mock-canvas absolute inset-0" style={{ "--mock-w": 24 } as CSSProperties}>
          {children}
        </div>
        <span
          aria-hidden="true"
          className="absolute top-[2.2%] left-1/2 h-[3.2%] w-[30%] -translate-x-1/2 rounded-full bg-black"
        />
      </div>
    </div>
  );
}
