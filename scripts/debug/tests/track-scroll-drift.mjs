/**
 * Debug: Track List scroll drift when toggling custom scrollbar (#21).
 * Reproduces: Grid mode → PageDown twice → toggle scrollbar 20 times.
 * Measures scrollTop before/after each toggle to detect drift.
 *
 *   bun scripts/debug/tests/track-scroll-drift.mjs
 */
import { run } from "../runner.mjs";

const SEL = {
  vp: ".vlist-viewport",
  item: ".vlist-item, .vlist-grid-item",
  root: ".vlist",
};

await run("/examples/track-list", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== TRACK LIST SCROLL DRIFT TEST (#21) ===\n");

  // Switch to grid mode
  await page.click('[data-mode="grid"]');
  await s.wait(2000);

  // Click first grid item to focus the list
  const clicked = await page.evaluate((sel) => {
    const item = document.querySelector(sel.item);
    if (item) { item.click(); return true; }
    return false;
  }, SEL);
  console.log(`  Clicked first item: ${clicked}`);
  await s.wait(500);

  // PageDown twice
  await s.press("PageDown");
  await s.wait(500);
  await s.press("PageDown");
  await s.wait(1000);

  const initial = await page.evaluate((sel) => {
    const vp = document.querySelector(sel.vp);
    return vp ? Math.round(vp.scrollTop) : null;
  }, SEL);
  console.log(`  Initial scrollTop after 2x PageDown: ${initial}\n`);

  // Toggle scrollbar 20 times and measure drift
  const TOGGLES = 20;
  let prev = initial;

  for (let i = 1; i <= TOGGLES; i++) {
    await page.click("#scrollbar-toggle");
    await s.wait(1500);

    const scrollTop = await page.evaluate((sel) => {
      const vp = document.querySelector(sel.vp);
      return vp ? Math.round(vp.scrollTop) : null;
    }, SEL);

    const delta = scrollTop - prev;
    const totalDrift = scrollTop - initial;
    const marker = Math.abs(delta) > 1 ? " ← DRIFT" : "";
    console.log(`  Toggle ${String(i).padStart(2)}: scrollTop=${scrollTop}, delta=${delta}, totalDrift=${totalDrift}${marker}`);
    prev = scrollTop;
  }

  const final = await page.evaluate((sel) => {
    const vp = document.querySelector(sel.vp);
    return vp ? Math.round(vp.scrollTop) : null;
  }, SEL);

  const totalDrift = final - initial;
  console.log(`\n  Final scrollTop: ${final}`);
  console.log(`  Total drift after ${TOGGLES} toggles: ${totalDrift}px`);
  console.log(`  Verdict: ${Math.abs(totalDrift) <= 2 ? "STABLE" : "DRIFTS — BUG"}`);

  console.log("\n=== CONSOLE LOG ===");
  const errors = s.logs.filter((l) => /error|warn/i.test(l));
  console.log(errors.length ? errors.join("\n  ") : "  No errors/warnings");
});
