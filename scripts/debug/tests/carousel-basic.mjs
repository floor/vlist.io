/**
 * Debug: carousel plugin — empty list on load
 *
 * The plugin-wizard example shows an empty viewport despite
 * the carousel plugin being active. Diagnose why items aren't rendered.
 *
 * Usage:
 *   bun run scripts/debug/tests/carousel-basic.mjs
 *   bun run scripts/debug/tests/carousel-basic.mjs --headed
 */

import { launchBrowser } from "../core.mjs";

const browser = await launchBrowser({});
const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push("PAGE ERROR: " + err.message));

await page.setViewport({ width: 1400, height: 900 });
await page.goto("http://localhost:3338/examples/plugin-wizard", {
  waitUntil: "networkidle2",
  timeout: 10000,
});
await new Promise((r) => setTimeout(r, 3000));

const state = await page.evaluate(() => {
  const vp = document.querySelector(".vlist-viewport");
  const content = document.querySelector(".vlist-content");
  const items = content?.querySelectorAll("[data-index]");

  return {
    vpH: vp?.clientHeight,
    vpScrollH: vp?.scrollHeight,
    vpScrollTop: Math.round(vp?.scrollTop ?? 0),
    contentH: content?.style?.height,
    contentOffsetH: content?.offsetHeight,
    renderedItems: items?.length ?? 0,
    firstItemIdx: items?.[0]?.dataset?.index,
    firstItemH: items?.[0]?.offsetHeight,
    firstItemTransform: items?.[0]?.style?.transform,
    firstItemText: items?.[0]?.querySelector(".plugin-card__name")?.textContent,
    engineTotal: document.querySelector(".example-info__stat strong")?.textContent,
  };
});

console.log("=== Carousel Debug ===\n");
console.log("Viewport:", state.vpH + "px height, scrollH=" + state.vpScrollH + ", scrollTop=" + state.vpScrollTop);
console.log("Content:", "CSS height=" + state.contentH, "offsetH=" + state.contentOffsetH);
console.log("Rendered:", state.renderedItems, "items");
if (state.renderedItems > 0) {
  console.log("First item: [" + state.firstItemIdx + "] " + state.firstItemText + " h=" + state.firstItemH + " transform=" + state.firstItemTransform);
}
if (errors.length) {
  console.log("Errors:", errors);
}

// RFC-012 bounded wrap model: the carousel routes through the bounded scroll
// handler, so the native scrollTop is a runway-local value (centred), NOT the
// absolute logical position. The content element is sized to a viewport-multiple
// runway (default 2×) instead of the full virtual size, and scrollTop sits near
// the runway centre. The logical position lives in state.scrollPosition.
const ITEM_HEIGHT = 480;
const expectedRunway = state.vpH * 2; // BOUNDED_RUNWAY_FACTOR
const contentH = parseInt(state.contentH, 10);
console.log("\nExpected runway content height:", expectedRunway);
console.log("Actual content height:", contentH);
console.log("Bounded to runway:", Math.abs(contentH - expectedRunway) < ITEM_HEIGHT ? "✅" : "❌");

const centre = (contentH - state.vpH) / 2;
console.log("\nscrollTop near runway centre (" + centre + "):", Math.abs(state.vpScrollTop - centre) < ITEM_HEIGHT ? "✅" : "❌");

// The focal item should land at the top of the viewport: on-screen position
// (transform - scrollTop) ≈ 0 for the currently focused logical item.
console.log("Items rendered:", state.renderedItems > 0 ? "✅ " + state.renderedItems : "❌ none");

await browser.close();
