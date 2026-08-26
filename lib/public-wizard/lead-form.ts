import type { LeadContactForm } from "@/types/public-wizard";

export const LEAD_SUBMIT_ERROR_MESSAGE =
  "Het versturen is niet gelukt. Probeer het opnieuw of neem contact op met Lightsale.";

export const LEAD_SUBMIT_SUCCESS_MESSAGE = "Aanvraag ontvangen";

export interface LeadApiResponse {
  success: boolean;
  message: string;
  reference?: string;
  emailSent?: boolean;
}

export function resolveLeadContactDelivery(form: LeadContactForm): LeadContactForm {
  if (!form.deliverySameAsCompany) return form;
  return {
    ...form,
    deliveryAddress: form.address,
    deliveryPostalCode: form.postalCode,
    deliveryCity: form.city,
  };
}

export function validateLeadForm(form: LeadContactForm): string | null {
  const required: (keyof LeadContactForm)[] = [
    "companyName",
    "contactPerson",
    "address",
    "postalCode",
    "city",
    "telephone",
    "email",
  ];
  if (!form.deliverySameAsCompany) {
    required.push("deliveryAddress", "deliveryPostalCode", "deliveryCity");
  }
  for (const key of required) {
    const value = form[key];
    if (typeof value !== "string" || !value.trim()) {
      return "Vul alle verplichte velden in.";
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    return "Vul een geldig e-mailadres in.";
  }
  if (!form.privacyConsent) {
    return "Geef toestemming voor het verwerken van uw gegevens.";
  }
  return null;
}

export function parseLeadApiResponse(response: Response, bodyText: string): LeadApiResponse {
  const contentType = response.headers.get("content-type") ?? "";
  if (!bodyText.trim()) {
    return { success: false, message: LEAD_SUBMIT_ERROR_MESSAGE };
  }
  if (!contentType.includes("application/json")) {
    return { success: false, message: LEAD_SUBMIT_ERROR_MESSAGE };
  }
  try {
    const data = JSON.parse(bodyText) as Record<string, unknown>;
    if (data.success === true && typeof data.reference === "string") {
      return {
        success: true,
        message: typeof data.message === "string" ? data.message : LEAD_SUBMIT_SUCCESS_MESSAGE,
        reference: data.reference,
        emailSent: data.emailSent === true,
      };
    }
    if (data.ok === true && typeof data.reference === "string") {
      return {
        success: true,
        message: LEAD_SUBMIT_SUCCESS_MESSAGE,
        reference: data.reference,
        emailSent: data.emailSent === true,
      };
    }
    if (data.success === false && typeof data.message === "string") {
      return { success: false, message: data.message };
    }
    return { success: false, message: LEAD_SUBMIT_ERROR_MESSAGE };
  } catch {
    return { success: false, message: LEAD_SUBMIT_ERROR_MESSAGE };
  }
}
