import { test, expect } from "@playwright/test";
import { sanitizeRichHtml } from "../lib/cms/sanitize";

test.describe("CMS sanitization", () => {
  test("strips script tags", () => {
    const dirty = '<p>Hello</p><script>alert(1)</script>';
    expect(sanitizeRichHtml(dirty)).not.toContain("script");
    expect(sanitizeRichHtml(dirty)).toContain("Hello");
  });

  test("allows safe headings and links", () => {
    const html = '<h2>Titel</h2><p><a href="/lichtadvies">Link</a></p>';
    const clean = sanitizeRichHtml(html);
    expect(clean).toContain("<h2>");
    expect(clean).toContain('href="/lichtadvies"');
  });
});

test.describe("Kantoorverlichting public page", () => {
  test("renders CMS seed content with FAQ and JSON-LD", async ({ page }) => {
    await page.goto("/kantoorverlichting");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/kantoorverlichting/i);
    await expect(page.getByTestId("faq-section")).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
    await expect(page).toHaveTitle(/Kantoorverlichting & lichtplan/i);
  });
});

test.describe("AI Lichtadvies wizard CMS", () => {
  test("wizard CMS endpoint serves atmosphere and room choices", async ({ request }) => {
    const res = await request.get("/api/cms/wizard");
    expect(res.ok()).toBeTruthy();
    const data = (await res.json()) as { roomChoices: unknown[]; atmosphereChoices: { id: string }[] };
    expect(data.roomChoices.length).toBeGreaterThan(0);
    expect(data.atmosphereChoices.some((c) => c.id === "luxe")).toBeTruthy();
  });
});
