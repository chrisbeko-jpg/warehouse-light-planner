"use client";

import { Turnstile } from "@marsidev/react-turnstile";

export function TurnstileField({
  onVerify,
  onExpire,
}: {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) {
    return null;
  }
  return (
    <div className="flex justify-center py-2" data-testid="turnstile-widget">
      <Turnstile siteKey={siteKey} options={{ size: "invisible" }} onSuccess={onVerify} onExpire={onExpire} />
    </div>
  );
}
