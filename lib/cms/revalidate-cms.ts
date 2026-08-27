import { revalidatePath } from "next/cache";

const CMS_PUBLIC_PATHS = [
  "/",
  "/home",
  "/lichtadvies",
  "/kantoorverlichting",
  "/led-panelen",
  "/werkwijze",
  "/over-ons",
  "/contact",
  "/privacy",
  "/ai-calculator",
  "/api/cms/wizard",
  "/api/cms/images",
] as const;

export function revalidateCmsPublicRoutes(): void {
  for (const path of CMS_PUBLIC_PATHS) {
    revalidatePath(path);
  }
  revalidatePath("/", "layout");
}
