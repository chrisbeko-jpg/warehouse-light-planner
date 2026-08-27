import { test, expect } from "@playwright/test";
import { createTestPng } from "./helpers/wizard";
import { selectRoom, startWizard } from "./helpers/wizard";

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
  return (await response.json()) as { media: { id: string } };
}

async function publishAtmosphereImages(
  request: import("@playwright/test").APIRequestContext,
  imageIds: Record<string, string>,
) {
  const draftRes = await request.get("/api/internal/cms?draft=1", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  expect(draftRes.ok()).toBeTruthy();
  const draft = (await draftRes.json()) as { site: { wizard: { atmosphereChoices: { id: string; imageId?: string }[] } } };
  const wizard = {
    ...draft.site.wizard,
    atmosphereChoices: draft.site.wizard.atmosphereChoices.map((choice) => ({
      ...choice,
      imageId: imageIds[choice.id] ?? choice.imageId,
    })),
  };

  const saveRes = await request.put("/api/internal/cms", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, "Content-Type": "application/json" },
    data: { wizard },
  });
  expect(saveRes.ok()).toBeTruthy();

  const publishRes = await request.post("/api/internal/cms/publish", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  expect(publishRes.ok()).toBeTruthy();
}

async function openAtmosphereStep(page: import("@playwright/test").Page) {
  await startWizard(page);
  await selectRoom(page, "open_kantoor");
  await page.getByTestId("wizard-next-button").click();
  await expect(page.getByRole("heading", { name: "Welke sfeer zoekt u?" })).toBeVisible();
}

test.describe("Public atmosphere card images", () => {
  test("wizard API exposes imageMediaId and resolved imageUrl", async ({ request }) => {
    const warm = await uploadImage(request, "api-warm.png");
    await publishAtmosphereImages(request, { warm: warm.media.id });

    const res = await request.get("/api/cms/wizard");
    expect(res.ok()).toBeTruthy();
    const data = (await res.json()) as {
      atmosphereChoices: { id: string; imageMediaId: string | null; imageUrl: string | null }[];
    };
    const warmChoice = data.atmosphereChoices.find((choice) => choice.id === "warm");
    expect(warmChoice?.imageMediaId).toBeTruthy();
    expect(warmChoice?.imageUrl).toMatch(/\/api\/cms\/images\//);
  });

  test("warm and neutraal CMS images render on /lichtadvies", async ({ page, request }) => {
    const warm = await uploadImage(request, "public-warm.png");
    const neutraal = await uploadImage(request, "public-neutraal.png");
    await publishAtmosphereImages(request, {
      warm: warm.media.id,
      neutraal: neutraal.media.id,
    });

    await openAtmosphereStep(page);

    const warmImg = page.getByTestId("atmosphere-card-image-warm");
    const neutraalImg = page.getByTestId("atmosphere-card-image-neutraal");
    await expect(warmImg).toBeVisible();
    await expect(neutraalImg).toBeVisible();
    await expect(warmImg).toHaveAttribute("src", /\/api\/cms\/images\//);
    await expect(neutraalImg).toHaveAttribute("src", /\/api\/cms\/images\//);

    const warmBox = await warmImg.boundingBox();
    expect(warmBox).toBeTruthy();
    if (warmBox) {
      const ratio = warmBox.width / warmBox.height;
      expect(ratio).toBeGreaterThan(1.5);
      expect(ratio).toBeLessThan(1.9);
    }
  });

  test("premium shows CMS image with overlay and stays disabled", async ({ page, request }) => {
    const premium = await uploadImage(request, "public-premium.png");
    await publishAtmosphereImages(request, { premium_architectural: premium.media.id });

    await openAtmosphereStep(page);

    const premiumCard = page.getByTestId("atmosphere-option-premium_architectural");
    const premiumImg = page.getByTestId("atmosphere-card-image-premium_architectural");
    await expect(premiumImg).toBeVisible();
    await expect(premiumImg).toHaveAttribute("src", /\/api\/cms\/images\//);
    await expect(page.getByTestId("atmosphere-premium-overlay-premium_architectural")).toBeVisible();
    await expect(page.getByTestId("atmosphere-premium-badge-premium_architectural")).toContainText(
      "ONLY PREMIUM",
    );
    await expect(premiumCard).toHaveAttribute("data-disabled", "true");
    await premiumCard.click({ force: true });
    await expect(page.getByTestId("wizard-next-button")).toBeDisabled();
  });

  test("fallback gradient shows when no image linked", async ({ page, request }) => {
    const draftRes = await request.get("/api/internal/cms?draft=1", {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const draft = (await draftRes.json()) as {
      site: { wizard: { atmosphereChoices: { id: string; imageId?: string }[] } };
    };
    const wizard = {
      ...draft.site.wizard,
      atmosphereChoices: draft.site.wizard.atmosphereChoices.map((choice) =>
        choice.id === "warm" ? { ...choice, mediaId: null, imageId: undefined } : choice,
      ),
    };
    await request.put("/api/internal/cms", {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, "Content-Type": "application/json" },
      data: { wizard },
    });
    await request.post("/api/internal/cms/publish", {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });

    await openAtmosphereStep(page);
    await expect(page.getByTestId("atmosphere-card-image-area-warm")).toBeVisible();
    await expect(page.getByTestId("atmosphere-card-image-warm")).toHaveCount(0);
  });
});
