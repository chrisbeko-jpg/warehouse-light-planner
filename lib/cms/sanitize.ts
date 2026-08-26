import DOMPurify from "isomorphic-dompurify";

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

const ALLOWED_ATTR = ["href", "target", "rel", "class", "src", "alt", "title"];

export function sanitizeRichHtml(html: string): string {
  if (!html?.trim()) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

export function richTextToPlainText(html: string): string {
  return sanitizeRichHtml(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
