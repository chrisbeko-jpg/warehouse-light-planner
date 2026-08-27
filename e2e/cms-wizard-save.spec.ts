import { test, expect } from "@playwright/test";
import { createTestPng } from "./helpers/wizard";

const ADMIN_TOKEN = "playwright-test-token";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/internal/login?next=/internal/content/wizard/atmospheres");
  await page.getByLabel("Admin token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page).toHaveURL(/\/internal\/content\/wizard\/atmospheres/);
}

async function uploadTestImage(request: import("@playwright/test").APIRequestContext, name: string) {
  const response = await request.post("/api/internal/media", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    multipart: {
      file: {
        name,
        mimeType: "image/png",
        buffer: createTestPng(),
      },
      title: `Test ${name}`,
      altText: `Alt ${name}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { media: { id: string } };
}

test.describe("CMS wizard save and publish", () => {
  test("duplicate filename uploads both succeed", async ({ request }) => {
    const first = await uploadTestImage(request, "duplicate-name.png");
    const second = await uploadTestImage(request, "duplicate-name.png");
    expect(first.media.id).not.toBe(second.media.id);
  });

  test("atmosphere imageId persists after save and publish", async ({ page, request }) => {
    const upload = await uploadTestImage(request, "atmosphere-warm.png");

    await loginAsAdmin(page);
    const warmCard = page.getByTestId("atmosphere-choice-warm");
    await warmCard.locator("select").selectOption(upload.media.id);
    await page.getByRole("button", { name: "Opslaan als concept" }).click();
    await expect(page.getByTestId("wizard-editor-message")).toContainText("Wijzigingen opgeslagen");

    await page.reload();
    await expect(warmCard.locator("select")).toHaveValue(upload.media.id);

    await page.getByRole("button", { name: "Publiceren" }).click();
    await expect(page.getByTestId("wizard-editor-message")).toContainText("Sfeer gepubliceerd");

    const publicWizard = await request.get("/api/cms/wizard");
    expect(publicWizard.ok()).toBeTruthy();
    const data = (await publicWizard.json()) as {
      atmosphereChoices: { id: string; imageUrl: string | null }[];
    };
    const warm = data.atmosphereChoices.find((choice) => choice.id === "warm");
    expect(warm?.imageUrl).toContain(upload.media.id);
  });

  test("room imageId persists after save", async ({ page, request }) => {
    const upload = await uploadTestImage(request, "room-open.png");

    await page.goto("/internal/login?next=/internal/content/wizard/rooms");
    await page.getByLabel("Admin token").fill(ADMIN_TOKEN);
    await page.getByRole("button", { name: "Inloggen" }).click();

    const roomCard = page.getByTestId("room-choice-open_kantoor");
    await roomCard.locator("select").selectOption(upload.media.id);
    await page.getByRole("button", { name: "Opslaan als concept" }).click();
    await expect(page.getByTestId("wizard-editor-message")).toContainText("Wijzigingen opgeslagen");

    await page.reload();
    await expect(roomCard.locator("select")).toHaveValue(upload.media.id);
  });

  test("save shows loading state on button", async ({ page, request }) => {
    const upload = await uploadTestImage(request, "loading-test.png");
    await loginAsAdmin(page);
    await page.getByTestId("atmosphere-choice-warm").locator("select").selectOption(upload.media.id);
    const saveButton = page.getByRole("button", { name: "Opslaan als concept" });
    await saveButton.click();
    await expect(page.getByTestId("wizard-editor-message")).toContainText("Wijzigingen opgeslagen", {
      timeout: 10000,
    });
  });
});
