import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getItems, getImageUrl } from "../../src/data/carousel.js";
import { photoSrcSet } from "../../src/data/photos.js";

// The carousel loads its photos from picsum.photos, and every photo falls back
// to a committed placeholder in examples/carousel/images/ when that request
// fails — the host is down, or the browser suites block third-party hosts (the
// harness #138 added does). These tests hold the parts a browser gate cannot:
// the slide asks picsum, every photo id the page can show has a fallback file,
// the directory is exactly that set, and the files are distinct size-checked
// pictures — so a wrong fallback path shows up here, not as a blank slide.

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
  test("a slide's photo comes from the self-hosted set, with its 2x source", () => {
    expect(getImageUrl(29, 800, 500)).toBe("/photos/29-800x500.webp");
    expect(photoSrcSet(29, 800, 500)).toBe(
      "/photos/29-800x500.webp 1x, /photos/29-1600x1000.webp 2x",
    );
  });

  test("every slide has a committed fallback image", () => {
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const url = `/examples/carousel/images/${item.picId}.svg`;
      expect(existsSync(join(ROOT, url.slice(1)))).toBe(true);
    }
  });

  test("the fallback directory holds exactly the referenced files", () => {
    const referenced = new Set(items.map((item) => `${item.picId}.svg`));
    const committed = readdirSync(IMAGE_DIR).filter((name) =>
      name.endsWith(".svg"),
    );
    expect(committed.sort()).toEqual([...referenced].sort());
  });

  test("every fallback is a distinct 800x500 SVG", () => {
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

  test("each slide template names the chain: picsum, then the committed file", () => {
    // The preloaded slide and the lazy slide carry both steps as attributes for
    // watchPhoto; the detail panel, which sits outside the watched container,
    // names the same two where it arms itself.
    const source = readFileSync(
      join(ROOT, "examples/carousel/vanilla/script.js"),
      "utf8",
    );
    expect(source.match(/data-photo-fallback="\$\{picsum\}"/g)?.length).toBe(2);
    expect(source.match(/data-photo-svg="\$\{svg\}"/g)?.length).toBe(2);
    expect(source).toContain("watchPhoto(img, [picsum, svg])");
  });
});
