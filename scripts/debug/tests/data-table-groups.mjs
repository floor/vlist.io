/**
 * Debug: data-table group headers + sticky behavior
 *
 * Tests both fresh load and reload-with-snapshot scenarios.
 *
 * Usage:
 *   bun run scripts/debug/tests/data-table-groups.mjs
 *   bun run scripts/debug/tests/data-table-groups.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/data-table", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Data Table Groups Debug ===\n");

  // ── Fresh load ────────────────────────────────────────────────────

  const info = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const viewport = document.querySelector(".vlist-viewport");
    const items = Array.from(content?.children ?? []);
    const headers = items.filter(el => el.classList.contains("vlist-table-group-header"));
    const dataRows = items.filter(el => !el.classList.contains("vlist-table-group-header") && el.classList.contains("vlist-table-row"));
    const sticky = document.querySelector(".vlist-sticky-header");

    return {
      totalChildren: items.length,
      headerCount: headers.length,
      dataRowCount: dataRows.length,
      headers: headers.map(el => ({
        idx: el.dataset.index,
        text: el.textContent?.trim().substring(0, 20),
        h: el.offsetHeight,
      })),
      stickyText: sticky?.textContent?.trim().substring(0, 30) || "(empty)",
      stickyHeight: sticky?.offsetHeight ?? 0,
    };
  });

  console.log("Fresh load:");
  console.log("  Children:", info.totalChildren, "Headers:", info.headerCount, "Data:", info.dataRowCount);
  console.log("  Headers:", JSON.stringify(info.headers));
  console.log("  Sticky:", info.stickyText, `(${info.stickyHeight}px)`);

  // ── Reload with snapshot (tests the snapshots + async data race) ──

  await page.evaluate(() => {
    const snap = {
      scrollTop: 0,
      index: 0,
      offsetInItem: 0,
      selectedIds: [],
      total: 33352,
      dataTotal: 33352,
    };
    sessionStorage.setItem("data-table-list", JSON.stringify(snap));
  });
  await page.reload({ waitUntil: "networkidle0" });
  await s.wait(3000);

  const reloadInfo = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const items = Array.from(content?.children ?? []);
    const headers = items.filter(el => el.classList.contains("vlist-table-group-header"));
    const dataRows = items.filter(el => !el.classList.contains("vlist-table-group-header") && el.classList.contains("vlist-table-row"));
    const sticky = document.querySelector(".vlist-sticky-header");

    return {
      totalChildren: items.length,
      headerCount: headers.length,
      dataRowCount: dataRows.length,
      headers: headers.map(el => ({
        idx: el.dataset.index,
        text: el.textContent?.trim().substring(0, 20),
      })),
      stickyText: sticky?.textContent?.trim().substring(0, 30) || "(empty)",
    };
  });

  console.log("\nAfter reload (with snapshot):");
  console.log("  Children:", reloadInfo.totalChildren, "Headers:", reloadInfo.headerCount, "Data:", reloadInfo.dataRowCount);
  console.log("  Headers:", JSON.stringify(reloadInfo.headers));
  console.log("  Sticky:", reloadInfo.stickyText);

  // ── Scroll to test sticky transitions ─────────────────────────────

  console.log("\n--- Scrolling to 5000px ---");
  await s.scrollTo(5000);
  await s.wait(2000);

  const deepInfo = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const items = Array.from(content?.children ?? []);
    const headers = items.filter(el => el.classList.contains("vlist-table-group-header"));
    const sticky = document.querySelector(".vlist-sticky-header");
    return {
      headerCount: headers.length,
      headers: headers.map(el => ({ idx: el.dataset.index, text: el.textContent?.trim().substring(0, 20) })),
      stickyText: sticky?.textContent?.trim().substring(0, 30) || "(empty)",
    };
  });
  console.log("  Headers:", deepInfo.headerCount, JSON.stringify(deepInfo.headers));
  console.log("  Sticky:", deepInfo.stickyText);

  console.log("");
});
