import { run } from "../runner.mjs";
await run("/examples/photo-album", { settle: 2000 }, async (s) => {
  const { page } = s;
  console.log("\n=== Masonry horizontal header rotation ===\n");
  await page.evaluate(() => { const t = document.querySelector("#groups-toggle"); if (t && !t.checked) t.click(); });
  await s.wait(1000);
  await page.evaluate(() => document.querySelector('[data-mode="masonry"]')?.click());
  await s.wait(1500);
  await page.evaluate(() => document.querySelector('[data-orientation="horizontal"]')?.click());
  await s.wait(1500);
  const r = await page.evaluate(() => {
    const root = document.querySelector(".vlist");
    const header = document.querySelector(".vlist-group-header");
    const sticky = document.querySelector(".vlist-sticky-header .sticky-group");
    const wm = (el) => el ? getComputedStyle(el).writingMode : "(none)";
    return {
      classes: root?.className?.substring(0, 50),
      headerWM: wm(header),
      stickyWM: wm(sticky),
    };
  });
  console.log("Root:", r.classes);
  console.log("Header writing-mode:", r.headerWM);
  console.log("Sticky writing-mode:", r.stickyWM);
  console.log(r.headerWM.startsWith("vertical") ? "✅ rotated" : "❌ not rotated");
  console.log("");
});
