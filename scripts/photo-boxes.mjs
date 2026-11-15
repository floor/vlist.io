// Every photo id the demos use, and every 1x box they ask for at that id.
//
// Shared by scripts/mirror-photos.mjs (which derives the WebP files) and by the
// tests that hold the manifest to what the pages actually request, so the set
// cannot drift from the templates.
//
// Not part of the runtime: the pages import src/data/photos.js for their URLs.

import { getItems } from "../src/data/carousel.js";
import { items as albumItems } from "../examples/photo-album/shared.js";

// The carousel's variant buttons (its content.html) — every set it can show.
export const CAROUSEL_VARIANTS = [
  "hero",
  "hero-center",
  "full",
  "full-h",
  "multi",
  "uncontained",
  "multi-aspect",
];

/** The slide box a variant asks for, at 1x (examples/carousel/vanilla/script.js). */
export function slideBox(variant, item) {
  if (variant === "multi-aspect") {
    const scale = 600 / Math.max(item.w ?? 1, item.h ?? 1);
    return {
      w: Math.round((item.w ?? 1) * scale),
      h: Math.round((item.h ?? 1) * scale),
    };
  }
  // "full" is the portrait variant; every other variant is 800x500.
  return variant === "full" ? { w: 600, h: 800 } : { w: 800, h: 500 };
}

/** The carousel detail panel's box at 1x: long edge 300, native aspect. */
export function detailBox(item) {
  const scale = 300 / Math.max(item.w ?? 300, item.h ?? 300);
  return {
    w: Math.round((item.w ?? 300) * scale),
    h: Math.round((item.h ?? 300) * scale),
  };
}

// Album: card 300x225 and detail 400x300, the same for every item.
export const ALBUM_CARD_BOX = { w: 300, h: 225 };
export const ALBUM_DETAIL_BOX = { w: 400, h: 300 };

const uses = (() => {
  const map = new Map(); // picId -> { sources: Set, boxes: Map("WxH" -> {w,h}) }
  const add = (id, source, box) => {
    if (!map.has(id)) map.set(id, { sources: new Set(), boxes: new Map() });
    const entry = map.get(id);
    entry.sources.add(source);
    entry.boxes.set(`${box.w}x${box.h}`, box);
  };

  for (const variant of CAROUSEL_VARIANTS) {
    for (const item of getItems(variant)) {
      add(item.picId, `carousel/${variant}`, slideBox(variant, item));
      add(item.picId, `carousel/${variant}`, detailBox(item));
    }
  }

  // The first 900 items are the first 900 of the album's VALID_IDS.
  for (const item of albumItems.slice(0, 900)) {
    add(item.picId, "photo-album", ALBUM_CARD_BOX);
    add(item.picId, "photo-album", ALBUM_DETAIL_BOX);
  }

  return map;
})();

/** Every id a demo can show, ascending. */
export function usedIds() {
  return [...uses.keys()].sort((a, b) => a - b);
}

/** The 1x boxes requested at `id`, largest first. */
export function boxesFor(id) {
  const entry = uses.get(id);
  if (!entry) return [];
  return [...entry.boxes.values()].sort((a, b) => b.w * b.h - a.w * a.h);
}

/** The demo sources that show `id`. */
export function sourcesFor(id) {
  return [...(uses.get(id)?.sources ?? [])].sort();
}
