import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { items } from "../../examples/photo-album/shared.js";

// The album loads every card from picsum.photos, and every photo falls back to
// a committed placeholder in examples/photo-album/images/ when that request
// fails — the host is down, or the browser suites block third-party hosts (the
// harness #138 added does). These tests hold the parts a browser check cannot:
// the cards ask picsum, every photo id the page can show has a fallback file,
// the directory is exactly that set, the files are distinct and the right
// size, and none of the four variants is missing its swap.

const ROOT = join(import.meta.dir, "../..");
const IMAGE_DIR = join(ROOT, "examples/photo-album/images");

describe("photo album example images", () => {
  test("a card's photo comes from the self-hosted set, with its 2x source", () => {
    const source = readFileSync(
      join(ROOT, "examples/photo-album/shared.js"),
      "utf8",
    );
    expect(source).toContain("photoUrl(item.picId, 300, 225)");
    expect(source).toContain("photoSrcSet(item.picId, 300, 225)");
    // And the rest of the chain, for watchPhotosIn to walk.
    expect(source).toContain('data-photo-fallback="${picsum}"');
    expect(source).toContain('data-photo-svg="${svg}"');
  });

  test("every card has a committed fallback image", () => {
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const url = `/examples/photo-album/images/${item.picId}.svg`;
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

  test("every fallback is a distinct 400x300 SVG", () => {
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

  test("every card and detail panel swaps a failed photo for the file", () => {
    // The cards come from one template in shared.js; each variant draws its
    // own detail panel, so each has a handler of its own. All of them point at
    // the committed file with the photo's own id.
    for (const name of [
      "examples/photo-album/shared.js",
      "examples/photo-album/vanilla/script.js",
      "examples/photo-album/react/script.tsx",
      "examples/photo-album/vue/script.js",
      "examples/photo-album/svelte/script.js",
    ]) {
      const source = readFileSync(join(ROOT, name), "utf8");
      expect(source).toContain("/examples/photo-album/images/");
    }
  });
});
