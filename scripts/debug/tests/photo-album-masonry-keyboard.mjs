/**
 * Debug: photo-album masonry keyboard navigation — check if viewport scrolls
 * to follow the focused item when arrowing past the viewport edge.
 * Compare grid (expected working) vs masonry (reported broken).
 */
import { launchBrowser, delay } from "../core.mjs";

const browser = await launchBrowser({ headless: false });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 800 });

async function getState() {
  return page.evaluate(() => {
    const vp = document.querySelector(".vlist-viewport");
    const focused = document.querySelector(".vlist-item--focused");
    if (!vp || !focused) return { scrollTop: 0, focusedIndex: -1, inView: false };
    const vpRect = vp.getBoundingClientRect();
    const fRect = focused.getBoundingClientRect();
    const inView = fRect.top >= vpRect.top - 2 && fRect.bottom <= vpRect.bottom + 2;
    return {
      scrollTop: Math.round(vp.scrollTop),
      focusedIndex: focused.dataset.index,
      focusedTop: Math.round(fRect.top - vpRect.top),
      focusedBottom: Math.round(fRect.bottom - vpRect.top),
      vpHeight: Math.round(vpRect.height),
      inView,
    };
  });
}

// ── Test Grid mode first (baseline — should work) ──
console.log("══ GRID MODE ══");
await page.goto("http://localhost:3338/examples/photo-album", {
  waitUntil: "networkidle2", timeout: 15000,
});
await delay(1500);

// Click on the list to give it focus
await page.click(".vlist-content");
await delay(200);

console.log("Pressing ArrowDown 20 times...");
for (let i = 0; i < 20; i++) {
  await page.keyboard.press("ArrowDown");
  await delay(50);
}
await delay(200);

const gridState = await getState();
console.log("Grid after 20× ArrowDown:", gridState);
console.log(gridState.inView ? "✓ Focused item in view" : "⚠️ Focused item OUT of view");

// ── Switch to Masonry mode ──
console.log("\n══ MASONRY MODE ══");
await page.click('[data-mode="masonry"]');
await delay(1000);

// Click on the list to give it focus
await page.click(".vlist-content");
await delay(200);

const masonryStart = await getState();
console.log("Masonry start:", masonryStart);

console.log("Pressing ArrowDown 20 times...");
for (let i = 0; i < 20; i++) {
  await page.keyboard.press("ArrowDown");
  await delay(50);
  if ((i + 1) % 5 === 0) {
    const st = await getState();
    console.log(`  after ${i + 1}× ArrowDown:`, st.inView ? "✓ in view" : `⚠️ OUT (top=${st.focusedTop}, btm=${st.focusedBottom}, vp=${st.vpHeight})`, `scrollTop=${st.scrollTop}`);
  }
}
await delay(200);

const masonryState = await getState();
console.log("Masonry after 20× ArrowDown:", masonryState);
console.log(masonryState.inView ? "✓ Focused item in view" : "⚠️ Focused item OUT of view — REGRESSION");

console.log("\nDone — keeping browser open 5s for visual inspection");
await delay(5000);
await browser.close();
