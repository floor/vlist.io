/**
 * Debug: file-browser table + groups layout
 *
 * Checks if table view with "Kind" grouping renders correctly.
 *
 * Usage:
 *   bun run scripts/debug/tests/file-browser-table.mjs
 *   bun run scripts/debug/tests/file-browser-table.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/file-browser", { settle: 2000 }, async (s) => {
  const { page } = s;

  console.log("\n=== File Browser Table + Groups Debug ===\n");

  // Default is list/table view. Select "Kind" to enable groups.
  await page.select("#arrange-by-select", "kind");
  await s.wait(1000);

  const info = await page.evaluate(() => {
    const container = document.getElementById("browser-container");
    const vlist = container?.querySelector(".vlist");
    const content = container?.querySelector(".vlist-content");
    const items = Array.from(content?.children ?? []);
    const containerRect = container?.getBoundingClientRect();

    return {
      container: {
        width: container?.clientWidth,
        height: container?.clientHeight,
      },
      vlist: {
        classes: vlist?.className ?? "(none)",
        hasTable: vlist?.classList.contains("vlist--table") ?? false,
        hasGrouped: vlist?.classList.contains("vlist--grouped") ?? false,
      },
      content: {
        height: content?.style.height,
        children: items.length,
      },
      items: items.slice(0, 15).map(el => {
        const rect = el.getBoundingClientRect();
        return {
          idx: el.dataset.index,
          id: el.dataset.id,
          role: el.getAttribute("role"),
          cls: el.className.includes("group-header") ? "HEADER" : el.className.includes("table") ? "TABLE" : "item",
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          x: Math.round(rect.left - (containerRect?.left ?? 0)),
          y: Math.round(rect.top - (containerRect?.top ?? 0)),
          transform: el.style.transform,
          text: el.textContent?.trim().substring(0, 30),
        };
      }),
    };
  });

  console.log("Container:", JSON.stringify(info.container));
  console.log("VList:", JSON.stringify(info.vlist));
  console.log("Content:", JSON.stringify(info.content));

  console.log("\nItems (first 15):");
  console.log("  type    idx  role          w      h      y      text");
  for (const item of info.items) {
    console.log(
      `  ${(item.cls).padEnd(7)} ${(item.idx ?? "?").toString().padEnd(4)} ${(item.role ?? "-").padEnd(13)} ${String(item.w).padEnd(6)} ${String(item.h).padEnd(6)} ${String(item.y).padEnd(6)} ${item.text ?? ""}`
    );
  }

  // Check for issues
  const headers = info.items.filter(i => i.cls === "HEADER");
  const dataItems = info.items.filter(i => i.cls !== "HEADER");
  console.log(`\nHeaders: ${headers.length}, Data items: ${dataItems.length}`);

  // Check if items overlap or have gaps
  const sorted = [...info.items].sort((a, b) => a.y - b.y);
  let issues = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].y - sorted[i].y - sorted[i].h;
    if (gap < -1) {
      console.log(`  ❌ Overlap: [${sorted[i].idx}] and [${sorted[i+1].idx}] overlap by ${-gap}px`);
      issues++;
    } else if (gap > 5) {
      console.log(`  ⚠️  Gap: ${gap}px between [${sorted[i].idx}] and [${sorted[i+1].idx}]`);
    }
  }
  if (issues === 0) console.log("  ✅ No overlaps detected");

  // Also test without groups (default)
  console.log("\n--- Without groups (None) ---");
  await page.select("#arrange-by-select", "none");
  await s.wait(1000);

  const plain = await page.evaluate(() => {
    const container = document.getElementById("browser-container");
    const vlist = container?.querySelector(".vlist");
    const content = container?.querySelector(".vlist-content");
    const items = Array.from(content?.children ?? []);

    return {
      classes: vlist?.className ?? "(none)",
      children: items.length,
      firstFew: items.slice(0, 5).map(el => ({
        idx: el.dataset.index,
        h: el.offsetHeight,
        text: el.textContent?.trim().substring(0, 30),
      })),
    };
  });

  console.log("VList classes:", plain.classes);
  console.log("Children:", plain.children);
  console.log("First items:", plain.firstFew.map(i => `[${i.idx}] h=${i.h} "${i.text}"`).join(", "));

  console.log("");
});
