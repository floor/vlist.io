/**
 * Debug: plugin-wizard smoothness check.
 * Clicks next 5 times, measures logical scroll + DOM positions per frame.
 *
 *   bun scripts/debug/tests/plugin-wizard-smooth.mjs
 *   bun scripts/debug/tests/plugin-wizard-smooth.mjs --headless=false
 */
import { run } from "../runner.mjs";

async function measureTransition(session, label) {
  const frames = await session.evaluate(() => {
    return new Promise((resolve) => {
      const vp = document.querySelector(".vlist-viewport");
      const content = document.querySelector(".vlist-content");
      if (!vp) return resolve([]);
      const positions = [];
      const start = performance.now();
      let last = start;
      function tick() {
        const now = performance.now();
        const items = [...content.children].slice(0, 3);
        const itemData = items.map((el) => ({
          vi: el.dataset.index,
          top: Math.round(el.getBoundingClientRect().top - vp.getBoundingClientRect().top),
          transform: el.style.transform || "none",
        }));
        positions.push({
          t: Math.round(now - start),
          dt: Math.round(now - last),
          scrollTop: Math.round(vp.scrollTop),
          contentTransform: content.style.transform || "none",
          items: itemData,
        });
        last = now;
        if (now - start < 600) requestAnimationFrame(tick);
        else resolve(positions);
      }
      requestAnimationFrame(tick);
    });
  });

  console.log(`\n── ${label} ──`);
  console.log(`  Frames: ${frames.length}`);

  // Show first, middle, last frames
  const show = [0, Math.floor(frames.length / 4), Math.floor(frames.length / 2), Math.floor(frames.length * 3 / 4), frames.length - 1];
  for (const idx of show) {
    const f = frames[idx];
    if (!f) continue;
    console.log(`  [${f.t}ms] scrollTop=${f.scrollTop} content=${f.contentTransform}`);
    for (const item of f.items) {
      console.log(`    vi=${item.vi} top=${item.top}px transform=${item.transform}`);
    }
  }

  return frames;
}

await run("/examples/plugin-wizard", { settle: 2000 }, async (s) => {
  console.log("\n── Initial state ──");
  const initial = await s.evaluate(() => {
    const vp = document.querySelector(".vlist-viewport");
    const content = document.querySelector(".vlist-content");
    const step = document.getElementById("info-step")?.textContent;
    const items = [...content.children].map((el) => ({
      vi: el.dataset.index,
      top: Math.round(el.getBoundingClientRect().top - vp.getBoundingClientRect().top),
      h: el.offsetHeight,
    }));
    return {
      scrollTop: Math.round(vp.scrollTop),
      scrollHeight: vp.scrollHeight,
      clientHeight: vp.clientHeight,
      contentHeight: content.scrollHeight,
      contentTransform: content.style.transform,
      step,
      items,
    };
  });
  console.log("  scrollTop:", initial.scrollTop, "scrollH:", initial.scrollHeight, "clientH:", initial.clientHeight);
  console.log("  contentH:", initial.contentHeight, "transform:", initial.contentTransform);
  console.log("  step:", initial.step);
  for (const item of initial.items) {
    console.log(`    vi=${item.vi} top=${item.top} h=${item.h}`);
  }

  for (let i = 0; i < 3; i++) {
    const measurePromise = measureTransition(s, `Click next #${i + 1}`);
    await s.wait(16);
    await s.click("#btn-next");
    await measurePromise;
    await s.wait(300);
  }
});
