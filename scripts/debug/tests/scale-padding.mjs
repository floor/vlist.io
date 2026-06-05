/**
 * Debug: padding with scale plugin
 *
 * At 100K (no scale) the top/bottom padding is visible.
 * At 1M (scale active) the padding is missing — last item
 * is flush against the viewport edge.
 *
 * Usage:
 *   bun run scripts/debug/tests/scale-padding.mjs
 *   bun run scripts/debug/tests/scale-padding.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/large-list", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Scale Padding Debug ===\n");

  for (const size of ["100k", "1m"]) {
    await page.evaluate((sz) => {
      document.querySelector(`[data-size="${sz}"]`)?.click();
    }, size);
    await s.wait(1000);

    // --- Top: scroll to first item ---
    await page.click("#list-container");
    await s.wait(200);
    await page.keyboard.press("Home");
    await s.wait(800);

    const top = await page.evaluate(() => {
      const vp = document.querySelector(".vlist-viewport");
      const content = document.querySelector(".vlist-content");
      const items = content?.querySelectorAll("[data-index]");
      const first = items?.[0];
      const vpRect = vp?.getBoundingClientRect();
      const firstRect = first?.getBoundingClientRect();
      const contentRect = content?.getBoundingClientRect();
      return {
        firstIdx: first?.dataset?.index,
        firstTop: firstRect ? Math.round(firstRect.top - vpRect.top) : null,
        contentTop: contentRect ? Math.round(contentRect.top - vpRect.top) : null,
        contentPaddingTop: content ? getComputedStyle(content).paddingTop : null,
        scroll: Math.round(vp?.scrollTop ?? 0),
      };
    });

    // --- Bottom: scroll to last item ---
    await page.keyboard.press("End");
    await s.wait(800);

    const bottom = await page.evaluate(() => {
      const vp = document.querySelector(".vlist-viewport");
      const content = document.querySelector(".vlist-content");
      const focused = content?.querySelector(".vlist-item--focused");
      const vpRect = vp?.getBoundingClientRect();
      const focRect = focused?.getBoundingClientRect();
      const contentStyle = content ? getComputedStyle(content) : null;
      return {
        focusedIdx: focused?.dataset?.index,
        focusBottom: focRect ? Math.round(focRect.bottom - vpRect.top) : null,
        vpHeight: vpRect ? Math.round(vpRect.height) : null,
        gapBelow: focRect && vpRect ? Math.round(vpRect.bottom - focRect.bottom) : null,
        scroll: Math.round(vp?.scrollTop ?? 0),
        scrollMax: Math.round((vp?.scrollHeight ?? 0) - (vp?.clientHeight ?? 0)),
        contentHeight: content?.style?.height,
        paddingTop: contentStyle?.paddingTop,
        paddingBottom: contentStyle?.paddingBottom,
      };
    });

    console.log(`── ${size.toUpperCase()} ──`);
    console.log(`  TOP:    first=[${top.firstIdx}] firstTop=${top.firstTop}px contentTop=${top.contentTop}px scroll=${top.scroll}`);
    console.log(`  BOTTOM: last=[${bottom.focusedIdx}] gapBelow=${bottom.gapBelow}px scroll=${bottom.scroll}/${bottom.scrollMax}`);
    console.log(`  CSS:    padding=${bottom.paddingTop}/${bottom.paddingBottom} contentH=${bottom.contentHeight}`);
    console.log();
  }

  return { pass: true };
});
