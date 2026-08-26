import { test, expect } from "@playwright/test";
import {
  LEAD_SUBMIT_ERROR_MESSAGE,
  parseLeadApiResponse,
  resolveLeadContactDelivery,
  validateLeadForm,
} from "../lib/public-wizard/lead-form";
import type { LeadContactForm } from "../types/public-wizard";
import {
  advanceRoom,
  advanceAtmosphere,
  uploadFloorPlan,
  setupEditor,
  generateAndOpenResult,
} from "./helpers/wizard";

function validForm(overrides: Partial<LeadContactForm> = {}): LeadContactForm {
  return {
    companyName: "Test BV",
    contactPerson: "Jan Jansen",
    address: "Straat 1",
    postalCode: "1234 AB",
    city: "Amsterdam",
    telephone: "0612345678",
    email: "jan@test.nl",
    deliveryAddress: "",
    deliveryPostalCode: "",
    deliveryCity: "",
    projectName: "",
    remarks: "",
    desiredDeliveryDate: "",
    deliverySameAsCompany: true,
    privacyConsent: true,
    ...overrides,
  };
}

test.describe("Lead form logic", () => {
  test("deliverySameAsCompany defaults to valid with company address copied", () => {
    const form = validForm();
    expect(form.deliverySameAsCompany).toBe(true);
    const resolved = resolveLeadContactDelivery(form);
    expect(resolved.deliveryAddress).toBe("Straat 1");
    expect(resolved.deliveryPostalCode).toBe("1234 AB");
    expect(resolved.deliveryCity).toBe("Amsterdam");
    expect(validateLeadForm(resolved)).toBeNull();
  });

  test("delivery fields required only when checkbox is off", () => {
    const missingDelivery = validForm({
      deliverySameAsCompany: false,
      deliveryAddress: "",
      deliveryPostalCode: "",
      deliveryCity: "",
    });
    expect(validateLeadForm(missingDelivery)).toBe("Vul alle verplichte velden in.");

    const withDelivery = validForm({
      deliverySameAsCompany: false,
      deliveryAddress: "Andere straat 9",
      deliveryPostalCode: "5678 CD",
      deliveryCity: "Rotterdam",
    });
    expect(validateLeadForm(withDelivery)).toBeNull();
  });

  test("parseLeadApiResponse handles success JSON", () => {
    const response = new Response(JSON.stringify({ success: true, message: "Aanvraag ontvangen", reference: "LP-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const parsed = parseLeadApiResponse(response, JSON.stringify({ success: true, message: "Aanvraag ontvangen", reference: "LP-1" }));
    expect(parsed.success).toBe(true);
    expect(parsed.reference).toBe("LP-1");
  });

  test("parseLeadApiResponse handles error JSON without crashing", () => {
    const response = new Response(JSON.stringify({ success: false, message: "Er ging iets mis bij het versturen van uw aanvraag." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
    const parsed = parseLeadApiResponse(
      response,
      JSON.stringify({ success: false, message: "Er ging iets mis bij het versturen van uw aanvraag." }),
    );
    expect(parsed.success).toBe(false);
  });

  test("parseLeadApiResponse handles HTML and empty responses safely", () => {
    const html = new Response("<html>error</html>", { status: 502, headers: { "Content-Type": "text/html" } });
    expect(parseLeadApiResponse(html, "<html>error</html>").success).toBe(false);
    expect(parseLeadApiResponse(html, "<html>error</html>").message).toBe(LEAD_SUBMIT_ERROR_MESSAGE);

    const empty = new Response("", { status: 500, headers: { "Content-Type": "application/json" } });
    expect(parseLeadApiResponse(empty, "").success).toBe(false);
  });

  test("parseLeadApiResponse never exposes JSON.parse errors", () => {
    const bad = new Response("{not-json", { status: 500, headers: { "Content-Type": "application/json" } });
    const parsed = parseLeadApiResponse(bad, "{not-json");
    expect(parsed.success).toBe(false);
    expect(parsed.message).toBe(LEAD_SUBMIT_ERROR_MESSAGE);
    expect(parsed.message).not.toContain("JSON.parse");
  });
});

async function openRequestStep(page: import("@playwright/test").Page) {
  await advanceRoom(page);
  await advanceAtmosphere(page);
  await uploadFloorPlan(page);
  await setupEditor(page);
  await generateAndOpenResult(page);
  await page.getByRole("button", { name: "Aanvragen" }).click();
  await expect(page.getByText("Ontvang mijn lichtplan + projectofferte")).toBeVisible();
}

test.describe("Lead request form UI", () => {
  test("delivery fields hidden by default with checkbox checked", async ({ page }) => {
    await openRequestStep(page);
    await expect(page.getByTestId("delivery-same-checkbox")).toBeChecked();
    await expect(page.getByTestId("delivery-fields-section")).toHaveCount(0);
  });

  test("shows delivery fields when checkbox unchecked", async ({ page }) => {
    await openRequestStep(page);
    await page.getByTestId("delivery-same-checkbox").uncheck();
    await expect(page.getByTestId("delivery-fields-section")).toBeVisible();
    await expect(page.getByTestId("delivery-address")).toBeVisible();
  });

  test("rechecking hides delivery fields and clears validation errors", async ({ page }) => {
    await page.route("**/api/public-leads", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Aanvraag ontvangen", reference: "LP-TEST-RECHECK" }),
      });
    });
    await openRequestStep(page);
    await page.getByTestId("delivery-same-checkbox").uncheck();
    await page.getByRole("button", { name: "Ontvang lichtplan + offerte" }).click();
    await expect(page.getByTestId("lead-form-error")).toContainText("Vul alle verplichte velden in.");
    await page.getByTestId("delivery-same-checkbox").check();
    await expect(page.getByTestId("delivery-fields-section")).toHaveCount(0);
    await page.getByLabel("Bedrijfsnaam *").fill("Test BV");
    await page.getByLabel("Contactpersoon *").fill("Jan");
    await page.getByLabel("Adres *").fill("Straat 1");
    await page.getByLabel("Postcode *").fill("1234 AB");
    await page.getByLabel("Plaats *").fill("Amsterdam");
    await page.getByLabel("Telefoon *").fill("0612345678");
    await page.getByLabel("E-mail *").fill("jan@test.nl");
    await page.getByText("Ik ga akkoord").click();
    await page.getByRole("button", { name: "Ontvang lichtplan + offerte" }).click();
    await expect(page.getByTestId("lead-form-error")).not.toBeVisible();
  });

  test("shows friendly error on non-JSON API response", async ({ page }) => {
    await page.route("**/api/public-leads", async (route) => {
      await route.fulfill({ status: 502, contentType: "text/html", body: "<html>Bad Gateway</html>" });
    });
    await openRequestStep(page);
    await page.getByLabel("Bedrijfsnaam *").fill("Test BV");
    await page.getByLabel("Contactpersoon *").fill("Jan");
    await page.getByLabel("Adres *").fill("Straat 1");
    await page.getByLabel("Postcode *").fill("1234 AB");
    await page.getByLabel("Plaats *").fill("Amsterdam");
    await page.getByLabel("Telefoon *").fill("0612345678");
    await page.getByLabel("E-mail *").fill("jan@test.nl");
    await page.getByText("Ik ga akkoord").click();
    await page.getByRole("button", { name: "Ontvang lichtplan + offerte" }).click();
    await expect(page.getByTestId("lead-form-error")).toContainText(LEAD_SUBMIT_ERROR_MESSAGE);
    await expect(page.getByTestId("lead-form-error")).not.toContainText("JSON.parse");
  });

  test("submits successfully with deliverySameAsCompany true", async ({ page }) => {
    let postedBody: { contact: LeadContactForm } | null = null;
    await page.route("**/api/public-leads", async (route) => {
      postedBody = route.request().postDataJSON() as { contact: LeadContactForm };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Aanvraag ontvangen", reference: "LP-TEST-002" }),
      });
    });
    await openRequestStep(page);
    await page.getByLabel("Bedrijfsnaam *").fill("Test BV");
    await page.getByLabel("Contactpersoon *").fill("Jan");
    await page.getByLabel("Adres *").fill("Straat 1");
    await page.getByLabel("Postcode *").fill("1234 AB");
    await page.getByLabel("Plaats *").fill("Amsterdam");
    await page.getByLabel("Telefoon *").fill("0612345678");
    await page.getByLabel("E-mail *").fill("jan@test.nl");
    await page.getByText("Ik ga akkoord").click();
    await page.getByRole("button", { name: "Ontvang lichtplan + offerte" }).click();
    await expect(page.getByText("Bedankt voor uw aanvraag.")).toBeVisible();
    expect(postedBody?.contact.deliverySameAsCompany).toBe(true);
    expect(postedBody?.contact.deliveryAddress).toBe("Straat 1");
    expect(postedBody?.contact.deliveryCity).toBe("Amsterdam");
  });

  test("submits different delivery address when checkbox unchecked", async ({ page }) => {
    let postedBody: { contact: LeadContactForm } | null = null;
    await page.route("**/api/public-leads", async (route) => {
      postedBody = route.request().postDataJSON() as { contact: LeadContactForm };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Aanvraag ontvangen", reference: "LP-TEST-003" }),
      });
    });
    await openRequestStep(page);
    await page.getByLabel("Bedrijfsnaam *").fill("Test BV");
    await page.getByLabel("Contactpersoon *").fill("Jan");
    await page.getByLabel("Adres *").fill("Straat 1");
    await page.getByLabel("Postcode *").fill("1234 AB");
    await page.getByLabel("Plaats *").fill("Amsterdam");
    await page.getByLabel("Telefoon *").fill("0612345678");
    await page.getByLabel("E-mail *").fill("jan@test.nl");
    await page.getByTestId("delivery-same-checkbox").uncheck();
    await page.getByTestId("delivery-address").fill("Magazijnweg 99");
    await page.getByTestId("delivery-postal-code").fill("9999 ZZ");
    await page.getByTestId("delivery-city").fill("Utrecht");
    await page.getByText("Ik ga akkoord").click();
    await page.getByRole("button", { name: "Ontvang lichtplan + offerte" }).click();
    await expect(page.getByText("Bedankt voor uw aanvraag.")).toBeVisible();
    expect(postedBody?.contact.deliverySameAsCompany).toBe(false);
    expect(postedBody?.contact.deliveryAddress).toBe("Magazijnweg 99");
    expect(postedBody?.contact.deliveryCity).toBe("Utrecht");
  });
});
