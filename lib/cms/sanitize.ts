import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "span",
  "img",
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "target", "rel", "class"],
    img: ["src", "alt", "title", "class"],
    span: ["class"],
    p: ["class"],
    h2: ["class"],
    h3: ["class"],
    ul: ["class"],
    ol: ["class"],
    li: ["class"],
    blockquote: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
};

export function sanitizeRichHtml(html: string): string {
  if (!html?.trim()) return "";
  try {
    return sanitizeHtml(html, SANITIZE_OPTIONS);
  } catch (error) {
    console.error("Failed to sanitize rich HTML:", error);
    return "";
  }
}

export function richTextToPlainText(html: string): string {
  return sanitizeRichHtml(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
