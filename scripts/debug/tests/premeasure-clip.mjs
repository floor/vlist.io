/**
 * Debug: Pre-measure clipping in variable-sizes Mode A.
 *
 * Checks whether items are clipped (scrollHeight > offsetHeight) after
 * pre-measurement, comparing the measured size vs actual rendered size.
 */

import { run } from "../runner.mjs";

await run("/examples/variable-sizes", { settle: 2000 }, async (s) => {
  // Check viewport and content dimensions
  const scroll = await s.scrollState();
  s.print(scroll, "Scroll state");

  // Snapshot first few items
  const snap = await s.snapshot({ first: 6 });
  s.print(snap, "First 6 items");

  // Check for clipped items
  const clipped = await s.clipped();
  s.print(clipped, `Clipped items (${clipped.length} total)`);

  // Compare measurement vs actual for first items
  const detail = await s.evaluate(() => {
    const viewport = document.querySelector(".vlist-viewport");
    const content = document.querySelector(".vlist-content");
    const items = content ? Array.from(content.children).slice(0, 8) : [];

    return {
      viewportClientWidth: viewport?.clientWidth,
      viewportOffsetWidth: viewport?.offsetWidth,
      viewportScrollbarWidth: (viewport?.offsetWidth ?? 0) - (viewport?.clientWidth ?? 0),
      contentOffsetWidth: content?.offsetWidth,
      items: items.map((el) => {
        const cs = getComputedStyle(el);
        return {
          idx: el.dataset.index,
          styleHeight: el.style.height,
          offsetHeight: el.offsetHeight,
          scrollHeight: el.scrollHeight,
          offsetWidth: el.offsetWidth,
          left: cs.left,
          right: cs.right,
          delta: el.scrollHeight - el.offsetHeight,
        };
      }),
    };
  });

  console.log("\n=== Width analysis ===");
  console.log(`  viewport offsetWidth:  ${detail.viewportOffsetWidth}`);
  console.log(`  viewport clientWidth:  ${detail.viewportClientWidth}`);
  console.log(`  scrollbar width:       ${detail.viewportScrollbarWidth}`);
  console.log(`  content offsetWidth:   ${detail.contentOffsetWidth}`);

  console.log("\n=== Item detail ===");
  for (const it of detail.items) {
    const clip = it.delta > 0 ? ` CLIPPED by ${it.delta}px` : " OK";
    console.log(
      `  [${it.idx}] style=${it.styleHeight} offset=${it.offsetHeight} scroll=${it.scrollHeight} w=${it.offsetWidth} left=${it.left} right=${it.right}${clip}`,
    );
  }
});
