import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 2000 }, async (s) => {
  const { page } = s;
  console.log("\n=== Photo Album: Last button ===\n");

  async function testLast(label) {
    await page.evaluate(() => document.querySelector("#btn-last")?.click());
    await s.wait(2000);
    const r = await page.evaluate(() => {
      const vp = document.querySelector(".vlist-viewport");
      const sp = Math.round(vp?.scrollTop ?? 0);
      const max = Math.round((vp?.scrollHeight ?? 0) - (vp?.clientHeight ?? 0));
      return { sp, max, atBottom: Math.abs(sp - max) < 5 };
    });
    console.log(`${label}: scrollTop=${r.sp} max=${r.max} ${r.atBottom ? "✅" : `❌ off by ${r.max - r.sp}`}`);
  }

  // Grid mode (default)
  await testLast("Grid + groups");

  // Switch to masonry
  await page.evaluate(() => document.querySelector('[data-mode="masonry"]')?.click());
  await s.wait(2000);
  await page.evaluate(() => { document.querySelector(".vlist-viewport").scrollTop = 0; });
  await s.wait(500);
  await testLast("Masonry + groups");

  console.log("");
});
