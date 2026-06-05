/**
 * Debug: groups + horizontal axis — group headers should not appear
 *
 * When primary axis is X with grid/masonry + groups, the inline group
 * headers are visible alongside the sticky header. They should be hidden
 * since the sticky header handles group labels in horizontal mode.
 *
 * Usage:
 *   bun run scripts/debug/tests/groups-horizontal-headers.mjs
 *   bun run scripts/debug/tests/groups-horizontal-headers.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Groups Horizontal Headers Debug ===\n");

  async function checkHeaders(label) {
    const info = await page.evaluate(() => {
      const headers = document.querySelectorAll(".vlist-group-header");
      const sticky = document.querySelector(".vlist-sticky-header");
      const visibleHeaders = Array.from(headers).filter(el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 &&
               style.display !== "none" && style.visibility !== "hidden";
      });
      return {
        totalHeaders: headers.length,
        visibleHeaders: visibleHeaders.length,
        firstHeaderText: visibleHeaders[0]?.textContent?.trim() ?? "(none)",
        stickyExists: !!sticky,
        stickyVisible: sticky ? getComputedStyle(sticky).display !== "none" : false,
        stickyText: sticky?.textContent?.trim() ?? "(none)",
      };
    });
    const ok = info.visibleHeaders === 0;
    console.log(`  ${label}:`);
    console.log(`    Inline headers: ${info.visibleHeaders}/${info.totalHeaders} visible ${ok ? "✅" : "❌ SHOULD BE 0"}`);
    console.log(`    Sticky: exists=${info.stickyExists} visible=${info.stickyVisible} "${info.stickyText}"`);
    if (info.visibleHeaders > 0) {
      console.log(`    First visible header: "${info.firstHeaderText}"`);
    }
    return ok;
  }

  // ── Test 1: Grid + X axis + groups ──
  console.log("── Grid + X axis + groups ──");
  await page.evaluate(() => {
    for (const b of document.querySelectorAll(".ui-segmented__btn")) {
      if (b.textContent.trim() === "Grid") { b.click(); break; }
    }
  });
  await s.wait(300);
  await page.evaluate(() => {
    for (const b of document.querySelectorAll(".ui-segmented__btn")) {
      if (b.textContent.trim() === "X") { b.click(); break; }
    }
  });
  await s.wait(300);
  await page.evaluate(() => {
    const t = document.getElementById("groups-toggle");
    if (t && !t.checked) t.click();
  });
  await s.wait(1000);
  const gridX = await checkHeaders("Grid + X + groups");

  // ── Test 2: Masonry + X axis + groups ──
  console.log("\n── Masonry + X axis + groups ──");
  await page.evaluate(() => {
    for (const b of document.querySelectorAll(".ui-segmented__btn")) {
      if (b.textContent.trim() === "Masonry") { b.click(); break; }
    }
  });
  await s.wait(1000);
  const masonryX = await checkHeaders("Masonry + X + groups");

  // ── Test 3: Grid + Y axis + groups (should have visible headers) ──
  console.log("\n── Grid + Y axis + groups (control) ──");
  await page.evaluate(() => {
    for (const b of document.querySelectorAll(".ui-segmented__btn")) {
      if (b.textContent.trim() === "Grid") { b.click(); break; }
    }
  });
  await s.wait(300);
  await page.evaluate(() => {
    for (const b of document.querySelectorAll(".ui-segmented__btn")) {
      if (b.textContent.trim() === "Y") { b.click(); break; }
    }
  });
  await s.wait(1000);
  const gridY = await page.evaluate(() => {
    const headers = document.querySelectorAll(".vlist-group-header");
    const visible = Array.from(headers).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    return visible.length;
  });
  console.log(`  Grid + Y + groups: ${gridY} visible headers ${gridY > 0 ? "✅ (expected)" : "❌"}`);

  console.log(`\nResult: gridX=${gridX ? "✅" : "❌"} masonryX=${masonryX ? "✅" : "❌"}`);

  return { pass: gridX && masonryX };
});
