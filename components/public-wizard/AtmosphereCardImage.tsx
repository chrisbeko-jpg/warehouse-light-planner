"use client";

import { useEffect, useState } from "react";

export function AtmosphereCardImage({
  choiceId,
  imageUrl,
  imageAlt,
  title,
  fallbackGradient,
  premiumOverlay = false,
  badgeText = "ONLY PREMIUM",
}: {
  choiceId: string;
  imageUrl: string | null;
  imageAlt: string;
  title: string;
  fallbackGradient: string;
  premiumOverlay?: boolean;
  badgeText?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;

  useEffect(() => {
    if (!imageUrl) {
      console.warn("Missing atmosphere media", choiceId);
    }
  }, [choiceId, imageUrl]);

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden bg-gradient-to-br ${fallbackGradient}`}
      data-testid={`atmosphere-card-image-area-${choiceId}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl!}
          alt={imageAlt || title}
          className={`absolute inset-0 h-full w-full object-cover ${premiumOverlay ? "grayscale" : ""}`}
          data-testid={`atmosphere-card-image-${choiceId}`}
          onError={() => {
            console.warn("Missing atmosphere media", choiceId);
            setFailed(true);
          }}
        />
      ) : null}

      {premiumOverlay && (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-10 bg-stone-900/45"
            data-testid={`atmosphere-premium-overlay-${choiceId}`}
          />
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
            <span
              className="-rotate-12 rounded-md bg-black/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg sm:text-sm"
              data-testid={`atmosphere-premium-badge-${choiceId}`}
            >
              {badgeText}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
