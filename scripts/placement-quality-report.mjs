/**
 * Generates layout reports + SVG previews for many room/count combinations.
 * Run: npx tsx scripts/placement-quality-report.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { placeFixturesWithLayoutInfo } from "../lib/public-wizard/placement.ts";
import { placeElongatedPanelsOnModules } from "../lib/public-wizard/matrix-placement.ts";
import { describeFixtureMatrix } from "../lib/public-wizard/ceiling-grid.ts";
import { evaluateLayoutQuality } from "../lib/public-wizard/layout-quality.ts";

const PPM = 100;
const OUT = path.join("scripts", "output", "placement-quality");

function rect(lengthM, widthM, origin = 40) {
  return [
    { x: origin, y: origin },
    { x: origin + lengthM * PPM, y: origin },
    { x: origin + lengthM * PPM, y: origin + widthM * PPM },
    { x: origin, y: origin + widthM * PPM },
  ];
}

function boundsOf(vertices) {
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function svgFor(vertices, fixtures, label) {
  const b = boundsOf(vertices);
  const w = b.maxX - b.minX + 80;
  const h = b.maxY - b.minY + 80;
  const ox = 40 - b.minX;
  const oy = 40 - b.minY;
  const room = `<rect x="${ox}" y="${oy}" width="${b.maxX - b.minX}" height="${b.maxY - b.minY}" fill="#f8fafc" stroke="#334155" stroke-width="2"/>`;
  const dots = fixtures
    .map(
      (f) =>
        `<rect x="${f.x + ox - 25}" y="${f.y + oy - 25}" width="50" height="50" fill="#22c55e" fill-opacity="0.85" rx="4"/>`,
    )
    .join("");
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h + 24}"><text x="8" y="16" font-size="12" fill="#0f172a">${label}</text>${room}${dots}</svg>`;
}

const cases = [
  { id: "8x6-14", length: 8, width: 6, count: 14, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "10x7.5-21", length: 10, width: 7.5, count: 21, product: "led_panel_1200x300_4000", ceiling: "grid_1200_600", elongated: true },
  { id: "8x5-12", length: 8, width: 5, count: 12, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "6.5x3.2-3dl", length: 6.5, width: 3.2, count: 3, product: "downlight_4000", ceiling: "grid_600", lux: 250 },
  { id: "12x4-16", length: 12, width: 4, count: 16, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "5x5-9", length: 5, width: 5, count: 9, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "15x8-28", length: 15, width: 8, count: 28, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "8x6-5", length: 8, width: 6, count: 5, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "8x6-7", length: 8, width: 6, count: 7, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "8x6-11", length: 8, width: 6, count: 11, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "8x6-13", length: 8, width: 6, count: 13, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "8x6-17", length: 8, width: 6, count: 17, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "8x6-19", length: 8, width: 6, count: 19, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "8x6-21", length: 8, width: 6, count: 21, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "8x6-23", length: 8, width: 6, count: 23, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "9x4-10", length: 9, width: 4, count: 10, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "7x7-12", length: 7, width: 7, count: 12, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "10x10-25", length: 10, width: 10, count: 25, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "4x3-6", length: 4, width: 3, count: 6, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "11x6-18", length: 11, width: 6, count: 18, product: "led_panel_4000", ceiling: "grid_600" },
  { id: "8x6-concrete-10", length: 8, width: 6, count: 10, product: "led_panel_surface_4000", ceiling: "concrete", area: 48 },
];

fs.mkdirSync(OUT, { recursive: true });
const report = [];

for (const c of cases) {
  const vertices = rect(c.length, c.width);
  const ctx = {
    areaM2: c.area ?? c.length * c.width,
    targetLux: c.lux ?? 500,
    ceilingHeightM: 2.7,
    ceilingType: c.ceiling,
  };
  let layout;
  if (c.elongated) {
    layout = placeElongatedPanelsOnModules(vertices, PPM, c.count, c.product, ctx, c.ceiling);
  } else {
    layout = placeFixturesWithLayoutInfo(vertices, PPM, c.count, c.product, ctx);
  }
  const b = boundsOf(vertices);
  const quality = evaluateLayoutQuality(layout.fixtures, b);
  const matrix = describeFixtureMatrix(layout.fixtures);
  const entry = {
    id: c.id,
    placed: layout.placedCount,
    requested: c.count,
    matrix,
    quality: {
      score: quality.score,
      rejected: quality.rejected,
      reasons: quality.rejectionReasons,
      rowCount: quality.rowCount,
    },
  };
  report.push(entry);
  const svg = svgFor(vertices, layout.fixtures, `${c.id} · ${layout.placedCount} st · score ${quality.score.toFixed(1)}`);
  fs.writeFileSync(path.join(OUT, `${c.id}.svg`), svg);
}

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(`Wrote ${report.length} cases to ${OUT}`);
