import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

/*
 * Flat, compact buttons (same proportions as the WriteLite reference):
 * 5px radius, 36px / 48px tall, solid fill, no gradient or glow.
 * Press feedback is a quick 120ms scale; colors ease on hover only.
 */
const base =
  "group/btn relative inline-flex shrink-0 items-center justify-center gap-2 rounded-[5px] font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] duration-[120ms] ease-out-soft active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-blue text-white hover:bg-[#4a86ff]",
  secondary: "border border-line-strong bg-surface-2 text-fg-2 hover:border-white/20 hover:text-fg",
  ghost: "text-fg-2 hover:text-fg",
};

const sizes: Record<Size, string> = {
  md: "h-9 px-3.5 text-[13px]",
  lg: "h-12 px-6 text-[15px]",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

type ButtonLinkProps = ComponentPropsWithoutRef<"a"> & {
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  children: ReactNode;
};

/** Anchor styled as a button (used for in-page anchors and external links). */
export function ButtonLink({ variant, size, arrow, className, children, ...props }: ButtonLinkProps) {
  const external = props.href?.startsWith("http");
  return (
    <a
      className={buttonClasses(variant, size, className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    >
      {children}
      {arrow && <Arrow />}
    </a>
  );
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
};

export function Button({ variant, size, arrow, className, children, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...props}>
      {children}
      {arrow && <Arrow />}
    </button>
  );
}

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`size-4 transition-transform duration-300 ease-out-soft group-hover/btn:translate-x-0.5 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
