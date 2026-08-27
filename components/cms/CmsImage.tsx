import type { ResolvedMedia } from "@/lib/cms/media";

export function CmsImage({
  media,
  alt,
  className = "",
  testId,
  fit = "cover",
  placeholder = "Afbeelding",
  aspectClassName = "aspect-[4/3]",
}: {
  media: ResolvedMedia | null;
  alt?: string;
  className?: string;
  testId?: string;
  fit?: "cover" | "contain";
  placeholder?: string;
  aspectClassName?: string;
}) {
  if (!media?.url) {
    return (
      <div
        className={`flex ${aspectClassName} items-center justify-center rounded-2xl border border-dashed border-[var(--lp-border)] bg-[var(--lp-bg-secondary)] text-sm text-[var(--lp-text-secondary)] ${className}`}
        data-testid={testId}
      >
        {placeholder}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={media.url}
      alt={alt ?? media.altText}
      className={`${aspectClassName} w-full rounded-2xl border border-[var(--lp-border)] object-${fit} ${className}`}
      data-testid={testId}
    />
  );
}
