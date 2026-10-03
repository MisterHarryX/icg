/** The ICG mark: an open ring (C), the I stroke and a rising arrow (G / growth). */
export function LogoMark({ className, id = "icg-mark" }: { className?: string; id?: string }) {
  const fill = `url(#${id})`;
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id} x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3CC8FF" />
          <stop offset="0.5" stopColor="#3A7BFF" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      {/* Ring, open on the right, ending in an arrow tail */}
      <path d="M47.6 15.4A23 23 0 1 0 52.4 43" stroke={fill} strokeWidth="5.5" />
      <path d="M56.2 36 56.8 45.4 48 40.6Z" fill={fill} />
      {/* I stroke, separated from the ring by a thin dark outline */}
      <rect x="20" y="8.5" width="5.5" height="47" rx="1" fill={fill} stroke="#060608" strokeWidth="2.5" paintOrder="stroke" />
      {/* Rising arrow */}
      <path d="M24 48.5 46.2 26.3" stroke={fill} strokeWidth="5.5" />
      <path d="M52.5 20 50 30.25 42.25 22.5Z" fill={fill} />
    </svg>
  );
}

export function Logo({
  className,
  id,
  withTagline = false,
}: {
  className?: string;
  id?: string;
  withTagline?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark id={id} className="size-8 shrink-0" />
      <span className="flex flex-col">
        <span className="font-brand text-[15px] leading-none tracking-[0.18em] text-fg">ICG</span>
        {withTagline && (
          <span className="mt-1.5 font-sans text-[8.5px] leading-none tracking-[0.2em] text-fg-3 uppercase">
            Impact · Conversion · Growth
          </span>
        )}
      </span>
    </span>
  );
}
