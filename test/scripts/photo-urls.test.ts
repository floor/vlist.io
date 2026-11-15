import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import {
  photoUrl,
  photoSrcSet,
  photoPicsumUrl,
  photoCredit,
} from "../../src/data/photos.js";
import { getImageUrl } from "../../src/data/carousel.js";
import { getPhotoUrl } from "../../src/data/lorem-picsum.js";
import { usedIds, boxesFor } from "../../scripts/photo-boxes.mjs";
import { staticCachePolicy, servePhoto } from "../../src/server/static.js";
import { PHOTOS_DIR } from "../../src/server/config.js";

// The pages show the self-hosted photo set first (/photos/<id>-<w>x<h>.webp,
// served from PHOTOS_DIR), then picsum, then the photo's committed SVG. These
// tests hold the parts a browser cannot: the URL mapping, that the manifest
// this repo carries names every file the pages request, and that no runtime
// path still asks a third party as its first choice.

const ROOT = join(import.meta.dir, "../..");
const manifest = JSON.parse(
  readFileSync(join(ROOT, "src/data/photos-manifest.json"), "utf8"),
);

describe("photo URLs", () => {
  test("a box maps to the file the mirror writes", () => {
    expect(photoUrl(29, 800, 500)).toBe("/photos/29-800x500.webp");
    expect(photoUrl(0, 300, 225)).toBe("/photos/0-300x225.webp");
  });

  test("the srcset carries the 1x and 2x file", () => {
    expect(photoSrcSet(29, 800, 500)).toBe(
      "/photos/29-800x500.webp 1x, /photos/29-1600x1000.webp 2x",
    );
  });

  test("the carousel's getImageUrl is the self-hosted one", () => {
    expect(getImageUrl(29, 800, 500)).toBe(photoUrl(29, 800, 500));
  });

  test("the chain's second step is the picsum URL of the same box", () => {
    expect(photoPicsumUrl(29, 800, 500)).toBe(getPhotoUrl(29, 800, 500));
    expect(photoPicsumUrl(29, 800, 500)).toBe(
      "https://picsum.photos/id/29/800/500",
    );
  });

  test("a photo carries its Unsplash credit", () => {
    const credit = photoCredit(29);
    expect(credit?.author).toBeTruthy();
    expect(credit?.url.startsWith("https://unsplash.com/photos/")).toBe(true);
    expect(photoCredit(10_000)).toBeNull();
  });

  test("only the flat WebP files are served, and they are cached for a year", () => {
    expect(staticCachePolicy("/photos/29-800x500.webp")).toBe("immutable");
    // Anything that is not a photo file is not routed there at all.
    expect(servePhoto("/photos/../package.json")).toBeNull();
    expect(servePhoto("/photos/manifest.json")).toBeNull();
    expect(servePhoto("/photos/29-800x500.png")).toBeNull();
  });
});

describe("the photo set's directory", () => {
  test("one spelling, and the same directory deploy.yml fills", () => {
    // The default (config.ts, and the mirror script) and the deploy clone must
    // name the same directory, or production 404s every /photos/* file.
    const deploy = readFileSync(
      join(ROOT, ".github/workflows/deploy.yml"),
      "utf8",
    );
    const deployed = deploy.match(/PHOTOS_DIR="([^"]+)"/)?.[1];
    expect(deployed).toBe("/home/floor/vlist-io-photos");
    expect(basename(PHOTOS_DIR)).toBe("vlist-io-photos");
    expect(deployed?.endsWith(`/${basename(PHOTOS_DIR)}`)).toBe(true);
  });

  test("the mirror writes where the server reads", () => {
    const script = readFileSync(join(ROOT, "scripts/mirror-photos.mjs"), "utf8");
    expect(script).toContain('resolve(ROOT, "..", "vlist-io-photos")');
    expect(script).not.toContain("vlist.io-photos");
  });
});

describe("the committed manifest", () => {
  test("names every file the pages request, at 1x and 2x", () => {
    const ids = usedIds();
    expect(ids.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const id of ids) {
      const files = new Set(manifest.photos[id]?.files ?? []);
      for (const { w, h } of boxesFor(id)) {
        for (const [width, height] of [
          [w, h],
          [w * 2, h * 2],
        ]) {
          const file = `photos/${id}-${width}x${height}.webp`;
          if (!files.has(file)) missing.push(file);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test("has no file the pages cannot ask for", () => {
    // Every file in the manifest is <id>-<w>x<h>.webp for a used id and one of
    // its boxes — so a stale or mistyped name cannot hide in it.
    const unexpected: string[] = [];
    for (const [id, photo] of Object.entries(manifest.photos) as [
      string,
      { files: string[] },
    ][]) {
      const boxes = new Set(
        boxesFor(Number(id)).flatMap(({ w, h }) => [
          `${w}x${h}`,
          `${w * 2}x${h * 2}`,
        ]),
      );
      for (const file of photo.files) {
        const match = file.match(/^photos\/(\d+)-(\d+x\d+)\.webp$/);
        if (!match || match[1] !== id || !boxes.has(match[2])) {
          unexpected.push(file);
        }
      }
    }
    expect(unexpected).toEqual([]);
  });
});

describe("runtime paths", () => {
  test("no example or server module asks picsum as its first choice", () => {
    // picsum may appear only in the metadata module (the chain's second step
    // builds its URLs from getPhotoUrl there) — nowhere as a src a page sets.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === "dist") continue;
          walk(path);
          continue;
        }
        if (!/\.(js|ts|tsx|mjs)$/.test(entry.name)) continue;
        const source = readFileSync(path, "utf8");
        if (!source.includes("picsum.photos")) continue;
        offenders.push(path.slice(ROOT.length + 1));
      }
    };
    walk(join(ROOT, "examples"));
    walk(join(ROOT, "src"));
    expect(offenders).toEqual(["src/data/lorem-picsum.js"]);
  });

  test("both examples name the whole chain on their cards", () => {
    const carousel = readFileSync(
      join(ROOT, "examples/carousel/vanilla/script.js"),
      "utf8",
    );
    const album = readFileSync(
      join(ROOT, "examples/photo-album/shared.js"),
      "utf8",
    );
    for (const source of [carousel, album]) {
      expect(source).toContain("data-photo-fallback=");
      expect(source).toContain("data-photo-svg=");
      expect(source).toContain("photoSrcSet(");
    }
  });
});
