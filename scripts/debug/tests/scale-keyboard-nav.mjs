/**
 * Debug: keyboard navigation with scale plugin
 *
 * At 500K+ items, ArrowUp from the bottom doesn't move focus upward.
 * The focused item stays pinned at the bottom.
 *
 * Usage:
 *   bun run scripts/debug/tests/scale-keyboard-nav.mjs
 *   bun run scripts/debug/tests/scale-keyboard-nav.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/large-list", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Scale + Keyboard Navigation Debug ===\n");

  // 1. Choose grid layout
  await page.evaluate(() => {
    document.querySelector('[data-layout="grid"]')?.click();
  });
  await s.wait(500);

  // Set 1M size
  await page.evaluate(() => {
    document.querySelector('[data-size="1m"]')?.click();
  });
  await s.wait(1000);

  // 2. End key to reach the bottom
  await page.click("#list-container");
  await s.wait(300);

  // Check state before End
  const preEnd = await page.evaluate(() => {
    const vp = document.querySelector(".vlist-viewport");
    return {
      scroll: Math.round(vp?.scrollTop ?? 0),
      scrollMax: Math.round((vp?.scrollHeight ?? 0) - (vp?.clientHeight ?? 0)),
    };
  });
  console.log(`Pre-End: scroll=${preEnd.scroll}/${preEnd.scrollMax}`);

  await page.keyboard.press("End");
  await s.wait(1000);

  // Check what happened after End
  const postEnd = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const focused = content?.querySelector(".vlist-item--focused, .vlist-grid-item--focused");
    const selected = content?.querySelector(".vlist-item--selected, .vlist-grid-item--selected");
    const vp = document.querySelector(".vlist-viewport");
    const allItems = content?.querySelectorAll("[data-index]");
    const maxIdx = allItems?.length ? Math.max(...Array.from(allItems).map(el => parseInt(el.dataset.index))) : -1;
    return {
      focusedIdx: focused?.dataset?.index ?? "(none)",
      selectedIdx: selected?.dataset?.index ?? "(none)",
      scroll: Math.round(vp?.scrollTop ?? 0),
      scrollMax: Math.round((vp?.scrollHeight ?? 0) - (vp?.clientHeight ?? 0)),
      maxRenderedIdx: maxIdx,
    };
  });
  console.log(`Post-End: focused=[${postEnd.focusedIdx}] selected=[${postEnd.selectedIdx}] scroll=${postEnd.scroll}/${postEnd.scrollMax} maxRendered=${postEnd.maxRenderedIdx}`);

  // Get initial state
  const before = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const focused = content?.querySelector(".vlist-item--focused");
    const selected = content?.querySelector(".vlist-item--selected");
    const vp = document.querySelector(".vlist-viewport");
    // Check if focused item is visible
    const vpRect = vp?.getBoundingClientRect();
    const focRect = focused?.getBoundingClientRect();
    return {
      focusedIdx: focused?.dataset?.index,
      selectedIdx: selected?.dataset?.index,
      scroll: Math.round(vp?.scrollTop ?? 0),
      scrollMax: Math.round((vp?.scrollHeight ?? 0) - (vp?.clientHeight ?? 0)),
      focusTop: focRect ? Math.round(focRect.top - vpRect.top) : null,
      vpHeight: vpRect?.height,
    };
  });
  console.log("Before ArrowUp:");
  console.log(`  focused: [${before.focusedIdx}]  scroll: ${before.scroll}/${before.scrollMax}  focusTop: ${before.focusTop}px  vpH: ${before.vpHeight}`);

  // Press ArrowUp 10 times and track if the focused item stays at bottom
  let stuckCount = 0;
  let prevIdx = before.focusedIdx;

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("ArrowUp");
    await s.wait(150);

    const state = await page.evaluate(() => {
      const content = document.querySelector(".vlist-content");
      const focused = content?.querySelector(".vlist-item--focused");
      const vp = document.querySelector(".vlist-viewport");
      const vpRect = vp?.getBoundingClientRect();
      const focRect = focused?.getBoundingClientRect();
      return {
        focusedIdx: focused?.dataset?.index,
        scroll: Math.round(vp?.scrollTop ?? 0),
        focusTop: focRect ? Math.round(focRect.top - vpRect.top) : null,
        focusBottom: focRect ? Math.round(focRect.bottom - vpRect.top) : null,
        vpHeight: Math.round(vpRect?.height ?? 0),
      };
    });

    const idxMoved = state.focusedIdx !== prevIdx;
    const nearBottom = state.focusTop !== null && state.focusTop > state.vpHeight - 100;
    if (!idxMoved) stuckCount++;

    const flag = !idxMoved ? "❌ STUCK" : nearBottom ? "⚠️ NEAR BOTTOM" : "✓";
    console.log(`  ArrowUp ${i + 1}: focused=[${state.focusedIdx}] scroll=${state.scroll} top=${state.focusTop}px ${flag}`);
    prevIdx = state.focusedIdx;
  }

  const pass = stuckCount === 0;
  console.log(`\nResult: ${pass ? "✅ PASS" : "❌ FAIL"} (${stuckCount} stuck presses)`);

  return { pass };
});
