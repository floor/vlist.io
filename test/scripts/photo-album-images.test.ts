import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { items, getImageUrl } from "../../examples/photo-album/shared.js";

// The photo album used to load every card from picsum.photos, so while that
// host is down the page stays blank and slow to settle. It now ships its own
// generated images: one 400x300 SVG per photo in examples/photo-album/images/,
// written by scripts/generate-example-images.mjs. These tests hold the parts a
// browser check cannot: every card points at a committed file, the directory is
// exactly that set, the files are distinct and the right size, and none of the
// four variants asks a third party for an image.

const ROOT = join(import.meta.dir, "../..");
const IMAGE_DIR = join(ROOT, "examples/photo-album/images");

describe("photo album example images", () => {
  test("every card resolves to a committed local image", () => {
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const url = getImageUrl(item.picId);
      expect(url).toMatch(/^\/examples\/photo-album\/images\/\d+\.svg$/);
      expect(existsSync(join(ROOT, url.slice(1)))).toBe(true);
    }
  });

  test("the image directory holds exactly the referenced files", () => {
    const referenced = new Set(items.map((item) => `${item.picId}.svg`));
    const committed = readdirSync(IMAGE_DIR).filter((name) =>
      name.endsWith(".svg"),
    );
    expect(committed.sort()).toEqual([...referenced].sort());
  });

  test("every image is a distinct 400x300 SVG", () => {
    const seen = new Set<string>();
    for (const picId of new Set(items.map((item) => item.picId))) {
      const svg = readFileSync(join(IMAGE_DIR, `${picId}.svg`), "utf8");
      expect(svg.startsWith("<svg ")).toBe(true);
      expect(svg).toContain('width="400"');
      expect(svg).toContain('height="300"');
      expect(svg).toContain('viewBox="0 0 400 300"');
      // Same photo id, same picture — different ids, different picture.
      expect(svg).toContain(`>${picId}</text>`);
      expect(seen.has(svg)).toBe(false);
      seen.add(svg);
    }
    expect(seen.size).toBe(new Set(items.map((item) => item.picId)).size);
  });

  test("no variant asks a third party for an image", () => {
    for (const name of [
      "examples/photo-album/shared.js",
      "examples/photo-album/content.html",
      "examples/photo-album/controls.js",
      "examples/photo-album/vanilla/script.js",
      "examples/photo-album/react/script.tsx",
      "examples/photo-album/react/content.html",
      "examples/photo-album/vue/script.js",
      "examples/photo-album/vue/content.html",
      "examples/photo-album/svelte/script.js",
    ]) {
      const source = readFileSync(join(ROOT, name), "utf8");
      expect(source).not.toMatch(/picsum|unsplash/i);
      expect(source).not.toMatch(/https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)/i);
    }
  });
});
