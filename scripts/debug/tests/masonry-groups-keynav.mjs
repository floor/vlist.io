/**
 * Debug: masonry + groups keyboard navigation
 *
 * With masonry + groups enabled, ArrowDown from the first item
 * jumps to a different lane instead of staying in lane 0.
 *
 * Usage:
 *   bun run scripts/debug/tests/masonry-groups-keynav.mjs
 *   bun run scripts/debug/tests/masonry-groups-keynav.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Masonry + Groups Keyboard Nav Debug ===\n");

  // 1. Select masonry mode
  await page.evaluate(() => {
    const btns = document.querySelectorAll(".ui-segmented__btn");
    for (const b of btns) {
      if (b.textContent.trim() === "Masonry") { b.click(); break; }
    }
  });
  await s.wait(500);

  // 2. Ensure groups is on
  await page.evaluate(() => {
    const toggle = document.getElementById("groups-toggle");
    if (toggle && !toggle.checked) toggle.click();
  });
  await s.wait(1000);

  // 3. Click the first item to select it
  await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const items = content?.querySelectorAll("[data-index]");
    if (items?.length) {
      // Find the first non-header item
      for (const el of items) {
        if (!el.classList.contains("vlist-masonry-group-header") &&
            !el.classList.contains("vlist-group-header")) {
          el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          break;
        }
      }
    }
  });
  await s.wait(300);

  // Get initial state
  const initial = await page.evaluate(() => {
    const focused = document.querySelector(".vlist-item--focused, .vlist-item--selected");
    if (!focused) return null;
    const vpRect = document.querySelector(".vlist-viewport")?.getBoundingClientRect();
    const focRect = focused.getBoundingClientRect();
    return {
      idx: focused.dataset.index,
      id: focused.getAttribute("data-id"),
      lane: Math.round(focRect.left - vpRect.left),
      top: Math.round(focRect.top - vpRect.top),
      text: focused.textContent?.trim()?.substring(0, 30),
    };
  });

  if (!initial) {
    console.log("❌ No focused item found after click");
    return { pass: false };
  }

  console.log(`Initial: [${initial.idx}] "${initial.text}" lane=${initial.lane}px top=${initial.top}px`);

  // 4. ArrowDown 3 times — should stay in same lane
  const results = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("ArrowDown");
    await s.wait(200);

    const state = await page.evaluate(() => {
      const focused = document.querySelector(".vlist-item--focused, .vlist-item--selected");
      if (!focused) return null;
      const vpRect = document.querySelector(".vlist-viewport")?.getBoundingClientRect();
      const focRect = focused.getBoundingClientRect();
      return {
        idx: focused.dataset.index,
        id: focused.getAttribute("data-id"),
        lane: Math.round(focRect.left - vpRect.left),
        top: Math.round(focRect.top - vpRect.top),
        text: focused.textContent?.trim()?.substring(0, 30),
      };
    });

    if (!state) {
      console.log(`  ↓${i + 1}: (no focused item)`);
      continue;
    }

    const sameLane = Math.abs(state.lane - initial.lane) < 10;
    results.push(sameLane);
    console.log(`  ↓${i + 1}: [${state.idx}] "${state.text}" lane=${state.lane}px ${sameLane ? "✓ same lane" : "❌ LANE CHANGED (was " + initial.lane + ")"}`);
  }

  // Also check: what does the nav config look like?
  const navInfo = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const items = Array.from(content?.querySelectorAll("[data-index]") ?? []);
    const indices = items.map(el => parseInt(el.dataset.index)).sort((a, b) => a - b);
    return {
      totalRendered: items.length,
      firstFew: indices.slice(0, 10),
      hasHeaders: items.some(el =>
        el.classList.contains("vlist-masonry-group-header") ||
        el.classList.contains("vlist-group-header")
      ),
    };
  });
  console.log(`\nDOM: ${navInfo.totalRendered} rendered, headers=${navInfo.hasHeaders}`);
  console.log(`  First indices: [${navInfo.firstFew.join(", ")}]`);

  const allSameLane = results.every(Boolean);
  console.log(`\nResult: ${allSameLane ? "✅ PASS" : "❌ FAIL"}`);

  return { pass: allSameLane };
});
