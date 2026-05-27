/**
 * Debug: large-list example (scale + scrollbar, 1M items).
 * Tests wheel scroll, scrollToIndex navigation, scrollbar state.
 *
 *   bun scripts/debug/tests/large-list.mjs
 */
import { run } from "../runner.mjs";

const SEL = {
  vp: ".vlist-viewport",
  items: ".vlist-content, .vlist-items",
  item: ".vlist-item",
  sb: ".vlist-scrollbar",
  thumb: ".vlist-scrollbar__thumb",
};

await run("/examples/large-list", { settle: 2000 }, async (s) => {
  const { page } = s;

  console.log("\n=== INITIAL STATE ===");
  const initState = await page.evaluate((sel) => {
    const vp = document.querySelector(sel.vp);
    const items = document.querySelector(sel.items);
    if (!vp || !items) return { error: "missing elements", vpFound: !!vp, itemsFound: !!items };
    const scrollbar = document.querySelector(sel.sb);
    const thumb = document.querySelector(sel.thumb);
    return {
      vpOverflow: getComputedStyle(vp).overflow,
      vpScrollTop: vp.scrollTop,
      vpScrollHeight: vp.scrollHeight,
      vpClientHeight: vp.clientHeight,
      contentHeight: items.style.height,
      domCount: items.children.length,
      hasScrollbar: !!scrollbar,
      thumbHeight: thumb ? thumb.style.height : "n/a",
      firstItemIdx: items.children[0]?.dataset?.index,
      lastItemIdx: items.children[items.children.length - 1]?.dataset?.index,
    };
  }, SEL);
  console.log(JSON.stringify(initState, null, 2));
  if (initState.error) return;

  console.log("\n=== COMPRESSION CHECK ===");
  const compState = await page.evaluate((sel) => {
    const vp = document.querySelector(sel.vp);
    const style = getComputedStyle(vp);
    return {
      overflowHidden: style.overflow === "hidden" || style.overflowY === "hidden",
      nativeScrollable: vp.scrollHeight > vp.clientHeight,
    };
  }, SEL);
  console.log(JSON.stringify(compState, null, 2));

  console.log("\n=== WHEEL SCROLL ===");
  const before = await page.evaluate((sel) => {
    const items = document.querySelector(sel.items);
    return { firstIdx: items?.children[0]?.dataset?.index, domCount: items?.children?.length };
  }, SEL);
  await page.evaluate((sel) => {
    const vp = document.querySelector(sel.vp);
    for (let i = 0; i < 20; i++) {
      vp.dispatchEvent(new WheelEvent("wheel", { deltaY: 200, bubbles: true, cancelable: true }));
    }
  }, SEL);
  await s.wait(1000);
  const after = await page.evaluate((sel) => {
    const items = document.querySelector(sel.items);
    const children = Array.from(items?.children || []);
    return { firstIdx: children[0]?.dataset?.index, lastIdx: children[children.length - 1]?.dataset?.index, domCount: children.length };
  }, SEL);
  console.log(`  Before: idx=${before.firstIdx}  After: idx=${after.firstIdx}  Scrolled: ${before.firstIdx !== after.firstIdx}`);

  console.log("\n=== NAVIGATION ===");
  for (const [btn, label] of [["#btn-first", "First"], ["#btn-last", "Last"], ["#btn-middle", "Middle"]]) {
    await page.click(btn);
    await s.wait(300);
    const nav = await page.evaluate((sel) => {
      const items = document.querySelector(sel.items);
      const c = items?.children;
      return { firstIdx: c?.[0]?.dataset?.index, lastIdx: c?.[c.length - 1]?.dataset?.index };
    }, SEL);
    console.log(`  ${label}: first=${nav.firstIdx} last=${nav.lastIdx}`);
  }

  console.log("\n=== SCROLLBAR STATE ===");
  const sbState = await page.evaluate((sel) => {
    const sb = document.querySelector(sel.sb);
    const thumb = document.querySelector(sel.thumb);
    if (!sb) return { exists: false };
    return {
      exists: true,
      display: getComputedStyle(sb).display,
      opacity: getComputedStyle(sb).opacity,
      thumbHeight: thumb?.getBoundingClientRect()?.height,
      thumbTransform: thumb?.style?.transform,
    };
  }, SEL);
  console.log(JSON.stringify(sbState, null, 2));

  console.log("\n=== CONSOLE LOG ===");
  const errors = s.logs.filter((l) => /error|warn/i.test(l));
  console.log(errors.length ? errors.join("\n  ") : "  No errors/warnings");
});
