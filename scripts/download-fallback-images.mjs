import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BASE = "https://www.ledtoppers.nl";
const OUT_DIR = path.join("public", "ledpaneel", "images");

/** Source paths on ledtoppers.nl → local SEO-friendly WebP filenames */
const SOURCES = {
  "kantoorverlichting-hero.webp": "/_Files_Gallery/68-img-verlichting-makelaarskantoor-WEB.webp",
  "kantoorverlichting-warm.webp": "/_Files_Gallery/67-img-kam-en-bronotte-lelystad-WEB.webp",
  "kantoorverlichting-helder.webp": "/_Files_Gallery/72-img-verlichting-praktijk-kantoor-WEB.webp",
  "kantoorverlichting-premium.webp": "/_Files_Gallery/214-img-verlichting-ringen-hanglamp-WEB.webp",
  "lichtplan-kantoor-project.webp": "/_Files_Gallery/69-img-lichtplan-kantoorverlichting-almere-WEB.webp",
  "kantoor-project-verlichting.webp": "/_Files_Gallery/70-img-lichtadvies-kantoorverlichting-WEB.webp",
  "open-kantoor-verlichting.webp": "/_Files_Gallery/68-img-verlichting-makelaarskantoor-WEB.webp",
  "gesloten-kantoor-verlichting.webp": "/_Files_Gallery/70-img-lichtadvies-kantoorverlichting-WEB.webp",
  "vergaderruimte-verlichting.webp": "/_Files_Gallery/216-img-openbare-bibliotheek-verlichting-WEB.webp",
  "entree-verlichting.webp": "/_Files_Gallery/212-img-openbare-bibliotheek-verlichting-WEB.webp",
  "gang-verlichting.webp": "/_Files_Gallery/72-img-verlichting-praktijk-kantoor-WEB.webp",
  "kantine-verlichting.webp": "/_Files_Gallery/67-img-kam-en-bronotte-lelystad-WEB.webp",
  "toilet-verlichting.webp": "/_Files_Products/2016-img_1-bari-wl-downlight-large-WEB.jpg",
  "overig-ruimte-verlichting.webp": "/_Files_Gallery/212-img-openbare-bibliotheek-verlichting-WEB.webp",
  "architectural-project-verlichting.webp": "/_Files_Gallery/214-img-verlichting-ringen-hanglamp-WEB.webp",
  "kantoor-functioneel-verlichting.webp": "/_Files_Gallery/72-img-verlichting-praktijk-kantoor-WEB.webp",
  "kantoor-luxe-projectverlichting.webp": "/_Files_Gallery/214-img-verlichting-ringen-hanglamp-WEB.webp",
  "armatuur-detail-railverlichting.webp": "/_Files_Categories/42-img-railsysteem-met-spots-THU.jpg",
  "voorbeeldproject-kantoor.webp": "/_Files_Gallery/69-img-lichtplan-kantoorverlichting-almere-WEB.webp",
  "led-paneel-595x595-3000k.webp": "/_Files_Products/446-img_1-led-paneel-uitverkoop-WEB.jpg",
  "led-paneel-595x595-4000k.webp": "/_Files_Products/2157-img_1-101-wl-armatuur-3-WEB.jpg",
  "downlight-rond-3000k.webp": "/_Files_Products/1986-img_1-downlight-3000k-led-zwart-wit-WEB.png",
  "downlight-rond-4000k.webp": "/_Files_Products/2016-img_1-bari-wl-downlight-large-WEB.jpg",
};

async function downloadToWebp(filename, sourcePath) {
  const url = BASE + sourcePath;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buffer).metadata();
  const webp = await sharp(buffer)
    .rotate()
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  const outPath = path.join(OUT_DIR, filename);
  await writeFile(outPath, webp);
  const outMeta = await sharp(webp).metadata();
  console.log(`${filename} ← ${sourcePath} (${meta.width}x${meta.height} → ${outMeta.width}x${outMeta.height})`);
}

await mkdir(OUT_DIR, { recursive: true });
for (const [filename, sourcePath] of Object.entries(SOURCES)) {
  await downloadToWebp(filename, sourcePath);
}
console.log(`Done: ${Object.keys(SOURCES).length} images in ${OUT_DIR}`);
