"use client";

import { useCallback, useEffect, useState } from "react";
import type { CmsNavigation, CmsSiteContent } from "@/types/cms";
import { PublishBar } from "@/components/cms/PublishBar";
import { cmsFetch } from "@/lib/cms/admin-client";

export function NavigationEditorClient() {
  const [navigation, setNavigation] = useState<CmsNavigation | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await cmsFetch<{ site: CmsSiteContent }>("/api/internal/cms?draft=1");
    setNavigation(data.site.navigation ?? { header: [], footer: [] });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!navigation) return;
    await cmsFetch("/api/internal/cms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ navigation }),
    });
    setMessage("Concept opgeslagen.");
  };

  const publish = async () => {
    await save();
    await cmsFetch("/api/internal/cms/publish", { method: "POST" });
    setMessage("Gepubliceerd.");
  };

  if (!navigation) return <p>Laden…</p>;

  const updateItem = (section: "header" | "footer", index: number, field: "label" | "href", value: string) => {
    const items = [...navigation[section]];
    items[index] = { ...items[index]!, [field]: value };
    setNavigation({ ...navigation, [section]: items });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-xl font-bold">Navigatie</h2>
        <PublishBar previewHref="/" onSave={save} onPublish={publish} onSaved={setMessage} />
      </div>
      {message && <p className="rounded-lg bg-[var(--lp-green-soft)] p-3 text-sm">{message}</p>}

      {(["header", "footer"] as const).map((section) => (
        <section key={section} className="lp-card space-y-3 p-6">
          <h3 className="font-bold capitalize">{section === "header" ? "Header" : "Footer"}</h3>
          {navigation[section].map((item, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-2">
              <label className="text-sm">
                Label
                <input className="mt-1 w-full rounded border px-2 py-1" value={item.label} onChange={(e) => updateItem(section, index, "label", e.target.value)} />
              </label>
              <label className="text-sm">
                Link
                <input className="mt-1 w-full rounded border px-2 py-1" value={item.href} onChange={(e) => updateItem(section, index, "href", e.target.value)} />
              </label>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
