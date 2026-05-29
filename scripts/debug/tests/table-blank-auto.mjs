/**
 * Debug: automated native scrollbar drag simulation + DOM state capture.
 *
 * Simulates dragging the native scrollbar thumb using mouse events,
 * captures DOM state before/during/after, takes screenshots.
 *
 * Fully automated — no manual interaction needed.
 *
 *   bun scripts/debug/tests/table-blank-auto.mjs
 */

import { launchBrowser, openPage, delay } from "../core.mjs";
import { writeFileSync, mkdirSync } from "fs";

mkdirSync("/tmp/vlist-debug", { recursive: true });

const browser = await launchBrowser({
  headless: false,
  windowPosition: "50,50",
});
const { page } = await openPage(browser, "/examples/data-table", {
  settle: 2000,
  width: 1280,
  height: 900,
});

console.log("═══════════════════════════════════════════════════════════");
console.log("  TABLE BLANK AUTO — Automated Scrollbar Drag Diagnosis");
console.log("═══════════════════════════════════════════════════════════");

// Inject DOM state capture
await page.evaluate(() => {
  window.__captureState = () => {
    const vp = document.querySelector(".vlist-viewport");
    const content = document.querySelector(".vlist-content");
    if (!vp || !content) return { error: "missing elements" };

    const scrollTop = vp.scrollTop;
    const vpHeight = vp.clientHeight;
    const contentHeight = parseFloat(content.style.height) || 0;
    const rows = content.querySelectorAll("[role='row'], [role='presentation']");
    const totalDomRows = rows.length;

    let visibleCount = 0;
    let minY = Infinity, maxY = -Infinity;
    let firstVisIdx = -1, lastVisIdx = -1;
    const rowDetails = [];

    for (const row of rows) {
      const match = row.style.transform?.match(/translateY\(([0-9.]+)/);
      const y = match ? parseFloat(match[1]) : -1;
      const h = parseFloat(row.style.height) || 0;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      if (y + h > scrollTop && y < scrollTop + vpHeight) {
        visibleCount++;
        const idx = parseInt(row.dataset.index ?? "-1");
        if (firstVisIdx === -1) firstVisIdx = idx;
        lastVisIdx = idx;
      }

      if (rowDetails.length < 5) {
        rowDetails.push({
          idx: row.dataset.index,
          id: (row.dataset.id || "").slice(0, 30),
          y: Math.round(y),
          h,
          children: row.children.length,
        });
      }
    }

    return {
      scrollTop: Math.round(scrollTop),
      vpHeight,
      contentHeight: Math.round(contentHeight),
      domRows: totalDomRows,
      visible: visibleCount,
      firstVisIdx,
      lastVisIdx,
      rowYRange: totalDomRows > 0 ? [Math.round(minY), Math.round(maxY)] : null,
      rowDetails,
      scrollBehavior: getComputedStyle(vp).scrollBehavior,
      vpOverflow: getComputedStyle(vp).overflow,
    };
  };

  // Capture scroll events
  window.__scrollEvents = [];
  window.__captureScrolls = false;
  const vp = document.querySelector(".vlist-viewport");
  vp.addEventListener("scroll", () => {
    if (!window.__captureScrolls) return;
    window.__scrollEvents.push({
      t: performance.now(),
      scrollTop: Math.round(vp.scrollTop),
      domRows: document.querySelectorAll(".vlist-content [role='row'], .vlist-content [role='presentation']").length,
    });
  }, { passive: true });
});

// Capture initial state
const initState = await page.evaluate(() => window.__captureState());
console.log("\n  Initial state:");
console.log(`    scrollTop: ${initState.scrollTop}`);
console.log(`    vpHeight: ${initState.vpHeight}`);
console.log(`    contentHeight: ${initState.contentHeight}`);
console.log(`    DOM rows: ${initState.domRows}`);
console.log(`    Visible: ${initState.visible}`);
console.log(`    scrollBehavior: ${initState.scrollBehavior}`);
console.log(`    overflow: ${initState.vpOverflow}`);

// Find the scrollbar position
const vpBox = await page.evaluate(() => {
  const vp = document.querySelector(".vlist-viewport");
  const rect = vp.getBoundingClientRect();
  const scrollHeight = vp.scrollHeight;
  const clientHeight = vp.clientHeight;
  return {
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
    scrollHeight,
    clientHeight,
    scrollbarWidth: vp.offsetWidth - vp.clientWidth,
  };
});

console.log(`\n  Viewport: ${Math.round(vpBox.width)}x${Math.round(vpBox.height)}`);
console.log(`  Scrollbar width: ${vpBox.scrollbarWidth}px`);
console.log(`  Scroll range: ${vpBox.clientHeight} / ${vpBox.scrollHeight}`);

// Calculate scrollbar thumb position and size
const thumbHeight = Math.max(30, (vpBox.clientHeight / vpBox.scrollHeight) * vpBox.height);
const trackHeight = vpBox.height;
const scrollbarX = vpBox.right - vpBox.scrollbarWidth / 2;
const trackTop = vpBox.top;

console.log(`\n  Thumb height: ~${Math.round(thumbHeight)}px`);
console.log(`  Scrollbar X: ${Math.round(scrollbarX)}`);
console.log(`  Track range: ${Math.round(trackTop)} → ${Math.round(trackTop + trackHeight)}`);

// Start capturing scroll events
await page.evaluate(() => { window.__captureScrolls = true; });

// ── Test 1: Programmatic scrollTo (should work fine) ──
console.log("\n───────────────────────────────────────────────────────────");
console.log("  TEST 1: Programmatic scrollTo (50%)");
console.log("───────────────────────────────────────────────────────────");

await page.evaluate(() => {
  const vp = document.querySelector(".vlist-viewport");
  vp.scrollTop = vp.scrollHeight * 0.5;
});
await delay(500);

const state1 = await page.evaluate(() => window.__captureState());
console.log(`  scrollTop: ${state1.scrollTop}  domRows: ${state1.domRows}  visible: ${state1.visible}`);
if (state1.visible === 0) {
  console.log("  ❌ BLANK after programmatic scrollTo!");
} else {
  console.log("  ✅ Rows visible");
}
await page.screenshot({ path: "/tmp/vlist-debug/test1-programmatic.png" });

// Reset
await page.evaluate(() => {
  document.querySelector(".vlist-viewport").scrollTop = 0;
  window.__scrollEvents = [];
});
await delay(500);

// ── Test 2: Native scrollbar drag simulation ──
console.log("\n───────────────────────────────────────────────────────────");
console.log("  TEST 2: Native scrollbar thumb drag (to 50%)");
console.log("───────────────────────────────────────────────────────────");

// Click on the scrollbar track at the top (where the thumb should be)
const thumbStartY = trackTop + thumbHeight / 2;
const dragTargetY = trackTop + trackHeight * 0.5;

console.log(`  Drag from Y=${Math.round(thumbStartY)} to Y=${Math.round(dragTargetY)}`);

// Mouse down on scrollbar thumb
await page.mouse.move(scrollbarX, thumbStartY);
await delay(100);
await page.mouse.down();
await delay(50);

// Drag in steps to simulate real drag
const steps = 20;
const captures = [];
for (let i = 1; i <= steps; i++) {
  const y = thumbStartY + (dragTargetY - thumbStartY) * (i / steps);
  await page.mouse.move(scrollbarX, y, { steps: 1 });
  await delay(30);

  // Capture state at a few key points
  if (i === 5 || i === 10 || i === 15 || i === steps) {
    const s = await page.evaluate(() => window.__captureState());
    captures.push({ step: i, ...s });
  }
}

await page.mouse.up();
await delay(300);

// Capture final state
const stateFinal = await page.evaluate(() => window.__captureState());
captures.push({ step: "final", ...stateFinal });

for (const c of captures) {
  const status = c.visible === 0 ? "❌ BLANK" : `✅ ${c.visible} visible`;
  const rowRange = c.rowYRange ? `rows@[${c.rowYRange[0]}–${c.rowYRange[1]}]` : "no rows";
  console.log(`  Step ${c.step}: scroll=${c.scrollTop}  dom=${c.domRows}  ${status}  ${rowRange}`);
}

await page.screenshot({ path: "/tmp/vlist-debug/test2-drag.png" });

// Get scroll event log
const scrollLog = await page.evaluate(() => {
  window.__captureScrolls = false;
  return window.__scrollEvents;
});
console.log(`\n  Scroll events captured: ${scrollLog.length}`);
if (scrollLog.length > 0) {
  // Check for any events with 0 DOM rows
  const zeroRows = scrollLog.filter(e => e.domRows === 0);
  const lowRows = scrollLog.filter(e => e.domRows < 5 && e.domRows > 0);
  console.log(`  Events with 0 DOM rows: ${zeroRows.length}`);
  console.log(`  Events with <5 DOM rows: ${lowRows.length}`);
  console.log(`  First: scroll=${scrollLog[0].scrollTop} rows=${scrollLog[0].domRows}`);
  console.log(`  Last: scroll=${scrollLog[scrollLog.length-1].scrollTop} rows=${scrollLog[scrollLog.length-1].domRows}`);
}

// ── Test 3: Fast drag (larger jump) ──
console.log("\n───────────────────────────────────────────────────────────");
console.log("  TEST 3: Fast scrollbar drag (top to 80%)");
console.log("───────────────────────────────────────────────────────────");

await page.evaluate(() => {
  document.querySelector(".vlist-viewport").scrollTop = 0;
  window.__scrollEvents = [];
  window.__captureScrolls = true;
});
await delay(500);

const fastTarget = trackTop + trackHeight * 0.8;
await page.mouse.move(scrollbarX, thumbStartY);
await delay(100);
await page.mouse.down();
await delay(50);

// Fast drag - fewer steps, bigger jumps
const fastSteps = 5;
for (let i = 1; i <= fastSteps; i++) {
  const y = thumbStartY + (fastTarget - thumbStartY) * (i / fastSteps);
  await page.mouse.move(scrollbarX, y, { steps: 1 });
  await delay(16); // ~1 frame
}

await page.mouse.up();
await delay(500);

const state3 = await page.evaluate(() => window.__captureState());
console.log(`  scrollTop: ${state3.scrollTop}  domRows: ${state3.domRows}  visible: ${state3.visible}`);
if (state3.visible === 0) {
  console.log("  ❌ BLANK after fast drag!");
  if (state3.rowYRange) {
    console.log(`  Rows positioned at: ${state3.rowYRange[0]}–${state3.rowYRange[1]}px`);
    console.log(`  Viewport shows: ${state3.scrollTop}–${state3.scrollTop + state3.vpHeight}px`);
    console.log(`  Gap: ${Math.abs(state3.scrollTop - state3.rowYRange[0])}px`);
  }
} else {
  console.log("  ✅ Rows visible");
}

const log3 = await page.evaluate(() => {
  window.__captureScrolls = false;
  return window.__scrollEvents;
});
console.log(`  Scroll events: ${log3.length}`);

await page.screenshot({ path: "/tmp/vlist-debug/test3-fast-drag.png" });

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  Screenshots: /tmp/vlist-debug/test{1,2,3}*.png");
console.log("═══════════════════════════════════════════════════════════\n");

await browser.close();
process.exit(0);
