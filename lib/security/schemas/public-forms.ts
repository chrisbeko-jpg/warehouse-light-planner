import { z } from "zod";

const nlPostal = z
  .string()
  .trim()
  .max(24)
  .regex(/^[0-9a-zA-Z \-.]+$/, "Ongeldige postcode");

const optionalNonEmpty = z
  .string()
  .trim()
  .max(5000)
  .optional()
  .transform((s) => (s === "" ? undefined : s));

export const honeypotFieldSchema = z
  .string()
  .optional()
  .transform((s) => (s ?? "").trim());

export const aiCalculatorPayloadSchema = z.object({
  _hp_company_site: honeypotFieldSchema,
  turnstileToken: z.string().min(1).max(4000).optional(),
  companyName: z.string().trim().min(1, "Vul alle verplichte velden in.").max(200),
  contactPerson: z.string().trim().min(1, "Vul alle verplichte velden in.").max(200),
  email: z.string().trim().email("Vul een geldig e-mailadres in.").max(254),
  telephone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[\d+()\s.\-]*$/, "Ongeldig telefoonnummer")
    .optional()
    .transform((s) => s ?? ""),
  website: z
    .string()
    .trim()
    .max(500)
    .refine(
      (s) => !s || z.string().url().safeParse(s).success,
      "Ongeldige website-URL",
    )
    .optional()
    .transform((s) => s ?? ""),
  description: z.string().trim().min(1, "Vul een korte omschrijving van uw wens in.").max(8000),
  desiredTimeline: optionalNonEmpty,
  remarks: optionalNonEmpty,
});

export type AiCalculatorPayload = z.infer<typeof aiCalculatorPayloadSchema>;

const point2d = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const obstacleSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string().max(80),
    kind: z.literal("wall"),
    start: point2d,
    end: point2d,
    thicknessM: z.number().positive().max(5),
  }),
  z.object({
    id: z.string().max(80),
    kind: z.literal("column"),
    center: point2d,
    radiusM: z.number().positive().max(25),
  }),
  z.object({
    id: z.string().max(80),
    kind: z.literal("rect"),
    center: point2d,
    widthM: z.number().positive().max(50),
    lengthM: z.number().positive().max(50),
    rotation: z.number().finite().optional(),
  }),
]);

const fixtureSchema = z.object({
  id: z.string().max(80),
  productId: z.string().max(80),
  x: z.number().finite(),
  y: z.number().finite(),
  rotation: z.number().finite(),
});

const roomFunctionId = z.enum([
  "workplace_office",
  "meeting_room",
  "reception_hall",
  "other_spaces",
]);

const atmosphereId = z.enum(["warm", "neutraal", "premium_architectural"]);
const ceilingTypeId = z.enum(["grid_600", "grid_1200_600", "concrete"]).nullable();
const inputMethod = z.enum(["floorplan", "dimensions"]);

const manualDimensions = z
  .object({
    lengthM: z.number().positive().max(500),
    widthM: z.number().positive().max(500),
    ceilingHeightM: z.number().positive().max(30),
  })
  .nullable();

export const leadContactPayloadSchema = z
  .object({
    companyName: z.string().trim().min(1).max(200),
    contactPerson: z.string().trim().min(1).max(200),
    address: z.string().trim().min(1).max(500),
    postalCode: nlPostal,
    city: z.string().trim().min(1).max(200),
    telephone: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[\d+()\s.\-]+$/, "Ongeldig telefoonnummer"),
    email: z.string().trim().email().max(254),
    deliveryAddress: z.string().trim().max(500),
    deliveryPostalCode: z.string().trim().max(24),
    deliveryCity: z.string().trim().max(200),
    projectName: z.string().trim().max(300).optional(),
    remarks: z.string().trim().max(8000).optional(),
    desiredDeliveryDate: z.string().trim().max(32).optional(),
    deliverySameAsCompany: z.boolean(),
    privacyConsent: z.boolean().refine((v) => v === true, {
      message: "Geef toestemming voor het verwerken van uw gegevens.",
    }),
  })
  .superRefine((data, ctx) => {
    if (!data.deliverySameAsCompany) {
      if (!data.deliveryAddress?.trim()) {
        ctx.addIssue({ code: "custom", path: ["deliveryAddress"], message: "Vul alle verplichte velden in." });
      }
      if (!data.deliveryPostalCode?.trim()) {
        ctx.addIssue({ code: "custom", path: ["deliveryPostalCode"], message: "Vul alle verplichte velden in." });
      }
      if (!data.deliveryCity?.trim()) {
        ctx.addIssue({ code: "custom", path: ["deliveryCity"], message: "Vul alle verplichte velden in." });
      }
    }
  });

export const publicLeadPayloadSchema = z.object({
  _hp_company_site: honeypotFieldSchema,
  turnstileToken: z.string().min(1).max(4000).optional(),
  contact: leadContactPayloadSchema,
  roomFunction: roomFunctionId,
  ceilingHeightM: z.number().min(2).max(20),
  targetLux: z.number().int().min(50).max(2000),
  atmosphere: atmosphereId,
  ceilingType: ceilingTypeId,
  preferredProductId: z.string().max(80),
  fixtures: z.array(fixtureSchema).max(500),
  obstacles: z.array(obstacleSchema).max(200).optional(),
  roomVertices: z.array(point2d).min(3).max(2000),
  pixelsPerMeter: z.number().positive().max(5000),
  inputMethod: inputMethod,
  manualDimensions: manualDimensions,
  requiredFixtureCount: z.number().int().positive().max(2000).nullable().optional(),
  floorPlanDataUrl: z.union([
    z
      .string()
      .max(25_000_000)
      .refine(
        (s) => s.startsWith("data:image/") && s.length > 20,
        "Ongeldige plattegrond-data",
      ),
    z.null(),
  ]),
  lightPlanImageBase64: z.union([z.string().max(16_000_000), z.null()]).optional(),
  heatmapImageBase64: z.union([z.string().max(16_000_000), z.null()]).optional(),
});

export type PublicLeadPayload = z.infer<typeof publicLeadPayloadSchema>;
