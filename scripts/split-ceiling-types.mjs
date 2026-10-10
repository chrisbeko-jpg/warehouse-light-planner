import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const src =
  "C:/Users/chris/.cursor/projects/c-Users-chris-Documents-Warehouse-Light-Planner/assets/c__Users_chris_AppData_Roaming_Cursor_User_workspaceStorage_08f58a03e10909ca99ec0fbed38890c9_images_plafondtypes-23618647-f295-4df1-8086-f08e04d5c244.jpg";

const outDir = path.resolve(process.cwd(), "public/images/ceiling-types");
await mkdir(outDir, { recursive: true });

const image = sharp(src);
const meta = await image.metadata();
const width = meta.width ?? 0;
const height = meta.height ?? 0;
if (!width || !height) throw new Error("Missing image dimensions");

const panelWidth = Math.floor(width / 3);
const visualHeight = Math.floor(height * 0.62);
const targetWidth = 640;
const targetHeight = 480;

const outputs = [
  { name: "plafond-60x60.webp", index: 0 },
  { name: "plafond-120x60.webp", index: 1 },
  { name: "plafond-beton.webp", index: 2 },
];

for (const { name, index } of outputs) {
  const left = index * panelWidth;
  const extractWidth = index === 2 ? width - left : panelWidth;
  await sharp(src)
    .extract({ left, top: 0, width: extractWidth, height: visualHeight })
    .resize(targetWidth, targetHeight, { fit: "cover", position: "centre" })
    .webp({ quality: 86 })
    .toFile(path.join(outDir, name));
  console.log("Wrote", name, { left, extractWidth, visualHeight, targetWidth, targetHeight });
}

console.log("Source", { width, height, panelWidth, visualHeight });
