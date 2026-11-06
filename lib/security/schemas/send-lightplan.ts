import { z } from "zod";

export const sendLightplanPayloadSchema = z.object({
  _hp_company_site: z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim()),
  turnstileToken: z.string().min(1).max(4000).optional(),
  email: z.string().trim().email().max(254),
  projectName: z.string().trim().max(300).optional(),
  length: z.number().positive().max(500),
  width: z.number().positive().max(500),
  height: z.number().positive().max(30),
  lux: z.number().min(50).max(2000),
  lineFillMode: z.string().max(80),
  mountingSystem: z.string().max(120),
  totalExVat: z.number().min(0).max(1e9),
  materialLines: z
    .array(
      z.object({
        sku: z.string().max(80),
        description: z.string().max(500),
        quantity: z.number().int().min(0).max(1e6),
        unitPrice: z.number().min(0).max(1e9),
        totalPrice: z.number().min(0).max(1e9),
      }),
    )
    .max(500),
  pdfBase64: z.string().max(16_000_000).optional(),
  pdfFilename: z.string().max(200).optional(),
});

export type SendLightplanPayload = z.infer<typeof sendLightplanPayloadSchema>;
