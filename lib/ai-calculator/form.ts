export const AI_CALCULATOR_SUBMIT_ERROR_MESSAGE =
  "Het versturen is niet gelukt. Probeer het opnieuw of neem contact op met Lightsale.";

export const AI_CALCULATOR_SUCCESS_MESSAGE =
  "Bedankt voor uw aanvraag. We nemen zo snel mogelijk contact met u op.";

export interface AiCalculatorFormData {
  companyName: string;
  contactPerson: string;
  email: string;
  telephone: string;
  website: string;
  description: string;
  desiredTimeline: string;
  remarks: string;
}

export interface AiCalculatorApiResponse {
  success: boolean;
  message: string;
}

export function validateAiCalculatorForm(form: AiCalculatorFormData): string | null {
  if (!form.companyName.trim() || !form.contactPerson.trim()) {
    return "Vul alle verplichte velden in.";
  }
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return "Vul een geldig e-mailadres in.";
  }
  if (!form.description.trim()) {
    return "Vul een korte omschrijving van uw wens in.";
  }
  return null;
}

export function parseAiCalculatorApiResponse(response: Response, bodyText: string): AiCalculatorApiResponse {
  const contentType = response.headers.get("content-type") ?? "";
  if (!bodyText.trim()) {
    return { success: false, message: AI_CALCULATOR_SUBMIT_ERROR_MESSAGE };
  }
  if (!contentType.includes("application/json")) {
    return { success: false, message: AI_CALCULATOR_SUBMIT_ERROR_MESSAGE };
  }
  try {
    const data = JSON.parse(bodyText) as Record<string, unknown>;
    if (data.success === true && typeof data.message === "string") {
      return { success: true, message: data.message };
    }
    if (data.success === false && typeof data.message === "string") {
      return { success: false, message: AI_CALCULATOR_SUBMIT_ERROR_MESSAGE };
    }
    return { success: false, message: AI_CALCULATOR_SUBMIT_ERROR_MESSAGE };
  } catch {
    return { success: false, message: AI_CALCULATOR_SUBMIT_ERROR_MESSAGE };
  }
}
