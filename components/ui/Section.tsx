import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  id,
  children,
  className,
  containerClassName,
  tightBottom = false,
}: {
  id: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  /** Smaller bottom padding when the section ends on a compact block. */
  tightBottom?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        "relative isolate pt-24 md:pt-32 lg:pt-36",
        tightBottom ? "pb-6 md:pb-8 lg:pb-10" : "pb-24 md:pb-32 lg:pb-36",
        className,
      )}
    >
      <div className={cn("container-page", containerClassName)}>{children}</div>
    </section>
  );
}
