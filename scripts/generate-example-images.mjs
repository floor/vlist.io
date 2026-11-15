/**
 * Generate the fallback images an example serves from its own directory.
 *
 * The examples load their pictures from picsum.photos — one request per slide
 * or card, 168 and 900 of them — and every photo falls back to a committed
 * placeholder when that request fails: the host is down, or the browser suites
 * block third-party hosts. Each photo gets its own generated picture under
 * examples/<slug>/images/<photo-id>.svg, served by the site from the project
 * root, so a failed request always lands on a file with the same id.
 *
 * Each set below takes its photo ids from the example's own data, so the files
 * it writes are exactly the ids the page can show and the two cannot drift
 * apart. The art comes from ./lib/placeholder-svg.mjs, derived from the photo
 * id, so every picture is distinct and a re-run writes the same bytes.
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
        describe: (photo) => `${photo.title}, ${photo.location}`,
      };
    },
  },

  "photo-album": {
    width: 400,
    height: 300,
    async load() {
      const { items } = await import("../examples/photo-album/shared.js");
      const photos = new Map();
      for (const item of items) {
        if (!photos.has(item.picId)) photos.set(item.picId, item);
      }
      return {
        photos,
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
  const { photos, describe } = await set.load();

  let written = 0;
  let unchanged = 0;
  let bytes = 0;
  for (const photo of photos.values()) {
    // The page swaps a failed picsum request for this path; the id on the
    // card and the file name are the same, so one always has the other.
    const url = `/examples/${name}/images/${photo.picId}.svg`;
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
