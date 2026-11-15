/**
 * Generate the placeholder images an example serves from its own directory.
 *
 * Two examples used to load their pictures from picsum.photos — one request per
 * slide or card, 168 and 900 of them. When that host is slow or down the pages
 * never reach network idle, the pictures stay blank, and the browser suites time
 * out, so each example now ships its own generated pictures under
 * examples/<slug>/images/<photo-id>.svg, served by the site from the project
 * root.
 *
 * Each set below takes its photo ids and its URL from the example's own modules
 * (getImageUrl and its data), so the files it writes are exactly the files the
 * page asks for and the two cannot drift apart. The art comes from
 * ./lib/placeholder-svg.mjs, derived from the photo id, so every picture is
 * distinct and a re-run writes the same bytes.
 *
 * Run: bun scripts/generate-example-images.mjs             (every set)
 *      bun scripts/generate-example-images.mjs --set=carousel
 * Sets: carousel (800x500), photo-album (400x300).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { placeholderSvg } from "./lib/placeholder-svg.mjs";

const ROOT = resolve(import.meta.dir, "..");

const SETS = {
  carousel: {
    width: 800,
    height: 500,
    async load() {
      const { getImageUrl } = await import("../examples/carousel/shared.js");
      const { getItems } = await import("../src/data/carousel.js");
      // Every variant the example page can show; getItems() falls back to the
      // hero set for one without a set of its own.
      const VARIANTS = [
        "hero",
        "hero-center",
        "full",
        "full-h",
        "multi",
        "uncontained",
        "multi-aspect",
      ];
      const photos = new Map();
      for (const variant of VARIANTS) {
        for (const item of getItems(variant)) {
          if (!photos.has(item.picId)) photos.set(item.picId, item);
        }
      }
      return {
        photos,
        getImageUrl,
        describe: (photo) => `${photo.title}, ${photo.location}`,
      };
    },
  },

  "photo-album": {
    width: 400,
    height: 300,
    async load() {
      const { items, getImageUrl } = await import(
        "../examples/photo-album/shared.js"
      );
      const photos = new Map();
      for (const item of items) {
        if (!photos.has(item.picId)) photos.set(item.picId, item);
      }
      return {
        photos,
        getImageUrl,
        describe: (photo) => `${photo.title}, ${photo.category}`,
      };
    },
  },
};

const SET_NAMES = Object.keys(SETS);

function wantedSets(argv) {
  const arg = argv.find((a) => a.startsWith("--set="));
  if (!arg) return SET_NAMES;
  const name = arg.slice("--set=".length);
  if (!SETS[name]) {
    throw new Error(
      `unknown set "${name}" — one of: ${SET_NAMES.join(", ")}, or none for all`,
    );
  }
  return [name];
}

let totalPhotos = 0;
let totalWritten = 0;
let totalUnchanged = 0;
let totalBytes = 0;

const wanted = wantedSets(process.argv.slice(2));

for (const name of wanted) {
  const set = SETS[name];
  const { photos, getImageUrl, describe } = await set.load();
  const pattern = new RegExp(`^/examples/${name}/images/\\d+\\.svg$`);

  let written = 0;
  let unchanged = 0;
  let bytes = 0;
  for (const photo of photos.values()) {
    const url = getImageUrl(photo.picId);
    if (!pattern.test(url)) {
      throw new Error(
        `getImageUrl(${photo.picId}) is not a ${name} image path: ${url}`,
      );
    }
    const file = join(ROOT, url.slice(1));
    const svg = placeholderSvg({
      picId: photo.picId,
      width: set.width,
      height: set.height,
      title: `Placeholder photo ${photo.picId} — ${describe(photo)}`,
    });
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
    `${name}: ${set.width}x${set.height}, ${photos.size} photos, ${written} written, ${unchanged} unchanged, ${(bytes / 1024).toFixed(1)} KB of SVG`,
  );
  totalPhotos += photos.size;
  totalWritten += written;
  totalUnchanged += unchanged;
  totalBytes += bytes;
}

if (wanted.length > 1) {
  console.log(
    `all: ${totalPhotos} photos, ${totalWritten} written, ${totalUnchanged} unchanged, ${(totalBytes / 1024).toFixed(1)} KB of SVG`,
  );
}
