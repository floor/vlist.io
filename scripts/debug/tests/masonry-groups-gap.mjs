/**
 * Debug: masonry + groups — scroll-into-view gap at top/bottom
 *
 * When pressing ArrowDown/Up in masonry+groups mode, the gap between
 * the focused item and the viewport edge should match the padding.
 *
 * Usage:
 *   bun run scripts/debug/tests/masonry-groups-gap.mjs
 *   bun run scripts/debug/tests/masonry-groups-gap.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Masonry + Groups Gap Debug ===\n");

  // Setup: masonry + groups
  await page.evaluate(() => {
    for (const b of document.querySelectorAll(".ui-segmented__btn")) {
      if (b.textContent.trim() === "Masonry") { b.click(); break; }
    }
  });
  await s.wait(500);
  await page.evaluate(() => {
    const t = document.getElementById("groups-toggle");
    if (t && !t.checked) t.click();
  });
  await s.wait(1000);

  async function getState() {
    return page.evaluate(() => {
      const vp = document.querySelector(".vlist-viewport");
      const focused = vp?.querySelector(".vlist-item--focused, .vlist-item--selected");
      const vpRect = vp?.getBoundingClientRect();
      const focRect = focused?.getBoundingClientRect();
      return {
        idx: focused?.dataset?.index ?? "(none)",
        gapTop: focRect ? Math.round(focRect.top - vpRect.top) : null,
        gapBottom: focRect ? Math.round(vpRect.bottom - focRect.bottom) : null,
        vpH: Math.round(vpRect?.height ?? 0),
      };
    });
  }

  // Get padding from the example
  const padding = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    return {
      top: parseInt(getComputedStyle(content).paddingTop) || 0,
      bottom: parseInt(getComputedStyle(content).paddingBottom) || 0,
    };
  });
  console.log(`Padding: top=${padding.top} bottom=${padding.bottom}`);

  // ── Test 1: ArrowDown from top ──
  console.log("\n── ArrowDown from top ──");
  await page.evaluate(() => {
    const items = document.querySelectorAll(".vlist-content [data-index]");
    for (const el of items) {
      if (!el.classList.contains("vlist-group-header")) { el.click(); break; }
    }
  });
  await s.wait(200);

  let scrollStarted = false;
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("ArrowDown");
    await s.wait(100);
    const st = await getState();
    if (!scrollStarted && st.gapBottom !== null && st.gapBottom < 50) scrollStarted = true;
    if (scrollStarted) {
      console.log(`  ↓${i + 1}: [${st.idx}] gapBottom=${st.gapBottom}px`);
      if (i > 6) break;
    }
  }

  // ── Test 2: ArrowUp from bottom ──
  console.log("\n── ArrowUp from bottom ──");
  await page.keyboard.press("End");
  await s.wait(800);

  scrollStarted = false;
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("ArrowUp");
    await s.wait(100);
    const st = await getState();
    if (!scrollStarted && st.gapTop !== null && st.gapTop < 50) scrollStarted = true;
    if (scrollStarted) {
      console.log(`  ↑${i + 1}: [${st.idx}] gapTop=${st.gapTop}px`);
      if (i > 6) break;
    }
  }

  // ── Test 3: Middle of list ──
  console.log("\n── Middle of list ──");
  await page.evaluate(() => {
    const vp = document.querySelector(".vlist-viewport");
    if (vp) vp.scrollTop = vp.scrollHeight / 2;
  });
  await s.wait(500);
  await page.evaluate(() => {
    const items = document.querySelectorAll(".vlist-content [data-index]");
    const arr = Array.from(items).filter(el => !el.classList.contains("vlist-group-header"));
    if (arr.length > 3) arr[3].click();
  });
  await s.wait(200);

  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("ArrowDown");
    await s.wait(100);
  }
  const midDown = await getState();
  console.log(`  After 4x↓: [${midDown.idx}] gapBottom=${midDown.gapBottom}px`);

  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("ArrowUp");
    await s.wait(100);
  }
  const midUp = await getState();
  console.log(`  After 8x↑: [${midUp.idx}] gapTop=${midUp.gapTop}px`);

  // ── Also test without groups (masonry only) ──
  console.log("\n── Masonry without groups ──");
  await page.evaluate(() => {
    const t = document.getElementById("groups-toggle");
    if (t && t.checked) t.click();
  });
  await s.wait(1000);
  await page.evaluate(() => {
    const items = document.querySelectorAll(".vlist-content [data-index]");
    if (items.length) items[0].click();
  });
  await s.wait(200);

  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("ArrowDown");
    await s.wait(80);
  }
  const noGroupDown = await getState();
  console.log(`  After 8x↓: [${noGroupDown.idx}] gapBottom=${noGroupDown.gapBottom}px`);

  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("ArrowUp");
    await s.wait(80);
  }
  const noGroupUp = await getState();
  console.log(`  After 16x↑: [${noGroupUp.idx}] gapTop=${noGroupUp.gapTop}px`);

  console.log("\n  Expected: gap ≈ padding value (8px typical)");

  return { pass: true };
});
