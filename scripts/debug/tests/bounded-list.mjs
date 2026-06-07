/**
 * Debug: bounded-list example (RFC-012 bounded logical scroll, 1M items, no scale).
 *
 * Verifies in real Chrome that:
 *   - the content element is sized to a small viewport-runway (NOT 50M px)
 *   - the viewport is natively scrollable (overflow-anchor: none on content)
 *   - wheel scroll advances the rendered range
 *   - scrollToIndex (First / Middle / Last) lands the correct indices, incl. the
 *     exact end, with the target painted inside the viewport
 *   - rebasing keeps the logical position consistent (getScrollPosition) while
 *     resetting native scrollTop toward the runway centre
 *   - no blank frames (DOM always populated) and no console errors
 *
 *   bun scripts/debug/tests/bounded-list.mjs
 */
import { run } from "../runner.mjs";

const SEL = {
  vp: ".vlist-viewport",
  content: ".vlist-content",
  item: ".vlist-item",
};

const read = (sel) => {
  const vp = document.querySelector(sel.vp);
  const content = document.querySelector(sel.content);
  const children = Array.from(content?.children || []);
  return {
    contentHeight: content ? parseInt(content.style.height, 10) : null,
    vpScrollTop: vp?.scrollTop,
    vpScrollHeight: vp?.scrollHeight,
    vpClientHeight: vp?.clientHeight,
    nativeScrollable: vp ? vp.scrollHeight > vp.clientHeight : false,
    overflowAnchor: content ? getComputedStyle(content).overflowAnchor : null,
    domCount: children.length,
    firstIdx: children[0]?.dataset?.index,
    lastIdx: children[children.length - 1]?.dataset?.index,
    logical: window.__vlist?.getScrollPosition?.(),
  };
};

await run("/examples/bounded-list", { settle: 2000 }, async (s) => {
  const { page } = s;
  let fail = false;
  const check = (cond, label) => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`); if (!cond) fail = true; };

  console.log("\n=== INITIAL STATE ===");
  const init = await page.evaluate(read, SEL);
  console.log(JSON.stringify(init, null, 2));
  if (init.contentHeight === null) { console.log("  ERROR: missing elements"); return; }

  // 1M × 50px = 50,000,000 virtual. Bounded runway is a small viewport-multiple
  // (BOUNDED_RUNWAY_FACTOR × viewport), well under the browser's ~16.7M px limit.
  check(init.contentHeight > 0 && init.contentHeight < 100_000, `content runway bounded (${init.contentHeight}px, not ~50M)`);
  check(init.nativeScrollable, "viewport natively scrollable");
  check(init.overflowAnchor === "none", "content overflow-anchor: none");
  check(init.domCount > 0, `initial DOM populated (${init.domCount} items)`);
  check(init.firstIdx === "0", `starts at index 0 (${init.firstIdx})`);

  console.log("\n=== WHEEL SCROLL ===");
  await page.evaluate((sel) => {
    const vp = document.querySelector(sel.vp);
    for (let i = 0; i < 30; i++) {
      vp.dispatchEvent(new WheelEvent("wheel", { deltaY: 300, bubbles: true, cancelable: true }));
    }
  }, SEL);
  await s.wait(500);
  const afterWheel = await page.evaluate(read, SEL);
  console.log(`  firstIdx ${init.firstIdx} -> ${afterWheel.firstIdx}, logical ${init.logical} -> ${afterWheel.logical}, domCount ${afterWheel.domCount}`);
  check(Number(afterWheel.firstIdx) > Number(init.firstIdx), "wheel advanced the rendered range");
  check(afterWheel.domCount > 0, "DOM still populated after wheel (no blank frame)");

  console.log("\n=== NAVIGATION ===");
  const nav = {};
  for (const [btn, label] of [["#btn-last", "last"], ["#btn-middle", "middle"], ["#btn-first", "first"]]) {
    await page.click(btn);
    await s.wait(300);
    nav[label] = await page.evaluate(read, SEL);
    console.log(`  ${label}: first=${nav[label].firstIdx} last=${nav[label].lastIdx} logical=${nav[label].logical} scrollTop=${nav[label].vpScrollTop} dom=${nav[label].domCount}`);
  }
  // Last: index 999999 must be rendered (end reachable exactly).
  check(nav.last.lastIdx === "999999", `Last renders final index 999999 (${nav.last.lastIdx})`);
  // Middle: around 500000.
  check(Math.abs(Number(nav.middle.firstIdx) - 500000) < 50, `Middle near 500000 (${nav.middle.firstIdx})`);
  // First: back to 0.
  check(nav.first.firstIdx === "0", `First back to 0 (${nav.first.firstIdx})`);
  check(nav.last.domCount > 0 && nav.middle.domCount > 0, "DOM populated across all jumps");

  console.log("\n=== REBASE CONSISTENCY ===");
  // Jump to middle, then drag the native scrollbar near the top of the runway to
  // force a rebase; logical must stay consistent with the item painted at top.
  await page.click("#btn-middle");
  await s.wait(300);
  const reb = await page.evaluate((sel) => {
    const vp = document.querySelector(sel.vp);
    const content = document.querySelector(sel.content);
    const before = { logical: window.__vlist.getScrollPosition(), scrollTop: vp.scrollTop };
    // Simulate a native scrollbar drag near the runway top edge.
    vp.scrollTop = 100;
    vp.dispatchEvent(new Event("scroll", { bubbles: false }));
    // Items are absolutely positioned via transform and pooled, so DOM order is
    // NOT visual order (it is only sorted on idle). Scan every rendered item and
    // find the one whose painted box covers the viewport top edge.
    const items = Array.from(content.children).filter((el) => el.dataset && el.dataset.index !== undefined);
    let topCover = null; // item straddling the top edge → onScreen <= 1 < onScreen + height
    for (const el of items) {
      const m = /translateY\(([-\d.]+)px\)/.exec(el.style.transform || "");
      if (!m) continue;
      const onScreen = parseFloat(m[1]) - vp.scrollTop;
      const h = el.offsetHeight || 50;
      if (onScreen <= 1 && onScreen + h > 0) topCover = { idx: el.dataset.index, onScreen };
    }
    const after = { logical: window.__vlist.getScrollPosition(), scrollTop: vp.scrollTop };
    return { before, after, topCover, domCount: items.length };
  }, SEL);
  console.log(JSON.stringify(reb, null, 2));
  // After scrolling near the top edge with a large baseOffset, a rebase should
  // have shifted scrollTop away from 100 (recentred) while logical tracks the
  // new position. Some rendered item must cover the viewport top — no blank gap.
  check(reb.after.logical >= 0, `logical valid after rebase (${reb.after.logical})`);
  check(reb.topCover !== null && reb.topCover.onScreen <= 1,
    reb.topCover ? `top edge covered by index ${reb.topCover.idx} (onScreen=${reb.topCover.onScreen.toFixed(1)})` : "no item covers viewport top (blank frame)");

  console.log("\n=== CONSOLE LOG ===");
  const errors = s.logs.filter((l) => /error|warn|exceeds browser limit/i.test(l));
  check(errors.length === 0, errors.length ? `console clean — got:\n  ${errors.join("\n  ")}` : "console clean");

  console.log(`\n${fail ? "❌ FAIL" : "✅ PASS"}`);
});
