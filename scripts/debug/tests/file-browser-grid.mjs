/**
 * Debug: file-browser grid layout
 *
 * Checks if grid items are laid out horizontally (multiple columns)
 * or stacked vertically (single column / grid plugin not working).
 *
 * Usage:
 *   bun run scripts/debug/tests/file-browser-grid.mjs
 *   bun run scripts/debug/tests/file-browser-grid.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/file-browser", { settle: 2000 }, async (s) => {
  const { page } = s;

  console.log("\n=== File Browser Grid Debug ===\n");

  // Switch to grid view
  await page.click("#btn-view-grid");
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
        rect: containerRect ? { w: Math.round(containerRect.width), h: Math.round(containerRect.height) } : null,
      },
      vlist: {
        classes: vlist?.className ?? "(none)",
        hasGrid: vlist?.classList.contains("vlist--grid") ?? false,
        hasGrouped: vlist?.classList.contains("vlist--grouped") ?? false,
      },
      content: {
        width: content?.style.width,
        height: content?.style.height,
        children: items.length,
      },
      items: items.slice(0, 8).map(el => {
        const rect = el.getBoundingClientRect();
        return {
          idx: el.dataset.index,
          id: el.dataset.id,
          cls: el.className.replace(/vlist-/g, "").substring(0, 60),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          x: Math.round(rect.left - (containerRect?.left ?? 0)),
          y: Math.round(rect.top - (containerRect?.top ?? 0)),
          transform: el.style.transform,
          text: el.textContent?.trim().substring(0, 20),
        };
      }),
    };
  });

  console.log("Container:", JSON.stringify(info.container));
  console.log("VList:", JSON.stringify(info.vlist));
  console.log("Content:", JSON.stringify(info.content));

  console.log("\nItems (first 8):");
  console.log("  idx  text                 w      h      x      y      transform");
  for (const item of info.items) {
    console.log(
      `  ${(item.idx ?? "?").toString().padEnd(4)} ${(item.text ?? "").padEnd(20)} ${String(item.w).padEnd(6)} ${String(item.h).padEnd(6)} ${String(item.x).padEnd(6)} ${String(item.y).padEnd(6)} ${item.transform}`
    );
  }

  // Check if items are in multiple columns
  const uniqueX = new Set(info.items.map(i => i.x));
  const isHorizontal = uniqueX.size > 1;
  console.log(`\nUnique X positions: ${uniqueX.size} → ${isHorizontal ? "✅ GRID (horizontal)" : "❌ VERTICAL (single column)"}`);

  // Now test with "Kind" grouping (the user's scenario)
  console.log("\n--- With 'Kind' grouping ---");
  const sortSelect = await page.$("#arrange-by-select");
  if (sortSelect) {
    await page.select("#arrange-by-select", "kind");
    await s.wait(1000);

    const grouped = await page.evaluate(() => {
      const container = document.getElementById("browser-container");
      const content = container?.querySelector(".vlist-content");
      const vlist = container?.querySelector(".vlist");
      const items = Array.from(content?.children ?? []);
      const containerRect = container?.getBoundingClientRect();

      return {
        classes: vlist?.className ?? "(none)",
        hasGrid: vlist?.classList.contains("vlist--grid") ?? false,
        hasGrouped: vlist?.classList.contains("vlist--grouped") ?? false,
        childCount: items.length,
        items: items.slice(0, 12).map(el => {
          const rect = el.getBoundingClientRect();
          return {
            idx: el.dataset.index,
            role: el.getAttribute("role"),
            cls: el.className.includes("group-header") ? "HEADER" : "item",
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            x: Math.round(rect.left - (containerRect?.left ?? 0)),
            y: Math.round(rect.top - (containerRect?.top ?? 0)),
            transform: el.style.transform,
            text: el.textContent?.trim().substring(0, 25),
          };
        }),
      };
    });

    console.log("VList classes:", grouped.classes);
    console.log("Grid:", grouped.hasGrid, "Grouped:", grouped.hasGrouped);
    console.log("Children:", grouped.childCount);

    console.log("\nItems:");
    console.log("  type    idx  text                      w      h      x      y");
    for (const item of grouped.items) {
      console.log(
        `  ${item.cls.padEnd(7)} ${(item.idx ?? "?").toString().padEnd(4)} ${(item.text ?? "").padEnd(25)} ${String(item.w).padEnd(6)} ${String(item.h).padEnd(6)} ${String(item.x).padEnd(6)} ${item.y}`
      );
    }

    const dataItems = grouped.items.filter(i => i.cls === "item");
    const uniqueXGrouped = new Set(dataItems.map(i => i.x));
    const isGroupedHorizontal = uniqueXGrouped.size > 1;
    console.log(`\nData items X positions: ${uniqueXGrouped.size} → ${isGroupedHorizontal ? "✅ GRID" : "❌ VERTICAL"}`);
  }

  console.log("");
  return { pass: isHorizontal };
});
