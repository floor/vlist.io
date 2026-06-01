import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 2000 }, async (s) => {
  const { page } = s;
  console.log("\n=== Grid coverage (groups off) ===\n");

  // Turn groups off
  await page.evaluate(() => {
    const t = document.querySelector("#groups-toggle");
    if (t && t.checked) t.click();
  });
  await s.wait(1500);

  let issues = 0;
  for (const pct of [0, 0.25, 0.5, 0.75, 1.0]) {
    await page.evaluate((p) => {
      const vp = document.querySelector(".vlist-viewport");
      vp.scrollTop = (vp.scrollHeight - vp.clientHeight) * p;
    }, pct);
    await s.wait(400);

    const r = await page.evaluate(() => {
      const vp = document.querySelector(".vlist-viewport");
      const sp = vp.scrollTop, cs = vp.clientHeight;
      const items = Array.from(document.querySelectorAll("[data-index]"));
      // Check items form a contiguous grid with no overlaps in visible area
      let topCov = false, botCov = false;
      const cols = {};
      for (const el of items) {
        const m = el.style.transform.match(/translate\(([\d.]+)px,\s*([\d.]+)px\)/);
        if (!m) continue;
        const x = parseFloat(m[1]), y = parseFloat(m[2]);
        const h = parseFloat(el.style.height);
        if (y <= sp + 30 && y + h >= sp) topCov = true;
        if (y <= sp + cs && y + h >= sp + cs - 30) botCov = true;
        cols[x] = (cols[x] || 0) + 1;
      }
      return { topCov, botCov, columnXs: Object.keys(cols).length, count: items.length };
    });
    const ok = r.topCov && r.botCov && r.columnXs === 4;
    if (!ok) issues++;
    console.log(`@${(pct*100)|0}%: top=${r.topCov?"✅":"❌"} bot=${r.botCov?"✅":"❌"} cols=${r.columnXs} (${r.count} items)`);
  }
  console.log(issues === 0 ? "\n✅ All positions correct" : `\n❌ ${issues} issues`);
  console.log("");
});
