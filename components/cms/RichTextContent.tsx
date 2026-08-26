import { sanitizeRichHtml } from "@/lib/cms/sanitize";

export function RichTextContent({
  html,
  className = "cms-rich-text lp-body",
}: {
  html: string;
  className?: string;
}) {
  const safe = sanitizeRichHtml(html);
  if (!safe) return null;
  return (
    <div
      className={`${className} prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-a:text-[var(--lp-green-dark)] prose-a:underline`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
