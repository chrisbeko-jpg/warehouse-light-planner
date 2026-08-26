import { test, expect } from "@playwright/test";
import {
  AI_CALCULATOR_SUBMIT_ERROR_MESSAGE,
  parseAiCalculatorApiResponse,
  validateAiCalculatorForm,
} from "../lib/ai-calculator/form";
import { advanceRoom, startWizard, selectRoom } from "./helpers/wizard";

test.describe("Atmosphere step", () => {
  async function openAtmosphereStep(page: import("@playwright/test").Page) {
    await startWizard(page);
    await selectRoom(page, "open_kantoor");
    await page.getByTestId("wizard-next-button").click();
    await expect(page.getByRole("heading", { name: "Welke sfeer zoekt u?" })).toBeVisible();
  }

  test("warm and neutraal are selectable", async ({ page }) => {
    await openAtmosphereStep(page);
    await page.getByTestId("atmosphere-option-warm").click();
    await expect(page.getByTestId("atmosphere-option-warm")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("atmosphere-option-neutraal").click();
    await expect(page.getByTestId("atmosphere-option-neutraal")).toHaveAttribute("aria-pressed", "true");
  });

  test("premium card visible but disabled", async ({ page }) => {
    await openAtmosphereStep(page);
    const premium = page.getByTestId("atmosphere-option-premium_architectural");
    await expect(premium).toBeVisible();
    await expect(premium).toHaveAttribute("data-disabled", "true");
    await expect(premium).toContainText("ONLY PREMIUM");
  });

  test("premium click does nothing", async ({ page }) => {
    await openAtmosphereStep(page);
    await page.getByTestId("atmosphere-option-premium_architectural").click({ force: true });
    await expect(page).toHaveURL(/\/lichtadvies/);
    await expect(page.getByTestId("wizard-next-button")).toBeDisabled();
  });

  test("next works after warm selection", async ({ page }) => {
    await openAtmosphereStep(page);
    await page.getByTestId("atmosphere-option-warm").click();
    await page.getByTestId("wizard-next-button").click();
    await expect(page.getByText(/plattegrond/i).first()).toBeVisible();
  });

  test("next works after neutraal selection", async ({ page }) => {
    await openAtmosphereStep(page);
    await page.getByTestId("atmosphere-option-neutraal").click();
    await page.getByTestId("wizard-next-button").click();
    await expect(page.getByText(/plattegrond/i).first()).toBeVisible();
  });

  test("next label mentions upload plattegrond", async ({ page }) => {
    await openAtmosphereStep(page);
    await expect(page.getByTestId("wizard-next-button")).toContainText("Volgende: upload plattegrond");
  });

  test("wizard CMS serves premium disabled", async ({ request }) => {
    const res = await request.get("/api/cms/wizard");
    expect(res.ok()).toBeTruthy();
    const data = (await res.json()) as {
      atmosphereChoices: { id: string; enabled: boolean; badgeText?: string }[];
    };
    const premium = data.atmosphereChoices.find((c) => c.id === "premium_architectural");
    expect(premium).toBeTruthy();
    expect(premium?.enabled).toBe(false);
    expect(premium?.badgeText).toBe("ONLY PREMIUM");
  });
});

test.describe("AI Calculator B2B", () => {
  test("homepage shows B2B CTA below main content", async ({ page }) => {
    await page.goto("/home");
    const hero = page.getByRole("heading", { name: /Van plattegrond naar lichtplan met AI/i });
    const b2b = page.getByTestId("ai-calculator-cta");
    await expect(hero).toBeVisible();
    await expect(b2b).toBeVisible();
    await expect(b2b.getByRole("heading", { name: "Uw eigen AI lichtcalculator?" })).toBeVisible();
    const heroBox = await hero.boundingBox();
    const b2bBox = await b2b.boundingBox();
    expect((b2bBox?.y ?? 0) > (heroBox?.y ?? 0)).toBeTruthy();
  });

  test("homepage primary CTA remains AI Lichtadvies", async ({ page }) => {
    await page.goto("/home");
    const primary = page.getByRole("link", { name: "Start gratis AI Lichtadvies" }).first();
    await expect(primary).toBeVisible();
    await expect(primary).toHaveAttribute("href", "/lichtadvies");
  });

  test("B2B CTA opens ai-calculator page", async ({ page }) => {
    await page.goto("/home");
    await page.getByTestId("ai-calculator-cta").getByRole("link", { name: "Neem contact met ons op" }).click();
    await expect(page).toHaveURL(/\/ai-calculator/);
    await expect(page.getByRole("heading", { name: "Uw eigen AI lichtcalculator", level: 1 })).toBeVisible();
  });

  test("ai-calculator form submits successfully", async ({ page }) => {
    await page.route("**/api/ai-calculator", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Bedankt voor uw aanvraag. We nemen zo snel mogelijk contact met u op.",
        }),
      });
    });
    await page.goto("/ai-calculator");
    await page.getByTestId("ai-calc-company").fill("Test BV");
    await page.getByTestId("ai-calc-contact").fill("Jan");
    await page.getByTestId("ai-calc-email").fill("jan@test.nl");
    await page.getByTestId("ai-calc-description").fill("Eigen calculator voor groothandel.");
    await page.getByTestId("ai-calculator-submit").click();
    await expect(page.getByTestId("ai-calculator-success")).toBeVisible();
  });
});

test.describe("AI Calculator form logic", () => {
  test("validateAiCalculatorForm requires core fields", () => {
    expect(validateAiCalculatorForm({
      companyName: "",
      contactPerson: "Jan",
      email: "a@b.nl",
      telephone: "",
      website: "",
      description: "Test",
      desiredTimeline: "",
      remarks: "",
    })).toBeTruthy();
  });

  test("parseAiCalculatorApiResponse handles non-JSON safely", () => {
    const response = new Response("<html>error</html>", { status: 502, headers: { "Content-Type": "text/html" } });
    const parsed = parseAiCalculatorApiResponse(response, "<html>error</html>");
    expect(parsed.success).toBe(false);
    expect(parsed.message).toBe(AI_CALCULATOR_SUBMIT_ERROR_MESSAGE);
  });
});
