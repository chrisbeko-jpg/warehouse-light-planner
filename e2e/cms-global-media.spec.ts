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

async function publishHomepageMedia(
  request: import("@playwright/test").APIRequestContext,
  payload: {
    heroMediaId?: string;
    exampleMediaIds?: string[];
    productMediaIds?: string[];
  },
) {
  const draftRes = await request.get("/api/internal/cms?draft=1", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  expect(draftRes.ok()).toBeTruthy();
  const draft = (await draftRes.json()) as {
    site: {
      homepage: {
        blocks: Array<Record<string, unknown> & { id: string; type: string }>;
      };
    };
  };

  const homepage = {
    ...draft.site.homepage,
    blocks: draft.site.homepage.blocks.map((block) => {
      if (block.id === "hero" && block.type === "hero" && payload.heroMediaId) {
        return { ...block, mediaId: payload.heroMediaId, imageId: payload.heroMediaId };
      }
      if (block.id === "example" && block.type === "example" && payload.exampleMediaIds) {
        const resultExamples = payload.exampleMediaIds.map((mediaId, index) => ({
          mediaId,
          title: `Voorbeeld ${index + 1}`,
        }));
        while (resultExamples.length < 4) resultExamples.push({ mediaId: null });
        return {
          ...block,
          resultExamples: resultExamples.slice(0, 4),
          imageIds: payload.exampleMediaIds,
        };
      }
      if (block.id === "products" && block.type === "products" && payload.productMediaIds) {
        const items = (block.items as { name: string; description: string }[]).map((item, index) => ({
          ...item,
          mediaId: payload.productMediaIds?.[index] ?? null,
          imageId: payload.productMediaIds?.[index],
        }));
        return { ...block, items };
      }
      return block;
    }),
  };

  const saveRes = await request.put("/api/internal/cms", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, "Content-Type": "application/json" },
    data: { pageSlug: "homepage", page: homepage },
  });
  expect(saveRes.ok()).toBeTruthy();

  const publishRes = await request.post("/api/internal/cms/publish", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  expect(publishRes.ok()).toBeTruthy();
}

async function publishWizardMedia(
  request: import("@playwright/test").APIRequestContext,
  mediaIds: Record<string, string>,
) {
  const draftRes = await request.get("/api/internal/cms?draft=1", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  const draft = (await draftRes.json()) as {
    site: {
      wizard: {
        roomChoices: { id: string; mediaId?: string; imageId?: string }[];
        atmosphereChoices: { id: string; mediaId?: string; imageId?: string }[];
      };
    };
  };

  const wizard = {
    roomChoices: draft.site.wizard.roomChoices.map((choice) => {
      const mediaId = mediaIds[choice.id];
      return mediaId ? { ...choice, mediaId, imageId: mediaId } : choice;
    }),
    atmosphereChoices: draft.site.wizard.atmosphereChoices.map((choice) => {
      const mediaId = mediaIds[choice.id];
      return mediaId ? { ...choice, mediaId, imageId: mediaId } : choice;
    }),
  };

  await request.put("/api/internal/cms", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, "Content-Type": "application/json" },
    data: { wizard },
  });
  await request.post("/api/internal/cms/publish", {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
}

test.describe("Global CMS media pipeline", () => {
  test("homepage hero, 4 examples, and 4 products render after publish", async ({ page, request }) => {
    const images = [];
    for (const name of [
      "hero-global.png",
      "example-1.png",
      "example-2.png",
      "example-3.png",
      "example-4.png",
      "product-1.png",
      "product-2.png",
      "product-3.png",
      "product-4.png",
    ]) {
      images.push(await uploadImage(request, name));
    }

    await publishHomepageMedia(request, {
      heroMediaId: images[0]!.media.id,
      exampleMediaIds: images.slice(1, 5).map((item) => item.media.id),
      productMediaIds: images.slice(5, 9).map((item) => item.media.id),
    });

    await page.goto("/home");
    await expect(page.getByTestId("homepage-hero-image")).toHaveAttribute(
      "src",
      new RegExp(images[0]!.media.id),
    );

    for (let i = 0; i < 4; i += 1) {
      await expect(page.getByTestId(`example-image-${i}`)).toHaveAttribute(
        "src",
        new RegExp(images[i + 1]!.media.id),
      );
    }

    for (let i = 0; i < 4; i += 1) {
      await expect(page.getByTestId(`product-image-${i}`)).toHaveAttribute(
        "src",
        new RegExp(images[i + 5]!.media.id),
      );
    }
  });

  test("wizard room, warm, and premium images render publicly", async ({ page, request }) => {
    const room = await uploadImage(request, "room-global.png");
    const warm = await uploadImage(request, "warm-global.png");
    const premium = await uploadImage(request, "premium-global.png");

    await publishWizardMedia(request, {
      open_kantoor: room.media.id,
      warm: warm.media.id,
      premium_architectural: premium.media.id,
    });

    await startWizard(page);
    await expect(page.getByTestId("room-option-open_kantoor").locator("img")).toHaveAttribute(
      "src",
      new RegExp(room.media.id),
    );

    await selectRoom(page, "open_kantoor");
    await page.getByTestId("wizard-next-button").click();

    await expect(page.getByTestId("atmosphere-card-image-warm")).toHaveAttribute(
      "src",
      new RegExp(warm.media.id),
    );
    await expect(page.getByTestId("atmosphere-card-image-premium_architectural")).toHaveAttribute(
      "src",
      new RegExp(premium.media.id),
    );
    await expect(page.getByTestId("atmosphere-premium-overlay-premium_architectural")).toBeVisible();
  });

  test("public routes stay healthy after media publish", async ({ request }) => {
    for (const path of ["/home", "/lichtadvies", "/kantoorverlichting"]) {
      expect((await request.get(path)).status()).toBe(200);
    }
  });
});
