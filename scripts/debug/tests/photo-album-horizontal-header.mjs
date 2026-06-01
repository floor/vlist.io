import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 2000 }, async (s) => {
  const { page } = s;
  console.log("\n=== Horizontal group header rotation ===\n");

  // Enable groups
  await page.evaluate(() => {
    const t = document.querySelector("#groups-toggle");
    if (t && !t.checked) t.click();
  });
  await s.wait(1500);

  // Switch to horizontal (X) primary axis
  await page.evaluate(() => {
    const btn = document.querySelector('[data-orientation="horizontal"]');
    if (btn) btn.click();
  });
  await s.wait(1500);

  const r = await page.evaluate(() => {
    const root = document.querySelector(".vlist");
    const header = document.querySelector(".vlist-group-header");
    const sticky = document.querySelector(".vlist-sticky-header .sticky-group");
    const wm = (el) => el ? getComputedStyle(el).writingMode : "(none)";
    return {
      horizontal: root?.classList.contains("vlist--horizontal"),
      headerWritingMode: wm(header),
      stickyWritingMode: wm(sticky),
      headerText: header?.textContent?.trim(),
    };
  });
  console.log("Horizontal mode:", r.horizontal ? "✅" : "❌");
  console.log("Header writing-mode:", r.headerWritingMode);
  console.log("Sticky writing-mode:", r.stickyWritingMode);
  console.log("Header text:", r.headerText);
  console.log(r.headerWritingMode.startsWith("vertical") ? "✅ rotated" : "❌ not rotated");
  console.log("");
});
