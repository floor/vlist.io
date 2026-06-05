/**
 * Debug: ArrowDown doesn't scroll when focus reaches bottom of viewport
 *
 * At 500K+ (scale active), pressing ArrowDown from the top eventually
 * moves focus off-screen below the viewport without scrolling.
 * Works at 100K (no scale).
 *
 * Usage:
 *   bun run scripts/debug/tests/scale-keydown-scroll.mjs
 *   bun run scripts/debug/tests/scale-keydown-scroll.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/large-list", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Scale ArrowDown Scroll Debug ===\n");

  for (const size of ["100k", "500k"]) {
    await page.evaluate((sz) => {
      document.querySelector(`[data-size="${sz}"]`)?.click();
    }, size);
    await s.wait(1000);

    // Focus the list
    await page.click("#list-container");
    await s.wait(200);

    // Press Home to start at index 0
    await page.keyboard.press("Home");
    await s.wait(300);

    console.log(`── ${size.toUpperCase()} ──`);

    // Press ArrowDown enough times to go past the viewport bottom
    let lastOffscreen = -1;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("ArrowDown");
      await s.wait(80);

      const state = await page.evaluate(() => {
        const vp = document.querySelector(".vlist-viewport");
        const focused = document.querySelector(".vlist-item--focused");
        const vpRect = vp?.getBoundingClientRect();
        const focRect = focused?.getBoundingClientRect();
        return {
          idx: focused?.dataset?.index,
          focusTop: focRect ? Math.round(focRect.top - vpRect.top) : null,
          focusBottom: focRect ? Math.round(focRect.bottom - vpRect.top) : null,
          vpHeight: Math.round(vpRect?.height ?? 0),
          scroll: Math.round(vp?.scrollTop ?? 0),
          offscreen: focRect ? focRect.bottom > vpRect.bottom + 1 : null,
        };
      });

      const flag = state.offscreen ? "❌ OFF-SCREEN" : "✓";
      if (state.offscreen) lastOffscreen = i;

      // Only print the interesting part — when focus nears/passes the bottom
      if (state.focusBottom > state.vpHeight - 150 || state.offscreen) {
        console.log(`  ↓${i + 1}: [${state.idx}] bottom=${state.focusBottom}px vpH=${state.vpHeight} scroll=${state.scroll} ${flag}`);
      }
    }

    if (lastOffscreen >= 0) {
      console.log(`  ❌ Focus went off-screen at press ${lastOffscreen + 1}`);
    } else {
      console.log(`  ✅ Focus always stayed in viewport`);
    }
    console.log();
  }

  return { pass: true };
});
