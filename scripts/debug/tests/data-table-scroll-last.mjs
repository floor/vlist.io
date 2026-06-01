import { run } from "../runner.mjs";

await run("/examples/data-table", { settle: 3000 }, async (s) => {
  const { page } = s;
  console.log("\n=== Data Table: Scroll to Last (detailed) ===\n");

  // Check initial state
  const init = await page.evaluate(() => ({
    totalItems: document.querySelector(".vlist")?.getAttribute("aria-rowcount"),
    loaded: document.querySelectorAll(".vlist-table-row").length,
  }));
  console.log("Init:", JSON.stringify(init));

  // Click the "last" nav button (▼)
  await page.evaluate(() => {
    document.querySelector("#btn-last")?.click();
  });

  // Wait for scroll + data load
  await s.wait(5000);

  const after = await page.evaluate(() => {
    const vp = document.querySelector(".vlist-viewport");
    const content = document.querySelector(".vlist-content");
    const rows = document.querySelectorAll(".vlist-table-row:not(.vlist-table-group-header)");
    const headers = document.querySelectorAll(".vlist-table-group-header");
    const allChildren = content?.children.length ?? 0;

    // Check what the scroll position and content dimensions are
    const scrollTop = Math.round(vp?.scrollTop ?? 0);
    const scrollHeight = Math.round(vp?.scrollHeight ?? 0);
    const vpHeight = Math.round(vp?.clientHeight ?? 0);
    const contentH = content?.style.height;

    // Check a few items at the rendered range
    const rendered = Array.from(content?.children ?? []).map(el => ({
      idx: el.dataset?.index,
      cls: el.className.substring(0, 40),
      h: el.offsetHeight,
      transform: el.style?.transform?.substring(0, 30),
    }));

    return {
      scrollTop, scrollHeight, vpHeight, contentH,
      rowCount: rows.length,
      headerCount: headers.length,
      allChildren,
      rendered: rendered.slice(0, 5),
      lastRendered: rendered.slice(-3),
    };
  });

  console.log("After scroll to last:");
  console.log("  scroll:", after.scrollTop, "/", after.scrollHeight, "vpH:", after.vpHeight);
  console.log("  contentH:", after.contentH);
  console.log("  rows:", after.rowCount, "headers:", after.headerCount, "total children:", after.allChildren);
  console.log("  first items:", JSON.stringify(after.rendered));
  console.log("  last items:", JSON.stringify(after.lastRendered));
  console.log(after.rowCount > 0 ? "  ✅" : "  ❌ EMPTY");

  console.log("");
});
