import { test, expect } from "@playwright/test";
import { sanitizeRichHtml } from "../lib/cms/sanitize";
import { resolveCmsImageUrl } from "../lib/cms/resolve-image-url";

test.describe("CMS public resilience", () => {
  test("sanitizeRichHtml strips scripts without throwing", () => {
    const dirty = '<p>Hello</p><script>alert(1)</script>';
    expect(sanitizeRichHtml(dirty)).not.toContain("script");
    expect(sanitizeRichHtml(dirty)).toContain("Hello");
    expect(sanitizeRichHtml("")).toBe("");
  });

  test("resolveCmsImageUrl returns null for missing media without throwing", () => {
    expect(resolveCmsImageUrl({}, "missing-id", "test")).toBeNull();
    expect(resolveCmsImageUrl(undefined, null, "test")).toBeNull();
    expect(resolveCmsImageUrl({}, undefined, "test")).toBeNull();
  });

  test("public routes return HTTP 200", async ({ request }) => {
    for (const path of ["/home", "/lichtadvies", "/kantoorverlichting", "/internal/login"]) {
      const response = await request.get(path);
      expect(response.status(), `${path} should not error`).toBe(200);
    }
  });

  test("homepage renders without CMS hero image", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByText("Pagina tijdelijk niet beschikbaar")).toHaveCount(0);
  });
});
