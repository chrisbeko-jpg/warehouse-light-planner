import { test, expect } from "@playwright/test";
import { createTestPng } from "./helpers/wizard";

const ADMIN_TOKEN = "playwright-test-token";

async function uploadImage(request: import("@playwright/test").APIRequestContext, name: string) {
  const response = await request.post("/api/internal/media", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    multipart: {
      file: { name, mimeType: "image/png", buffer: createTestPng() },
      title: name,
      altText: `Alt ${name}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { media: { id: string; url: string } };
}

async function publishHomepageHeroImage(
  request: import("@playwright/test").APIRequestContext,
  imageId: string,
) {
  const draftRes = await request.get("/api/internal/cms?draft=1", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  expect(draftRes.ok()).toBeTruthy();
  const draft = (await draftRes.json()) as {
    site: { homepage: { blocks: { id: string; type: string; imageId?: string }[] } };
  };

  const homepage = {
    ...draft.site.homepage,
    blocks: draft.site.homepage.blocks.map((block) =>
      block.id === "hero" && block.type === "hero" ? { ...block, mediaId: imageId, imageId } : block,
    ),
  };

  const saveRes = await request.put("/api/internal/cms", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, "Content-Type": "application/json" },
    data: { pageSlug: "homepage", page: homepage },
  });
  expect(saveRes.ok()).toBeTruthy();
  const saved = (await saveRes.json()) as {
    site: { homepage: { blocks: { id: string; imageId?: string }[] } };
  };
  const hero = saved.site.homepage.blocks.find((block) => block.id === "hero");
  expect(hero?.imageId).toBe(imageId);

  const publishRes = await request.post("/api/internal/cms/publish", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  expect(publishRes.ok()).toBeTruthy();
}

test.describe("Homepage hero image chain", () => {
  test("published hero image renders on /home with blob or proxy URL", async ({ page, request }) => {
    const upload = await uploadImage(request, "homepage-hero.png");
    await publishHomepageHeroImage(request, upload.media.id);

    await page.goto("/home");
    const heroImg = page.getByTestId("homepage-hero-image");
    await expect(heroImg).toBeVisible();
    await expect(heroImg).toHaveAttribute("src", new RegExp(upload.media.id));
  });

  test("homepage hero imageId persists in admin after save and reload", async ({ page, request }) => {
    const upload = await uploadImage(request, "homepage-admin.png");

    await page.goto("/internal/login?next=/internal/content/homepage");
    await page.getByLabel("Admin token").fill(ADMIN_TOKEN);
    await page.getByRole("button", { name: "Inloggen" }).click();
    await expect(page).toHaveURL(/\/internal\/content\/homepage/);

    const heroBlock = page.locator("article").filter({ hasText: "Hero" }).first();
    await heroBlock.locator("select").first().selectOption(upload.media.id);
    await page.getByRole("button", { name: "Opslaan als concept" }).click();
    await expect(page.getByTestId("page-editor-message")).toContainText("Pagina opgeslagen als concept");

    await page.reload();
    await expect(heroBlock.locator("select").first()).toHaveValue(upload.media.id);

    await page.getByRole("button", { name: "Publiceren" }).click();
    await expect(page.getByTestId("page-editor-message")).toContainText("Pagina gepubliceerd");

    await page.goto("/home");
    await expect(page.getByTestId("homepage-hero-image")).toHaveAttribute(
      "src",
      new RegExp(upload.media.id),
    );
  });
});
