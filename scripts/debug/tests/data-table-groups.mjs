/**
 * Debug: data-table group headers + sticky behavior
 *
 * Usage:
 *   bun run scripts/debug/tests/data-table-groups.mjs
 *   bun run scripts/debug/tests/data-table-groups.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/data-table", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Data Table Groups Debug ===\n");

  // Check initial state
  const info = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const viewport = document.querySelector(".vlist-viewport");
    const items = Array.from(content?.children ?? []);

    const headers = items.filter(el => el.classList.contains("vlist-table-group-header"));
    const dataRows = items.filter(el => !el.classList.contains("vlist-table-group-header") && el.classList.contains("vlist-table-row"));

    return {
      totalChildren: items.length,
      headerCount: headers.length,
      dataRowCount: dataRows.length,
      scrollTop: Math.round(viewport?.scrollTop ?? 0),
      headers: headers.map(el => {
        const rect = el.getBoundingClientRect();
        const vpRect = viewport?.getBoundingClientRect();
        return {
          idx: el.dataset.index,
          text: el.textContent?.trim().substring(0, 20),
          transform: el.style.transform,
          y: Math.round(rect.top - (vpRect?.top ?? 0)),
          h: el.offsetHeight,
          zIndex: el.style.zIndex,
          innerTransform: el.querySelector(".vlist-table-group-header-content")?.style.transform,
        };
      }),
    };
  });

  console.log("Children:", info.totalChildren, "Headers:", info.headerCount, "Data:", info.dataRowCount);
  console.log("Headers:", JSON.stringify(info.headers, null, 2));

  // Scroll down a bit to test sticky
  console.log("\n--- Scrolling to 200px ---");
  await s.scrollTo(200);
  await s.wait(500);

  const afterScroll = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const viewport = document.querySelector(".vlist-viewport");
    const headers = Array.from(content?.querySelectorAll(".vlist-table-group-header") ?? []);

    return {
      scrollTop: Math.round(viewport?.scrollTop ?? 0),
      headers: headers.map(el => {
        const rect = el.getBoundingClientRect();
        const vpRect = viewport?.getBoundingClientRect();
        return {
          idx: el.dataset.index,
          text: el.textContent?.trim().substring(0, 20),
          transform: el.style.transform,
          relativeY: Math.round(rect.top - (vpRect?.top ?? 0)),
          zIndex: el.style.zIndex,
          innerTransform: el.querySelector(".vlist-table-group-header-content")?.style.transform,
          stuck: el.querySelector(".group-header--stuck") !== null,
        };
      }),
    };
  });

  console.log("ScrollTop:", afterScroll.scrollTop);
  console.log("Headers after scroll:", JSON.stringify(afterScroll.headers, null, 2));

  // Check if any header is stuck
  const stuckHeaders = afterScroll.headers.filter(h => h.stuck);
  console.log(`\nStuck headers: ${stuckHeaders.length} ${stuckHeaders.length > 0 ? "✅" : "❌ none stuck"}`);

  console.log("");
});
