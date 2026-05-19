/**
 * Debug script: investigate scrolling behavior in the large-list example
 * with scale + scrollbar plugins (1M items, compressed mode).
 *
 * Tests: wheel scroll, scrollbar drag, scrollToIndex navigation.
 *
 * v2 DOM uses vlist-content (not vlist-items), so we query both and use
 * whichever exists.
 */
import { run } from "./debug.mjs";

const SEL = {
  vp: ".vlist-viewport",
  // v1 = .vlist-items, v2 = .vlist-content
  items: ".vlist-content, .vlist-items",
  item: ".vlist-item",
  sb: ".vlist-scrollbar",
  thumb: ".vlist-scrollbar__thumb",
};

await run("/examples/large-list", { settle: 2000 }, async (s) => {
  const { page } = s;

  // ── Initial state ──────────────────────────────────────────────────
  console.log("\n=== INITIAL STATE ===");

  const initState = await page.evaluate((sel) => {
    const vp = document.querySelector(sel.vp);
    const items = document.querySelector(sel.items);
    if (!vp || !items) {
      return {
        error: "missing elements",
        vpFound: !!vp,
        itemsFound: !!items,
        bodyHTML: document.body.innerHTML.substring(0, 500),
      };
    }

    const scrollbar = document.querySelector(sel.sb);
    const thumb = document.querySelector(sel.thumb);

    return {
      vpOverflow: getComputedStyle(vp).overflow,
      vpOverflowY: getComputedStyle(vp).overflowY,
      vpScrollTop: vp.scrollTop,
      vpScrollHeight: vp.scrollHeight,
      vpClientHeight: vp.clientHeight,
      contentHeight: items.style.height,
      domCount: items.children.length,
      hasScrollbar: !!scrollbar,
      scrollbarVisible: scrollbar ? getComputedStyle(scrollbar).display : "n/a",
      thumbHeight: thumb ? thumb.style.height : "n/a",
      firstItemIdx: items.children[0]?.dataset?.index,
      lastItemIdx: items.children[items.children.length - 1]?.dataset?.index,
      hasCustomScrollbarClass: vp.classList.contains("vlist-viewport--custom-scrollbar"),
      itemsClass: items.className,
    };
  }, SEL);
  console.log(JSON.stringify(initState, null, 2));

  if (initState.error) {
    console.log("Cannot proceed — DOM elements missing");
    return;
  }

  // ── Check if scale compression is active ──────────────────────────
  console.log("\n=== COMPRESSION CHECK ===");
  const compState = await page.evaluate((sel) => {
    const vp = document.querySelector(sel.vp);
    const overflow = getComputedStyle(vp).overflow;
    const overflowY = getComputedStyle(vp).overflowY;
    return {
      overflowHidden: overflow === "hidden" || overflowY === "hidden",
      nativeScrollable: vp.scrollHeight > vp.clientHeight,
      nativeScrollTop: vp.scrollTop,
    };
  }, SEL);
  console.log(JSON.stringify(compState, null, 2));

  // ── Test 1: Wheel scroll ──────────────────────────────────────────
  console.log("\n=== TEST 1: WHEEL SCROLL ===");

  const before1 = await page.evaluate((sel) => {
    const items = document.querySelector(sel.items);
    const first = items?.children[0];
    return {
      firstIdx: first?.dataset?.index,
      firstTransform: first?.style?.transform,
      domCount: items?.children?.length,
    };
  }, SEL);
  console.log("  Before:", JSON.stringify(before1));

  // Simulate wheel events on the viewport
  await page.evaluate((sel) => {
    const vp = document.querySelector(sel.vp);
    for (let i = 0; i < 20; i++) {
      vp.dispatchEvent(new WheelEvent("wheel", {
        deltaY: 200,
        bubbles: true,
        cancelable: true,
      }));
    }
  }, SEL);

  await s.wait(1000);

  const after1 = await page.evaluate((sel) => {
    const items = document.querySelector(sel.items);
    const children = Array.from(items?.children || []);
    const first = children[0];
    const last = children[children.length - 1];
    return {
      firstIdx: first?.dataset?.index,
      firstTransform: first?.style?.transform,
      lastIdx: last?.dataset?.index,
      lastTransform: last?.style?.transform,
      domCount: children.length,
    };
  }, SEL);
  console.log("  After:", JSON.stringify(after1));
  console.log(`  Wheel scroll worked: ${before1.firstIdx !== after1.firstIdx}`);

  // ── Test 2: scrollToIndex via button ──────────────────────────────
  console.log("\n=== TEST 2: SCROLL TO INDEX 500,000 ===");

  await page.evaluate(() => {
    document.getElementById("scroll-index").value = "500000";
  });
  await page.click("#btn-go");
  await s.wait(500);

  const after2 = await page.evaluate((sel) => {
    const items = document.querySelector(sel.items);
    const children = Array.from(items?.children || []);
    return {
      firstIdx: children[0]?.dataset?.index,
      lastIdx: children[children.length - 1]?.dataset?.index,
      domCount: children.length,
    };
  }, SEL);
  console.log("  After scrollToIndex(500000):", JSON.stringify(after2));

  // ── Test 3: Navigation buttons ────────────────────────────────────
  console.log("\n=== TEST 3: NAVIGATION BUTTONS ===");

  await page.click("#btn-first");
  await s.wait(300);
  let nav = await page.evaluate((sel) => {
    const items = document.querySelector(sel.items);
    return { firstIdx: items?.children[0]?.dataset?.index };
  }, SEL);
  console.log(`  First → idx=${nav.firstIdx}`);

  await page.click("#btn-last");
  await s.wait(300);
  nav = await page.evaluate((sel) => {
    const items = document.querySelector(sel.items);
    const last = items?.children[items.children.length - 1];
    return { lastIdx: last?.dataset?.index };
  }, SEL);
  console.log(`  Last → idx=${nav.lastIdx}`);

  await page.click("#btn-middle");
  await s.wait(300);
  nav = await page.evaluate((sel) => {
    const items = document.querySelector(sel.items);
    return { firstIdx: items?.children[0]?.dataset?.index };
  }, SEL);
  console.log(`  Middle → idx=${nav.firstIdx}`);

  // ── Test 4: Scrollbar state ───────────────────────────────────────
  console.log("\n=== TEST 4: SCROLLBAR STATE ===");

  const scrollbarState = await page.evaluate((sel) => {
    const sb = document.querySelector(sel.sb);
    const thumb = document.querySelector(sel.thumb);

    if (!sb) return { exists: false };

    const sbRect = sb.getBoundingClientRect();
    const thumbRect = thumb ? thumb.getBoundingClientRect() : null;

    return {
      exists: true,
      display: getComputedStyle(sb).display,
      visibility: getComputedStyle(sb).visibility,
      opacity: getComputedStyle(sb).opacity,
      sbHeight: sbRect.height,
      thumbHeight: thumbRect?.height,
      thumbTransform: thumb?.style?.transform,
    };
  }, SEL);
  console.log(JSON.stringify(scrollbarState, null, 2));

  // ── Console errors ────────────────────────────────────────────────
  console.log("\n=== CONSOLE LOG ===");
  const errors = s.logs.filter(
    (l) => l.toLowerCase().includes("error") || l.toLowerCase().includes("warn"),
  );
  if (errors.length > 0) {
    for (const e of errors) console.log(`  ${e}`);
  } else {
    console.log("  No errors/warnings");
  }

  if (s.logs.length > 0) {
    console.log(`\n  All logs (${s.logs.length}):`);
    for (const l of s.logs.slice(0, 20)) console.log(`    ${l}`);
  }
});
