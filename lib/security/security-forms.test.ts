import assert from "node:assert/strict";
import test from "node:test";
import { aiCalculatorPayloadSchema, publicLeadPayloadSchema } from "@/lib/security/schemas/public-forms";

test("ai calculator schema rejects XSS email", () => {
  const res = aiCalculatorPayloadSchema.safeParse({
    companyName: "A",
    contactPerson: "B",
    email: "evil<script>@x.com",
    description: "test",
    _hp_company_site: "",
  });
  assert.equal(res.success, false);
});

test("honeypot field triggers when non-empty", () => {
  const p = aiCalculatorPayloadSchema.parse({
    companyName: "A",
    contactPerson: "B",
    email: "a@b.com",
    description: "ok",
    _hp_company_site: "http://spam.com",
  });
  assert.ok((p._hp_company_site?.length ?? 0) > 0);
});

test("public lead schema accepts minimal valid manual-only payload shape", () => {
  const res = publicLeadPayloadSchema.safeParse({
    _hp_company_site: "",
    contact: {
      companyName: "ACME",
      contactPerson: "Jane",
      address: "Str 1",
      postalCode: "1234 AB",
      city: "Utrecht",
      telephone: "+31 6 12345678",
      email: "j@example.com",
      deliveryAddress: "",
      deliveryPostalCode: "",
      deliveryCity: "",
      deliverySameAsCompany: true,
      privacyConsent: true,
    },
    roomFunction: "workplace_office",
    ceilingHeightM: 2.7,
    targetLux: 500,
    atmosphere: "neutraal",
    ceilingType: "grid_600",
    preferredProductId: "led_panel_4000",
    fixtures: [],
    roomVertices: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ],
    pixelsPerMeter: 50,
    inputMethod: "dimensions",
    manualDimensions: { lengthM: 5, widthM: 4, ceilingHeightM: 2.7 },
    floorPlanDataUrl: null,
  });
  assert.equal(res.success, true);
});
