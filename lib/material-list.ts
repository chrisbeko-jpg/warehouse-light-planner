import {
  getModuleProduct,
  getMountingProduct,
  PRODUCT_BY_SKU,
  SKU_ENDCAP,
  SKU_FEED,
  SKU_RAIL_1_5M,
  SKU_RAIL_3M,
} from "@/data/products";
import type {
  LightLine,
  MaterialExportLine,
  MaterialListItem,
  MaterialListResult,
  MaterialTotals,
  MountingSystem,
} from "@/types";

interface QuantityEntry {
  sku: string;
  quantity: number;
}

function buildLineItem(sku: string, quantity: number): MaterialListItem | null {
  if (quantity <= 0) return null;

  const product = PRODUCT_BY_SKU[sku];
  if (!product) return null;

  const totalPrice = product.price * quantity;

  return {
    sku: product.sku,
    name: product.name,
    description: product.name,
    image: product.image,
    quantity,
    unitPrice: product.price,
    totalPrice,
  };
}

function aggregateQuantities(entries: QuantityEntry[]): MaterialListItem[] {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    totals.set(entry.sku, (totals.get(entry.sku) ?? 0) + entry.quantity);
  }

  const displayOrder = [
    SKU_RAIL_3M,
    SKU_RAIL_1_5M,
    SKU_FEED,
    SKU_ENDCAP,
    "116238",
    "116237",
    "116350",
    "116351",
  ];

  const items: MaterialListItem[] = [];

  for (const sku of displayOrder) {
    const quantity = totals.get(sku);
    if (!quantity) continue;
    const item = buildLineItem(sku, quantity);
    if (item) items.push(item);
  }

  return items;
}

export function buildMaterialListFromLines(
  lines: LightLine[],
  mountingSystem: MountingSystem,
  warehouseHeight: number,
  installedPowerW: number,
): MaterialListResult {
  const rails3m = lines.reduce((sum, line) => sum + line.rails3m, 0);
  const rails1_5m = lines.reduce((sum, line) => sum + line.rails1_5m, 0);
  const modules = lines.reduce((sum, line) => sum + line.modules, 0);
  const blankPlates = lines.reduce((sum, line) => sum + line.blankPlates, 0);
  const powerFeeds = lines.length;
  const endCaps = lines.length;
  const mountingSets = lines.reduce((sum, line) => sum + line.hangerCount, 0);
  const moduleProduct = getModuleProduct(warehouseHeight);
  const mountingProduct = getMountingProduct(mountingSystem);

  const entries: QuantityEntry[] = [
    { sku: SKU_RAIL_3M, quantity: rails3m },
    { sku: SKU_RAIL_1_5M, quantity: rails1_5m },
    { sku: SKU_FEED, quantity: powerFeeds },
    { sku: SKU_ENDCAP, quantity: endCaps },
    { sku: moduleProduct.sku, quantity: modules },
    { sku: mountingProduct.sku, quantity: mountingSets },
  ];

  return finalizeMaterialList(
    entries,
    modules,
    blankPlates,
    installedPowerW,
    installedPowerW,
    modules > 0 ? Math.round(installedPowerW / modules) : 60,
  );
}

export function buildMaterialListFromTotals(
  materials: MaterialTotals,
  warehouseHeight: number,
  totalBlankPlates = materials.blankPlates,
): MaterialListResult {
  const moduleProduct = getModuleProduct(warehouseHeight);
  const mountingProduct = getMountingProduct(materials.mountingSystem);

  const entries: QuantityEntry[] = [
    { sku: SKU_RAIL_3M, quantity: materials.rails3m },
    { sku: SKU_RAIL_1_5M, quantity: materials.rails1_5m },
    { sku: SKU_FEED, quantity: materials.powerFeeds },
    { sku: SKU_ENDCAP, quantity: materials.endCaps },
    { sku: moduleProduct.sku, quantity: materials.ledModules },
    { sku: mountingProduct.sku, quantity: materials.mountingSets },
  ];

  return finalizeMaterialList(
    entries,
    materials.ledModules,
    totalBlankPlates,
    materials.installedPowerW,
    materials.advisedTotalPowerW,
    summaryAdvisedWattsPerModule(materials),
  );
}

function summaryAdvisedWattsPerModule(materials: MaterialTotals): number {
  if (materials.ledModules <= 0) return 60;
  return Math.round(materials.advisedTotalPowerW / materials.ledModules);
}

const VAT_RATE = 0.21;

function finalizeMaterialList(
  entries: QuantityEntry[],
  totalLedModules: number,
  totalBlankPlates: number,
  installedPowerW: number,
  advisedTotalPowerW: number,
  advisedWattsPerModule: number,
): MaterialListResult {
  const items = aggregateQuantities(entries);
  const exportLines: MaterialExportLine[] = items.map(
    ({ sku, description, quantity, unitPrice, totalPrice }) => ({
      sku,
      description,
      quantity,
      unitPrice,
      totalPrice,
    }),
  );

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const vatAmount = subtotal * VAT_RATE;
  const totalParts = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    export: exportLines,
    subtotal,
    vatAmount,
    totalInclVat: subtotal + vatAmount,
    totalParts,
    totalLedModules,
    totalBlankPlates,
    installedPowerW,
    advisedWattsPerModule,
    advisedTotalPowerW,
  };
}

export function calculateProductMaterialCost(
  lines: LightLine[],
  mountingSystem: MountingSystem,
  warehouseHeight: number,
  installedPowerW: number,
): number {
  return buildMaterialListFromLines(lines, mountingSystem, warehouseHeight, installedPowerW)
    .subtotal;
}
