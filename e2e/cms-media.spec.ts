import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import {
  validateMediaUpload,
  inferMimeType,
  MAX_MEDIA_BYTES,
} from "../lib/cms/media-upload";
import {
  isBlobStorageConfigured,
  LEDPANEEL_BLOB_ENV,
} from "../lib/cms/blob-config";
import { createTestPng } from "./helpers/wizard";

const ADMIN_TOKEN = "playwright-test-token";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/internal/login?next=/internal/content/media");
  await page.getByLabel("Admin token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page).toHaveURL(/\/internal\/content\/media/);
}

test.describe("CMS media upload logic", () => {
  test("validateMediaUpload rejects unsupported types", () => {
    expect(
      validateMediaUpload({ filename: "file.gif", mimeType: "image/gif", size: 1000 }),
    ).toBe("Dit bestandstype wordt niet ondersteund.");
  });

  test("validateMediaUpload rejects oversized files", () => {
    expect(
      validateMediaUpload({
        filename: "big.jpg",
        mimeType: "image/jpeg",
        size: MAX_MEDIA_BYTES + 1,
      }),
    ).toBe("De afbeelding is te groot.");
  });

  test("inferMimeType accepts jpeg extension", () => {
    expect(inferMimeType("photo.jpeg", "application/octet-stream")).toBe("image/jpeg");
  });

  test("isBlobStorageConfigured uses ledpaneel_READ_WRITE_TOKEN", () => {
    const key = LEDPANEEL_BLOB_ENV.READ_WRITE_TOKEN;
    const previous = process.env[key];
    process.env[key] = "test-ledpaneel-token";
    expect(isBlobStorageConfigured()).toBe(true);
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  });
});

test.describe("CMS media library UI", () => {
  test("shows upload panel after choosing file without auto-upload", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByTestId("media-upload-submit")).toHaveCount(0);

    const pngPath = path.join(test.info().outputDir, "cms-upload-test.png");
    fs.mkdirSync(path.dirname(pngPath), { recursive: true });
    fs.writeFileSync(pngPath, createTestPng());

    await page.getByTestId("media-choose-file").click();
    await page.getByTestId("media-file-input").setInputFiles(pngPath);

    await expect(page.getByTestId("media-upload-panel")).toBeVisible();
    await expect(page.getByTestId("media-upload-preview")).toBeVisible();
    await expect(page.getByTestId("media-upload-filename")).toContainText("cms-upload-test.png");
    await expect(page.getByTestId("media-upload-submit")).toBeEnabled();
    await expect(page.getByTestId("media-upload-submit")).toHaveText("Uploaden naar mediabibliotheek");
  });

  test("upload button disabled without selected file", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByTestId("media-upload-submit")).toHaveCount(0);
    await expect(page.getByTestId("media-choose-file")).toHaveText("Browse");
  });

  test("uploads image and shows it in media grid", async ({ page }) => {
    await loginAsAdmin(page);
    const pngPath = path.join(test.info().outputDir, "cms-upload-success.png");
    fs.mkdirSync(path.dirname(pngPath), { recursive: true });
    fs.writeFileSync(pngPath, createTestPng());

    await page.getByTestId("media-choose-file").click();
    await page.getByTestId("media-file-input").setInputFiles(pngPath);
    await page.getByTestId("media-upload-alt").fill("Test alt tekst");
    await page.getByTestId("media-upload-submit").click();

    await expect(page.getByText("Afbeelding opgeslagen")).toBeVisible();
    await expect(page.getByTestId("media-library-grid").locator("article")).not.toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId("media-library-grid").locator("article")).not.toHaveCount(0);
  });

  test("uploaded media appears in wizard room ImageSelect", async ({ page, request }) => {
    const uploadRes = await request.post("/api/internal/media", {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      multipart: {
        file: {
          name: "room.png",
          mimeType: "image/png",
          buffer: createTestPng(),
        },
        title: "Room test image",
        altText: "Room alt",
      },
    });
    expect(uploadRes.ok()).toBeTruthy();
    const uploadData = (await uploadRes.json()) as { success: boolean; media: { id: string } };
    expect(uploadData.success).toBe(true);

    await loginAsAdmin(page);
    await page.goto("/internal/content/wizard/rooms");
    await expect(page.locator(`select option[value="${uploadData.media.id}"]`)).not.toHaveCount(0);
  });

  test("uploaded media appears in wizard atmosphere ImageSelect", async ({ page, request }) => {
    const uploadRes = await request.post("/api/internal/media", {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      multipart: {
        file: {
          name: "atmosphere.png",
          mimeType: "image/png",
          buffer: createTestPng(),
        },
        title: "Atmosphere test image",
        altText: "Atmosphere alt",
      },
    });
    expect(uploadRes.ok()).toBeTruthy();
    const uploadData = (await uploadRes.json()) as { success: boolean; media: { id: string } };
    expect(uploadData.success).toBe(true);

    await loginAsAdmin(page);
    await page.goto("/internal/content/wizard/atmospheres");
    await expect(page.locator(`select option[value="${uploadData.media.id}"]`)).not.toHaveCount(0);
  });

  test("API returns readable error for invalid file type", async ({ request }) => {
    const response = await request.post("/api/internal/media", {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      multipart: {
        file: {
          name: "bad.gif",
          mimeType: "image/gif",
          buffer: Buffer.from("gif"),
        },
        altText: "x",
        title: "x",
      },
    });
    expect(response.status()).toBe(400);
    const data = (await response.json()) as { success: boolean; message: string };
    expect(data.success).toBe(false);
    expect(data.message).toContain("bestandstype");
  });

  test("API success response is valid JSON contract", async ({ request }) => {
    const response = await request.post("/api/internal/media", {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      multipart: {
        file: {
          name: "contract.png",
          mimeType: "image/png",
          buffer: createTestPng(),
        },
        altText: "Contract",
        title: "Contract",
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = (await response.json()) as {
      success: boolean;
      message: string;
      media: { id: string; url: string; filename: string; mimeType: string; size: number };
    };
    expect(data.success).toBe(true);
    expect(data.media.id).toMatch(/^img-/);
    expect(data.media.url).toContain("/api/cms/images/");
    expect(data.media.mimeType).toBe("image/png");
    expect(data.media.size).toBeGreaterThan(0);
  });
});
