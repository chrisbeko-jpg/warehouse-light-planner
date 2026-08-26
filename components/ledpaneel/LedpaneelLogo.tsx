import Link from "next/link";

type LogoSize = "sm" | "md" | "lg";

const sizes: Record<LogoSize, { text: string; mark: string }> = {
  sm: { text: "text-base", mark: "h-6 w-6 text-xs" },
  md: { text: "text-lg", mark: "h-8 w-8 text-sm" },
  lg: { text: "text-xl", mark: "h-10 w-10 text-base" },
};

export function LedpaneelLogo({
  size = "md",
  href = "/",
}: {
  size?: LogoSize;
  href?: string;
}) {
  const s = sizes[size];
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 no-underline">
      <span
        className={`${s.mark} inline-flex items-center justify-center rounded-lg bg-[var(--lp-green)] font-bold text-white`}
        aria-hidden
      >
        LP
      </span>
      <span className={`${s.text} font-bold tracking-tight text-[var(--lp-text)]`}>
        ledpaneel<span className="text-[var(--lp-green-dark)]">.nl</span>
      </span>
    </Link>
  );
}
