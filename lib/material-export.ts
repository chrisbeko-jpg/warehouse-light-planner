/**
 * Export helper for PDF, Excel and Odoo integrations.
 * Returns the product-based material list in a flat export format.
 */
import type { LightLinePlan, MaterialExportLine } from "@/types";

export function getMaterialExport(plan: LightLinePlan): MaterialExportLine[] {
  return plan.productList.export;
}

export type { MaterialExportLine };
