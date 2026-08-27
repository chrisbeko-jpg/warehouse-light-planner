import { test, expect } from "@playwright/test";
import { createTestPng } from "./helpers/wizard";

const ADMIN_TOKEN = "playwright-test-token";

async function loginAsAdmin(page: import("@playwright/test").Page, next: string) {
  await page.goto(`/internal/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Admin token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

async function uploadTestImage(request: import("@playwright/test").APIRequestContext, name: string) {
  const response = await request.post("/api/internal/media", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    multipart: {
      file: { name, mimeType: "image/png", buffer: createTestPng() },
      title: `Test ${name}`,
      altText: `Alt ${name}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { media: { id: string } };
}

test.describe("CMS mediaId persistence after save", () => {
  test("atmosphere mediaId survives save response and reload", async ({ page, request }) => {
    const upload = await uploadTestImage(request, "persist-warm.png");
    await loginAsAdmin(page, "/internal/content/wizard/atmospheres");

    const warmCard = page.getByTestId("atmosphere-choice-warm");
    await warmCard.locator('[data-testid="media-picker-select"]').selectOption(upload.media.id);
    await page.getByRole("button", { name: "Opslaan als concept" }).click();
    await expect(page.getByTestId("wizard-editor-message")).toContainText("Wijzigingen opgeslagen");
    await expect(warmCard.locator('[data-testid="media-picker-select"]')).toHaveValue(upload.media.id);

    await page.reload();
    await expect(warmCard.locator('[data-testid="media-picker-select"]')).toHaveValue(upload.media.id);
  });

  test("changing unrelated text does not clear atmosphere mediaId on save", async ({ page, request }) => {
    const upload = await uploadTestImage(request, "persist-warm-text.png");
    await loginAsAdmin(page, "/internal/content/wizard/atmospheres");

    const warmCard = page.getByTestId("atmosphere-choice-warm");
    await warmCard.locator('[data-testid="media-picker-select"]').selectOption(upload.media.id);
    await warmCard.getByRole("textbox").first().fill("Warm & comfortabel (test)");
    await page.getByRole("button", { name: "Opslaan als concept" }).click();
    await expect(warmCard.locator('[data-testid="media-picker-select"]')).toHaveValue(upload.media.id);

    const saveResponse = await request.put("/api/internal/cms", {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, "Content-Type": "application/json" },
      data: {
        wizard: {
          ...(await (async () => {
            const draft = await request.get("/api/internal/cms?draft=1", {
              headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
            });
            return ((await draft.json()) as { site: { wizard: unknown } }).site.wizard;
          })()),
        },
      },
    });
    expect(saveResponse.ok()).toBeTruthy();
    const body = (await saveResponse.json()) as {
      site: { wizard: { atmosphereChoices: { id: string; mediaId?: string | null }[] } };
    };
    const warm = body.site.wizard.atmosphereChoices.find((choice) => choice.id === "warm");
    expect(warm?.mediaId).toBe(upload.media.id);
  });

  test("homepage hero mediaId survives save response", async ({ page, request }) => {
    const upload = await uploadTestImage(request, "persist-hero.png");
    await loginAsAdmin(page, "/internal/content/homepage");

    const heroBlock = page.locator("article").filter({ hasText: "Hero" }).first();
    await heroBlock.locator('[data-testid="media-picker-select"]').selectOption(upload.media.id);
    await page.getByRole("button", { name: "Opslaan als concept" }).click();
    await expect(page.getByTestId("page-editor-message")).toContainText("Pagina opgeslagen");
    await expect(heroBlock.locator('[data-testid="media-picker-select"]')).toHaveValue(upload.media.id);

    const draft = await request.get("/api/internal/cms?draft=1", {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const site = ((await draft.json()) as { site: { homepage: { blocks: { id: string; mediaId?: string }[] } } }).site;
    const hero = site.homepage.blocks.find((block) => block.id === "hero");
    expect(hero?.mediaId).toBe(upload.media.id);
  });

  test("room mediaId persists after save", async ({ page, request }) => {
    const upload = await uploadTestImage(request, "persist-room.png");
    await loginAsAdmin(page, "/internal/content/wizard/rooms");

    const roomCard = page.getByTestId("room-choice-open_kantoor");
    await roomCard.locator('[data-testid="media-picker-select"]').selectOption(upload.media.id);
    await page.getByRole("button", { name: "Opslaan als concept" }).click();
    await expect(roomCard.locator('[data-testid="media-picker-select"]')).toHaveValue(upload.media.id);
  });

  test("example slot mediaId persists after homepage save", async ({ page, request }) => {
    const upload = await uploadTestImage(request, "persist-example.png");
    await loginAsAdmin(page, "/internal/content/homepage");

    const exampleBlock = page.locator("article").filter({ hasText: "Voorbeeld" }).first();
    await exampleBlock.locator('[data-testid="media-picker-select"]').first().selectOption(upload.media.id);
    await page.getByRole("button", { name: "Opslaan als concept" }).click();
    await expect(exampleBlock.locator('[data-testid="media-picker-select"]').first()).toHaveValue(upload.media.id);
  });
});
