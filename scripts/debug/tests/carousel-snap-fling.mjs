/**
 * Debug: carousel free-scroll (wheel/trackpad) snap — issue 023 regression.
 *
 * Reproduces "it does not snap anymore when it should". The carousel snaps to an
 * item boundary after a wheel fling settles. The focal item's
 * `--vlist-carousel-progress` equals the fractional position within a step, so
 * progress ≈ 0 means snapped, and a non-zero residual means it stopped mid-step.
 *
 * Scenarios:
 *   1. plain fling                         → should snap
 *   2. fling interrupted by a 2nd fling    → should snap after settling
 *   3. plain fling AFTER an interruption   → REGRESSION: stays unsnapped if the
 *                                            snap-animating flag wedged
 *
 * Run headful to watch:  bun scripts/debug/tests/carousel-snap-fling.mjs --headful
 */
import { launchBrowser, openPage, delay, parseArgs } from "../core.mjs";

const args = parseArgs();
const browser = await launchBrowser({ headless: !args.headful });
const { page } = await openPage(browser, "/examples/carousel", { settle: 1500, width: 1400, height: 900 });

// Enable snap (default is off) — the toggle recreates the list.
await page.click("#toggle-snap");
await delay(800);

const box = await page.evaluate(() => {
  const vp = document.querySelector(".vlist-viewport");
  const r = vp.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.mouse.move(box.x, box.y);

// Dispatch a fling: a burst of decaying horizontal wheel deltas ~1 frame apart,
// mimicking macOS momentum. `peak` is the first delta; it decays geometrically.
async function fling(peak = 70, decay = 0.82, frameMs = 16) {
  let d = peak;
  while (Math.abs(d) >= 1) {
    await page.mouse.wheel({ deltaX: d });
    await delay(frameMs);
    d *= decay;
  }
}

// Focal item's fractional offset within its step. ~0 (or ~1) == snapped.
async function focalFrac() {
  return page.evaluate(() => {
    const items = [...document.querySelectorAll(".vlist-content [data-index]")];
    const focal = items.find((el) => el.style.getPropertyValue("--vlist-carousel-role").trim() === "large");
    if (!focal) return null;
    const p = parseFloat(focal.style.getPropertyValue("--vlist-carousel-progress")) || 0;
    return Math.min(p, 1 - p); // distance to the nearest boundary
  });
}

const SNAP_TOL = 0.04;
const report = (label, frac) => {
  const snapped = frac !== null && frac <= SNAP_TOL;
  console.log(`${snapped ? "✓ SNAPPED " : "✗ NOT SNAPPED"}  ${label}  (residual frac=${frac?.toFixed(3)})`);
  return snapped;
};

const results = [];

console.log("── 1. plain fling ──");
await fling();
await delay(1200);
results.push(report("after plain fling", await focalFrac()));

console.log("\n── 2. interrupted fling (2nd fling lands mid-snap) ──");
await fling();
await delay(80); // let the snap spring start, then interrupt it
await fling(50);
await delay(1200);
results.push(report("after interrupted fling", await focalFrac()));

console.log("\n── 3. plain fling AFTER an interruption (regression probe) ──");
await fling();
await delay(1200);
results.push(report("after post-interruption fling", await focalFrac()));

const allSnapped = results.every(Boolean);
console.log(`\n${allSnapped ? "ALL SNAPPED ✓" : "REGRESSION: a fling failed to snap ✗"}`);

if (args.headful) {
  console.log("keeping browser open 5s…");
  await delay(5000);
}
await browser.close();
process.exit(allSnapped ? 0 : 1);
