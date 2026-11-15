/**
 * Generate the carousel example's placeholder images.
 *
 * The example used to load its photos from picsum.photos — one 800x500 request
 * per slide, 168 of them across the four sets, plus preloads. When that host is
 * slow or down the page never reaches network idle and the images stay blank,
 * so the example now ships its own: one 800x500 SVG per photo, generated from
 * the photo id (gradient hue, shapes and the id itself are all derived from it,
 * so every slide is visibly distinct and a re-run writes the same bytes).
 *
 * The files land in examples/carousel/images/<id>.svg — the path
 * examples/carousel/shared.js getImageUrl() builds, which is where this script
 * gets the URL from, so the two cannot drift apart.
 *
 * Run: bun scripts/generate-carousel-images.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { getImageUrl } from "../examples/carousel/shared.js";
import { getItems } from "../src/data/carousel.js";

const ROOT = resolve(import.meta.dir, "..");

// Every variant the example page can show (its buttons in content.html);
// getItems() falls back to the hero set for one without a set of its own.
const VARIANTS = [
  "hero",
  "hero-center",
  "full",
  "full-h",
  "multi",
  "uncontained",
  "multi-aspect",
];

const WIDTH = 800;
const HEIGHT = 500;

const escapeXml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[
        c
      ],
  );

/** xorshift32 over the photo id: same id, same shapes. */
function rng(seed) {
  let x = (seed * 2654435761) >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

function svgFor({ picId, title, location }) {
  const hue = (picId * 137.508) % 360;
  const hue2 = (hue + 42) % 360;
  const next = rng(picId);

  const circles = Array.from({ length: 3 }, () => {
    const cx = Math.round(60 + next() * 680);
    const cy = Math.round(60 + next() * 380);
    const r = Math.round(50 + next() * 150);
    const fill = next() > 0.5 ? "#ffffff" : "#000000";
    const opacity = (0.06 + next() * 0.09).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${opacity}"/>`;
  }).join("");

  const angle = Math.round(next() * 70 - 35);
  const cx = Math.round(240 + next() * 320);
  const cy = Math.round(170 + next() * 150);
  const rx = Math.round(110 + next() * 190);
  const ry = Math.round(80 + next() * 130);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img">
<title>Placeholder photo ${picId} — ${escapeXml(title)}, ${escapeXml(location)}</title>
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue.toFixed(1)} 62% 52%)"/>
<stop offset="1" stop-color="hsl(${hue2.toFixed(1)} 48% 24%)"/>
</linearGradient></defs>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
${circles}
<rect x="${cx - rx}" y="${cy - ry}" width="${rx * 2}" height="${ry * 2}" rx="28" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="2" transform="rotate(${angle} ${cx} ${cy})"/>
<text x="40" y="60" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" font-size="18" letter-spacing="3" fill="rgba(255,255,255,0.72)">PLACEHOLDER ${WIDTH}×${HEIGHT}</text>
<text x="760" y="178" text-anchor="end" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" font-size="136" font-weight="700" fill="rgba(255,255,255,0.9)">${picId}</text>
</svg>
`;
}

const photos = new Map();
for (const variant of VARIANTS) {
  for (const item of getItems(variant)) {
    if (!photos.has(item.picId)) photos.set(item.picId, item);
  }
}

let written = 0;
let unchanged = 0;
let bytes = 0;
for (const photo of photos.values()) {
  const url = getImageUrl(photo.picId);
  if (!/^\/examples\/carousel\/images\/\d+\.svg$/.test(url)) {
    throw new Error(`getImageUrl(${photo.picId}) is not an example image path: ${url}`);
  }
  const file = join(ROOT, url.slice(1));
  const svg = svgFor(photo);
  bytes += Buffer.byteLength(svg);
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file) && readFileSync(file, "utf8") === svg) {
    unchanged++;
  } else {
    writeFileSync(file, svg);
    written++;
  }
}

console.log(
  `carousel images: ${photos.size} photos, ${written} written, ${unchanged} unchanged, ${(bytes / 1024).toFixed(1)} KB of SVG`,
);
