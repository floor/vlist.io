/**
 * Debug: masonry + groups — ArrowRight jumps to wrong item
 *
 * After 3x ArrowDown + 1x ArrowRight, the focus should move to the
 * adjacent lane at a similar Y position. With groups, it jumps to
 * the top of the next lane instead.
 *
 * Usage:
 *   bun run scripts/debug/tests/masonry-groups-arrowright.mjs
 *   bun run scripts/debug/tests/masonry-groups-arrowright.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Masonry ArrowRight Debug ===\n");

  async function getState() {
    return page.evaluate(() => {
      const vp = document.querySelector(".vlist-viewport");
      const f = vp?.querySelector(".vlist-item--focused, .vlist-item--selected");
      if (!f || !vp) return null;
      const vpR = vp.getBoundingClientRect();
      const fR = f.getBoundingClientRect();
      return {
        idx: f.dataset.index,
        id: f.getAttribute("data-id"),
        lane: Math.round(fR.left - vpR.left),
        top: Math.round(fR.top - vpR.top),
        bottom: Math.round(fR.bottom - vpR.top),
        centerY: Math.round((fR.top + fR.bottom) / 2 - vpR.top),
        text: f.textContent?.trim()?.substring(0, 20),
      };
    });
  }

  async function testSequence(label, enableGroups) {
    console.log(`── ${label} ──`);

    // Set masonry mode
    await page.evaluate(() => {
      for (const b of document.querySelectorAll(".ui-segmented__btn")) {
        if (b.textContent.trim() === "Masonry") { b.click(); break; }
      }
    });
    await s.wait(300);

    // Toggle groups
    await page.evaluate((on) => {
      const t = document.getElementById("groups-toggle");
      if (t && t.checked !== on) t.click();
    }, enableGroups);
    await s.wait(1000);

    // Click first non-header item
    await page.evaluate(() => {
      const items = document.querySelectorAll(".vlist-content [data-index]");
      for (const el of items) {
        if (!el.classList.contains("vlist-group-header")) { el.click(); break; }
      }
    });
    await s.wait(200);

    const init = await getState();
    console.log(`  Start: [${init?.idx}] "${init?.text}" lane=${init?.lane} centerY=${init?.centerY}`);

    // 3x ArrowDown
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("ArrowDown");
      await s.wait(100);
    }
    const afterDown = await getState();
    console.log(`  After 3x↓: [${afterDown?.idx}] "${afterDown?.text}" lane=${afterDown?.lane} centerY=${afterDown?.centerY}`);

    // 1x ArrowRight
    await page.keyboard.press("ArrowRight");
    await s.wait(150);
    const afterRight = await getState();
    console.log(`  After 1x→: [${afterRight?.idx}] "${afterRight?.text}" lane=${afterRight?.lane} centerY=${afterRight?.centerY}`);

    // Check: the Y position should be similar (within ~100px), lane should be +1
    const sameLaneArea = afterRight && afterDown
      ? Math.abs(afterRight.centerY - afterDown.centerY) < 150
      : false;
    const nextLane = afterRight && afterDown
      ? afterRight.lane > afterDown.lane
      : false;

    console.log(`  ${sameLaneArea && nextLane ? "✅" : "❌"} lane moved right: ${nextLane}, similar Y: ${sameLaneArea} (delta=${afterRight && afterDown ? afterRight.centerY - afterDown.centerY : "?"})`);
    console.log();

    return sameLaneArea && nextLane;
  }

  const withoutGroups = await testSequence("Masonry WITHOUT groups", false);
  const withGroups = await testSequence("Masonry WITH groups", true);

  console.log(`Result: without groups ${withoutGroups ? "✅" : "❌"}, with groups ${withGroups ? "✅" : "❌"}`);

  return { pass: withoutGroups && withGroups };
});
