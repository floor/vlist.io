/**
 * Debug: Grid PageDown/PageUp keyboard navigation (#60).
 * Tests that PageDown/PageUp moves by a full page (not just one row)
 * across different column counts in the photo album example.
 *
 *   bun scripts/debug/tests/grid-pagedown.mjs
 */
import { run } from "../runner.mjs";

const SEL = {
  vp: ".vlist-viewport",
  content: ".vlist-content",
  item: ".vlist-item, .vlist-grid-item",
  root: ".vlist",
};

await run("/examples/photo-album", { settle: 2000 }, async (s) => {
  const { page } = s;

  console.log("\n=== GRID PAGEDOWN/PAGEUP TEST (#60) ===\n");

  // Helper: get focused item index and viewport info
  async function getFocusState() {
    return page.evaluate((sel) => {
      const root = document.querySelector(sel.root);
      const vp = document.querySelector(sel.vp);
      if (!root || !vp) return { error: "missing elements" };

      const focused = document.querySelector("[data-index].vlist-item--focused, [data-index].vlist-grid-item.vlist-item--focused");
      const activeDesc = root.getAttribute("aria-activedescendant");
      const allItems = document.querySelectorAll(sel.item);

      return {
        focusedIndex: focused ? parseInt(focused.dataset.index) : null,
        activeDescendant: activeDesc,
        vpHeight: vp.clientHeight,
        scrollTop: Math.round(vp.scrollTop),
        domCount: allItems.length,
      };
    }, SEL);
  }

  // Helper: get row height from first visible item
  async function getRowHeight() {
    return page.evaluate((sel) => {
      const items = document.querySelectorAll(sel.item);
      if (items.length < 2) return null;
      const first = items[0].getBoundingClientRect();
      // Find first item on a different row (different Y)
      for (const item of items) {
        const rect = item.getBoundingClientRect();
        if (Math.abs(rect.top - first.top) > 5) {
          return Math.round(rect.top - first.top);
        }
      }
      return Math.round(first.height);
    }, SEL);
  }

  // Focus the list by clicking the first grid item, then pressing ArrowDown
  async function focusList() {
    // Click the first visible grid item to give the list focus
    const clicked = await page.evaluate((sel) => {
      const item = document.querySelector(sel.item);
      if (item) { item.click(); return true; }
      return false;
    }, SEL);
    if (!clicked) {
      // Fallback: Tab into the list
      await s.press("Tab");
    }
    await s.wait(300);
    // Press ArrowDown to ensure keyboard focus is active
    await s.press("ArrowDown");
    await s.wait(300);
  }

  // Test PageDown at current column count
  async function testPageDown(label) {
    console.log(`\n── ${label} ──`);

    await focusList();
    const before = await getFocusState();
    const rowHeight = await getRowHeight();
    console.log(`  Row height: ${rowHeight}px, VP height: ${before.vpHeight}px`);
    console.log(`  Expected rows per page: ${rowHeight ? Math.floor(before.vpHeight / rowHeight) : "?"}`);
    console.log(`  Before: focused=${before.focusedIndex}, scroll=${before.scrollTop}`);

    // Press PageDown
    await s.press("PageDown");
    await s.wait(500);
    const afterDown = await getFocusState();
    const downDelta = afterDown.focusedIndex - (before.focusedIndex ?? 0);
    console.log(`  After PageDown: focused=${afterDown.focusedIndex}, scroll=${afterDown.scrollTop}`);
    console.log(`  Focus moved by: ${downDelta} items`);

    // Press PageDown again
    await s.press("PageDown");
    await s.wait(500);
    const afterDown2 = await getFocusState();
    const downDelta2 = afterDown2.focusedIndex - afterDown.focusedIndex;
    console.log(`  After 2nd PageDown: focused=${afterDown2.focusedIndex}, scroll=${afterDown2.scrollTop}`);
    console.log(`  Focus moved by: ${downDelta2} items`);

    // Press PageUp
    await s.press("PageUp");
    await s.wait(500);
    const afterUp = await getFocusState();
    const upDelta = afterUp.focusedIndex - afterDown2.focusedIndex;
    console.log(`  After PageUp: focused=${afterUp.focusedIndex}, scroll=${afterUp.scrollTop}`);
    console.log(`  Focus moved by: ${upDelta} items`);

    // Evaluate: did it move by approximately a page?
    const cols = await page.evaluate(() => {
      const items = document.querySelectorAll(".vlist-grid-item");
      if (items.length < 2) return 1;
      const firstY = items[0].getBoundingClientRect().top;
      let count = 0;
      for (const item of items) {
        if (Math.abs(item.getBoundingClientRect().top - firstY) < 5) count++;
        else break;
      }
      return count;
    });

    const rowsPerPage = rowHeight ? Math.floor(before.vpHeight / rowHeight) : 1;
    const expectedDelta = rowsPerPage * cols;
    const isPageJump = Math.abs(downDelta) >= cols * 2; // at minimum 2 rows
    console.log(`  Columns: ${cols}, Rows/page: ${rowsPerPage}, Expected delta: ~${expectedDelta}`);
    console.log(`  Verdict: ${isPageJump ? "MOVES MULTIPLE ROWS" : "ONLY MOVES 1 ROW — BUG"}`);

    return { cols, downDelta, downDelta2, upDelta: Math.abs(upDelta), expectedDelta, isPageJump };
  }

  // Test with default columns (whatever the example starts with)
  const result = await testPageDown("Default columns");

  // Try changing columns via data-cols controls
  const columnButtons = await page.evaluate(() => {
    const btns = document.querySelectorAll("[data-cols]");
    return Array.from(btns).map(b => b.dataset.cols);
  });

  if (columnButtons.length > 0) {
    for (const cols of columnButtons) {
      await page.click(`[data-cols="${cols}"]`);
      await s.wait(1500);
      await testPageDown(`${cols} columns`);
    }
  }

  // Summary
  console.log("\n=== SUMMARY ===");
  console.log("  Point 1 from #60: PageDown/PageUp in grid");
  console.log("  If 'ONLY MOVES 1 ROW' appears above, the bug is still present.");
  console.log("  If 'MOVES MULTIPLE ROWS' for all column counts, likely fixed in v2.");

  console.log("\n=== CONSOLE LOG ===");
  const errors = s.logs.filter((l) => /error|warn/i.test(l));
  console.log(errors.length ? errors.join("\n  ") : "  No errors/warnings");
});
