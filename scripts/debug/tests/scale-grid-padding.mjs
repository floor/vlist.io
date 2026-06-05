/**
 * Debug: grid + scale — scroll-into-view gap is wrong
 *
 * ArrowDown from top: gap between focused item and viewport bottom
 * is double the expected padding. ArrowUp from bottom: same at top.
 * Middle of list: ~1.5x the padding.
 *
 * Usage:
 *   bun run scripts/debug/tests/scale-grid-padding.mjs
 *   bun run scripts/debug/tests/scale-grid-padding.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/large-list", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Scale Grid Padding Debug ===\n");

  // Grid layout, 1M
  await page.evaluate(() => {
    document.querySelector('[data-layout="grid"]')?.click();
  });
  await s.wait(500);
  await page.evaluate(() => {
    document.querySelector('[data-size="1m"]')?.click();
  });
  await s.wait(1000);

  async function getState() {
    return page.evaluate(() => {
      const vp = document.querySelector(".vlist-viewport");
      const focused = vp?.querySelector(".vlist-item--focused");
      const vpRect = vp?.getBoundingClientRect();
      const focRect = focused?.getBoundingClientRect();
      return {
        idx: focused?.dataset?.index ?? "(none)",
        focTop: focRect ? Math.round(focRect.top - vpRect.top) : null,
        focBottom: focRect ? Math.round(focRect.bottom - vpRect.top) : null,
        vpH: Math.round(vpRect?.height ?? 0),
        gapTop: focRect ? Math.round(focRect.top - vpRect.top) : null,
        gapBottom: focRect ? Math.round(vpRect.bottom - focRect.bottom) : null,
        scroll: Math.round(vp?.scrollTop ?? 0),
      };
    });
  }

  // ── Test 1: ArrowDown from top ──
  console.log("── ArrowDown from top ──");
  await page.click("#list-container");
  await s.wait(200);
  await page.keyboard.press("Home");
  await s.wait(300);

  // Press down until scrolling starts, then a few more
  let scrollStarted = false;
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("ArrowDown");
    await s.wait(100);
    const st = await getState();
    if (st.scroll > 0 && !scrollStarted) {
      scrollStarted = true;
      console.log(`  Scroll started at press ${i + 1}`);
    }
    if (scrollStarted) {
      console.log(`  ↓${i + 1}: [${st.idx}] gapBottom=${st.gapBottom}px focBottom=${st.focBottom}px scroll=${st.scroll}`);
      if (i > 5) break;
    }
  }

  // ── Test 2: ArrowUp from bottom ──
  console.log("\n── ArrowUp from bottom ──");
  await page.keyboard.press("End");
  await s.wait(800);

  scrollStarted = false;
  let endScroll = (await getState()).scroll;
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("ArrowUp");
    await s.wait(100);
    const st = await getState();
    if (st.scroll < endScroll && !scrollStarted) {
      scrollStarted = true;
      console.log(`  Scroll started at press ${i + 1}`);
    }
    if (scrollStarted) {
      console.log(`  ↑${i + 1}: [${st.idx}] gapTop=${st.gapTop}px focTop=${st.focTop}px scroll=${st.scroll}`);
      if (i > 5) break;
    }
    endScroll = st.scroll;
  }

  // ── Test 3: Middle of list ──
  console.log("\n── Middle of list ──");
  await page.evaluate(() => {
    document.querySelector('[data-size="1m"]')?.click();
  });
  await s.wait(1000);
  await page.click("#list-container");
  await s.wait(200);
  // Navigate to middle
  const input = await page.$("#scroll-index");
  await input.click({ clickCount: 3 });
  await input.type("500000");
  await page.click("#btn-go");
  await s.wait(500);
  // Click to focus, then navigate
  await page.evaluate(() => {
    const items = document.querySelectorAll(".vlist-content [data-index]");
    if (items.length) items[Math.floor(items.length / 2)].dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await s.wait(200);

  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("ArrowDown");
    await s.wait(100);
  }
  const midDown = await getState();
  console.log(`  After 3x↓: [${midDown.idx}] gapBottom=${midDown.gapBottom}px`);

  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("ArrowUp");
    await s.wait(100);
  }
  const midUp = await getState();
  console.log(`  After 6x↑: [${midUp.idx}] gapTop=${midUp.gapTop}px`);

  console.log("\n  Expected gap ≈ 8px (padding config = 8)");

  return { pass: true };
});
