import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getItems } from "../../src/data/carousel.js";
import { getImageUrl } from "../../examples/carousel/shared.js";

// The carousel example used to load its photos from picsum.photos, and when
// that host was down the page never finished loading. The example now ships
// its own generated images: one 800x500 SVG per photo in
// examples/carousel/images/, written by scripts/generate-example-images.mjs.
// These tests hold the parts a browser gate cannot: every slide points at a
// committed file, every file is the promised format and size, the files are
// distinct, and the example asks no third party for an image.

const ROOT = join(import.meta.dir, "../..");
const IMAGE_DIR = join(ROOT, "examples/carousel/images");

// Every variant the example page can show (its buttons in content.html).
const VARIANTS = [
  "hero",
  "hero-center",
  "full",
  "full-h",
  "multi",
  "uncontained",
  "multi-aspect",
];

const items = VARIANTS.flatMap((variant) => getItems(variant));

describe("carousel example images", () => {
  test("every slide resolves to a committed local image", () => {
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const url = getImageUrl(item.picId);
      expect(url).toMatch(/^\/examples\/carousel\/images\/\d+\.svg$/);
      expect(existsSync(join(ROOT, url.slice(1)))).toBe(true);
    }
  });

  test("the image directory holds exactly the referenced files", () => {
    const referenced = new Set(
      items.map((item) => `${item.picId}.svg`),
    );
    const committed = readdirSync(IMAGE_DIR).filter((name) =>
      name.endsWith(".svg"),
    );
    expect(committed.sort()).toEqual([...referenced].sort());
  });

  test("every image is a distinct 800x500 SVG", () => {
    const seen = new Set<string>();
    for (const picId of new Set(items.map((item) => item.picId))) {
      const file = join(IMAGE_DIR, `${picId}.svg`);
      const svg = readFileSync(file, "utf8");
      expect(svg.startsWith("<svg ")).toBe(true);
      expect(svg).toContain('width="800"');
      expect(svg).toContain('height="500"');
      expect(svg).toContain('viewBox="0 0 800 500"');
      // Same photo id, same picture — different ids, different picture.
      expect(svg).toContain(`>${picId}</text>`);
      expect(seen.has(svg)).toBe(false);
      seen.add(svg);
    }
    expect(seen.size).toBe(new Set(items.map((item) => item.picId)).size);
  });

  test("the example asks no third party for an image", () => {
    for (const name of [
      "examples/carousel/shared.js",
      "examples/carousel/vanilla/script.js",
      "examples/carousel/vanilla/content.html",
    ]) {
      const source = readFileSync(join(ROOT, name), "utf8");
      expect(source).not.toMatch(/picsum/i);
      expect(source).not.toMatch(/https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)/i);
    }
  });

  test("the carousel data carries no photo URLs", () => {
    // The example stopped asking picsum.photos for its pictures, and the
    // bundle used to carry the 993-record photo metadata module with it: a
    // download_url and an unsplash author link per record. The data module
    // now holds only ids, dimensions, titles and locations.
    const source = readFileSync(join(ROOT, "src/data/carousel.js"), "utf8");
    expect(source).not.toMatch(/picsum|unsplash/i);
    expect(source).not.toMatch(/https?:\/\//);
    expect(existsSync(join(ROOT, "src/data/lorem-picsum.js"))).toBe(false);
  });
});
