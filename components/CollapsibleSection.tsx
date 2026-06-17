"use client";

import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  /** When true, children provide their own card styling. */
  unstyled?: boolean;
}

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
  unstyled = false,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = (
    <button
      type="button"
      onClick={() => setOpen((value) => !value)}
      className={`flex w-full items-start justify-between gap-3 text-left lg:hidden ${
        unstyled ? "ls-card mb-3 p-4" : ""
      }`}
      aria-expanded={open}
    >
      <span>
        <span className="ls-heading block text-base">{title}</span>
        {subtitle && (
          <span className="mt-0.5 block text-xs text-[var(--ls-gray)]">{subtitle}</span>
        )}
      </span>
      <span className="shrink-0 text-sm font-medium text-[var(--ls-yellow)]">
        {open ? "Inklappen ▲" : "Openen ▼"}
      </span>
    </button>
  );

  if (unstyled) {
    return (
      <div className="min-w-0">
        {toggle}
        <div className={`${open ? "block" : "hidden"} min-w-0 lg:block`}>{children}</div>
      </div>
    );
  }

  return (
    <section className="ls-card min-w-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-[var(--ls-bg)] lg:pointer-events-none lg:cursor-default lg:hover:bg-transparent"
        aria-expanded={open}
      >
        <span>
          <span className="ls-heading block text-lg">{title}</span>
          {subtitle && (
            <span className="mt-1 block text-xs text-[var(--ls-gray)]">{subtitle}</span>
          )}
        </span>
        <span className="shrink-0 text-sm font-medium text-[var(--ls-yellow)] lg:hidden">
          {open ? "Inklappen ▲" : "Openen ▼"}
        </span>
      </button>
      <div
        className={`border-t border-[var(--ls-gray-light)] px-4 pb-4 pt-4 lg:border-t-0 lg:px-5 lg:pb-5 ${
          open ? "block" : "hidden"
        } lg:block`}
      >
        {children}
      </div>
    </section>
  );
}
