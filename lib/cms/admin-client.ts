"use client";

export function getAdminToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/internal_admin_token=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function cmsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error("Niet ingelogd");
  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(data.message ?? data.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
