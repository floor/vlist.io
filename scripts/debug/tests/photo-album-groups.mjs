/**
 * Debug: photo-album groups — verify category grouping with grid
 *
 * Usage:
 *   bun run scripts/debug/tests/photo-album-groups.mjs
 *   bun run scripts/debug/tests/photo-album-groups.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 2000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Photo Album Groups Debug ===\n");

  const info = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const items = Array.from(content?.children ?? []);
    const headers = items.filter(el => el.classList.contains("vlist-group-header"));
    const sticky = document.querySelector(".vlist-sticky-header");

    return {
      totalChildren: items.length,
      headerCount: headers.length,
      firstHeader: headers[0]?.textContent?.trim(),
      stickyText: sticky?.textContent?.trim().substring(0, 30) || "(empty)",
      hasGroupedClass: !!document.querySelector(".vlist--grouped"),
    };
  });

  console.log("Children:", info.totalChildren, "Headers:", info.headerCount);
  console.log("First header:", info.firstHeader);
  console.log("Sticky:", info.stickyText);
  console.log("Grouped class:", info.hasGroupedClass ? "✅" : "❌");

  // Scroll to cross multiple group boundaries
  const positions = [5000, 13000, 20000];
  for (const pos of positions) {
    await s.scrollTo(pos);
    await s.wait(300);

    const state = await page.evaluate(() => {
      const content = document.querySelector(".vlist-content");
      const items = Array.from(content?.children ?? []);
      const headers = items.filter(el => el.classList.contains("vlist-group-header"));
      const sticky = document.querySelector(".vlist-sticky-header");
      return {
        children: items.length,
        headers: headers.map(el => el.textContent?.trim()),
        sticky: sticky?.textContent?.trim().substring(0, 30) || "(empty)",
      };
    });

    console.log(`\n@${pos}px — ${state.children} items, sticky: "${state.sticky}", headers: [${state.headers.join(", ")}]`);
  }

  console.log("");
});
