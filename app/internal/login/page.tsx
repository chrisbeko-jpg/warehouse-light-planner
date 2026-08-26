"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/internal/aanvragen";
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!token.trim()) {
      setError("Voer een token in.");
      return;
    }
    document.cookie = `internal_admin_token=${encodeURIComponent(token.trim())}; path=/; max-age=86400; SameSite=Strict`;
    router.push(next);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ls-bg)] p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-4 text-xl font-bold">Interne toegang</h1>
        <label className="block text-sm font-medium">
          Admin token
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        {error && <p className="mt-2 text-sm text-[var(--ls-danger)]">{error}</p>}
        <button type="submit" className="btn-primary mt-4 w-full">
          Inloggen
        </button>
      </form>
    </main>
  );
}

export default function InternalLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
