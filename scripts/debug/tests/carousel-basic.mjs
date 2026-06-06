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

// Check: is the scroll position in the middle cycle?
const ITEM_HEIGHT = 480;
const TOTAL = 16;
const CYCLES = 101;
const MIDDLE = 50;
const expectedScroll = MIDDLE * TOTAL * ITEM_HEIGHT;
console.log("\nExpected start scroll:", expectedScroll);
console.log("Actual start scroll:", state.vpScrollTop);
console.log("Match:", Math.abs(state.vpScrollTop - expectedScroll) < ITEM_HEIGHT * 2 ? "✅" : "❌");

// Check: what range does the render pipeline think is visible?
const visibleStart = Math.floor(state.vpScrollTop / ITEM_HEIGHT);
const visibleEnd = Math.ceil((state.vpScrollTop + state.vpH) / ITEM_HEIGHT);
console.log("\nVisible range: [" + visibleStart + " - " + visibleEnd + "]");
console.log("These map to logical items: [" + (visibleStart % TOTAL) + " - " + (visibleEnd % TOTAL) + "]");

await browser.close();
