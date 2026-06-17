export type ProductCategory =
  | "rail"
  | "feed"
  | "endcap"
  | "mounting"
  | "pendel"
  | "module90"
  | "module120";

export interface Product {
  sku: string;
  name: string;
  price: number;
  image: string;
  category: ProductCategory;
}

export const PRODUCTS: Product[] = [
  {
    sku: "116244",
    name: "Draagrails 1,5 meter 7 aderig",
    price: 45.0,
    image: "/products/rail-1_5m.jpg",
    category: "rail",
  },
  {
    sku: "116245",
    name: "Draagrails 3,0 meter 7 aderig",
    price: 89.5,
    image: "/products/rail-3m.jpg",
    category: "rail",
  },
  {
    sku: "116347",
    name: "Aansluitvoeding 230V",
    price: 34.5,
    image: "/products/feed.jpg",
    category: "feed",
  },
  {
    sku: "116333",
    name: "Eindstuk 230V",
    price: 29.5,
    image: "/products/endcap.jpg",
    category: "endcap",
  },
  {
    sku: "116351",
    name: "Montagebeugel",
    price: 2.95,
    image: "/products/mounting.jpg",
    category: "mounting",
  },
  {
    sku: "116350",
    name: "Pendelset 2 meter",
    price: 9.5,
    image: "/products/mounting.jpg",
    category: "pendel",
  },
  {
    sku: "116237",
    name: "LED Module 1,5m 30-60W 5000K 90 graden",
    price: 145.0,
    image: "/products/module.jpg",
    category: "module90",
  },
  {
    sku: "116238",
    name: "LED Module 1,5m 30-60W 5000K 120 graden",
    price: 145.0,
    image: "/products/module.jpg",
    category: "module120",
  },
];

export const PRODUCT_BY_SKU = Object.fromEntries(
  PRODUCTS.map((product) => [product.sku, product]),
) as Record<string, Product>;

export const SKU_RAIL_1_5M = "116244";
export const SKU_RAIL_3M = "116245";
export const SKU_FEED = "116347";
export const SKU_ENDCAP = "116333";
export const SKU_MOUNTING = "116351";
export const SKU_PENDEL = "116350";
export const SKU_MODULE_90 = "116237";
export const SKU_MODULE_120 = "116238";

export function getModuleProduct(warehouseHeight: number): Product {
  return warehouseHeight <= 6
    ? PRODUCT_BY_SKU[SKU_MODULE_120]
    : PRODUCT_BY_SKU[SKU_MODULE_90];
}

export function getMountingProduct(mountingSystem: "staalkabel" | "montagebeugel"): Product {
  return mountingSystem === "staalkabel"
    ? PRODUCT_BY_SKU[SKU_PENDEL]
    : PRODUCT_BY_SKU[SKU_MOUNTING];
}
