import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 2000 }, async (s) => {
  const { page } = s;
  console.log("\n=== Masonry deep scroll: no gaps/missing items ===\n");

  await page.evaluate(() => document.querySelector('[data-mode="masonry"]')?.click());
  await s.wait(1500);

  let issues = 0;
  for (const pct of [0.1, 0.3, 0.5, 0.7, 0.9]) {
    await page.evaluate((p) => {
      const vp = document.querySelector(".vlist-viewport");
      vp.scrollTop = vp.scrollHeight * p;
    }, pct);
    await s.wait(400);

    const r = await page.evaluate(() => {
      const vp = document.querySelector(".vlist-viewport");
      const sp = vp.scrollTop, cs = vp.clientHeight;
      const items = Array.from(document.querySelectorAll("[data-index]:not(.vlist-group-header)"));
      // Check viewport coverage: is there a visible item near the top and bottom of viewport?
      let topCovered = false, botCovered = false;
      for (const el of items) {
        const m = el.style.transform.match(/,\s*([\d.]+)px/);
        if (!m) continue;
        const y = parseFloat(m[1]);
        const h = parseFloat(el.style.height);
        if (y <= sp + 50 && y + h >= sp) topCovered = true;
        if (y <= sp + cs && y + h >= sp + cs - 50) botCovered = true;
      }
      return { topCovered, botCovered, count: items.length };
    });
    const ok = r.topCovered && r.botCovered;
    if (!ok) issues++;
    console.log(`@${(pct*100)|0}%: top=${r.topCovered?"✅":"❌"} bot=${r.botCovered?"✅":"❌"} (${r.count} rendered)`);
  }
  console.log(issues === 0 ? "\nNo coverage gaps ✅" : `\n${issues} coverage gaps ❌`);
  console.log("");
});
