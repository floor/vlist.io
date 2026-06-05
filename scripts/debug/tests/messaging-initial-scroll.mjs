/**
 * Debug: messaging example — first item clipped at bottom on load
 *
 * When the messaging example loads (reverse mode), the last/newest
 * message should be fully visible at the bottom. Instead it's
 * partially off-screen below the viewport.
 *
 * Usage:
 *   bun run scripts/debug/tests/messaging-initial-scroll.mjs
 *   bun run scripts/debug/tests/messaging-initial-scroll.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/messaging", { settle: 4000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Messaging Initial Scroll Debug ===\n");

  // Check at different times to catch the initial render issue
  for (const delay of [200, 500, 1000, 2000]) {
    await s.wait(delay === 200 ? 200 : delay - (delay === 500 ? 200 : delay === 1000 ? 500 : 1000));
    const clip = await page.evaluate((d) => {
      const vp = document.querySelector(".vlist-viewport");
      const content = document.querySelector(".vlist-content");
      const items = content?.querySelectorAll("[data-index]");
      const vpRect = vp?.getBoundingClientRect();
      let maxBottom = -Infinity;
      for (const el of items ?? []) {
        const r = el.getBoundingClientRect();
        if (r.bottom > maxBottom) maxBottom = r.bottom;
      }
      return {
        t: d,
        clip: Math.round(maxBottom - vpRect.bottom),
        scroll: Math.round(vp?.scrollTop ?? 0),
        scrollMax: Math.round((vp?.scrollHeight ?? 0) - (vp?.clientHeight ?? 0)),
        count: items?.length ?? 0,
      };
    }, delay);
    const ok = clip.clip <= 1;
    console.log(`  t=${clip.t}ms: clip=${clip.clip}px scroll=${clip.scroll}/${clip.scrollMax} items=${clip.count} ${ok ? "✓" : "❌"}`);
  }

  const state = await page.evaluate(() => {
    const vp = document.querySelector(".vlist-viewport");
    const content = document.querySelector(".vlist-content");
    const items = content?.querySelectorAll("[data-index]");
    const vpRect = vp?.getBoundingClientRect();

    // Find the last (newest/bottommost) rendered item
    let lastItem = null;
    let maxBottom = -Infinity;
    for (const el of items ?? []) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom > maxBottom) {
        maxBottom = rect.bottom;
        lastItem = el;
      }
    }

    const lastRect = lastItem?.getBoundingClientRect();

    // Also check the first few items from the bottom
    const bottomItems = Array.from(items ?? [])
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          idx: el.dataset.index,
          top: Math.round(r.top - vpRect.top),
          bottom: Math.round(r.bottom - vpRect.top),
          text: el.textContent?.trim()?.substring(0, 30),
        };
      })
      .sort((a, b) => b.bottom - a.bottom)
      .slice(0, 5);

    return {
      vpHeight: Math.round(vpRect?.height ?? 0),
      vpBottom: Math.round(vpRect?.bottom ?? 0),
      scroll: Math.round(vp?.scrollTop ?? 0),
      scrollMax: Math.round((vp?.scrollHeight ?? 0) - (vp?.clientHeight ?? 0)),
      contentHeight: content?.style?.height,
      lastItemBottom: lastRect ? Math.round(lastRect.bottom - vpRect.top) : null,
      lastItemClipped: lastRect ? lastRect.bottom > vpRect.bottom + 1 : null,
      clipAmount: lastRect ? Math.round(lastRect.bottom - vpRect.bottom) : null,
      lastItemIdx: lastItem?.dataset?.index,
      lastItemText: lastItem?.textContent?.trim()?.substring(0, 30),
      renderedCount: items?.length ?? 0,
      bottomItems,
    };
  });

  console.log(`Viewport: ${state.vpHeight}px, scroll=${state.scroll}/${state.scrollMax}`);
  console.log(`Content height: ${state.contentHeight}`);
  console.log(`Rendered items: ${state.renderedCount}`);
  console.log();
  console.log(`Last item: [${state.lastItemIdx}] "${state.lastItemText}"`);
  console.log(`  bottom from vpTop: ${state.lastItemBottom}px (vpH=${state.vpHeight})`);
  console.log(`  clipped: ${state.lastItemClipped} by ${state.clipAmount}px`);
  console.log();
  console.log("Bottom items:");
  for (const item of state.bottomItems) {
    const clipped = item.bottom > state.vpHeight;
    console.log(`  [${item.idx}] bottom=${item.bottom}px ${clipped ? "❌ CLIPPED by " + (item.bottom - state.vpHeight) + "px" : "✓"} "${item.text}"`);
  }

  const pass = !state.lastItemClipped;
  console.log(`\nResult: ${pass ? "✅ PASS" : "❌ FAIL — last item clipped by " + state.clipAmount + "px"}`);

  return { pass };
});
