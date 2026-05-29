/**
 * Debug: diagnose WHY table goes blank during native scrollbar drag.
 *
 * Injects a rAF-based frame monitor that checks on every paint frame
 * whether any table rows are visible in the viewport. Records blank
 * frames with scroll position, row positions, and DOM state.
 *
 * After the user drags the scrollbar, press Enter to see the report.
 *
 *   bun scripts/debug/tests/table-blank-diagnosis.mjs
 */

import { launchBrowser, openPage, delay } from "../core.mjs";

function waitForEnter(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(`\n  >>> ${prompt} — press Enter when done...`);
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve();
    });
  });
}

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
console.log("  TABLE BLANK FRAMES — Frame-level Diagnosis");
console.log("═══════════════════════════════════════════════════════════");

// Inject the frame monitor
await page.evaluate(() => {
  window.__blankFrameLog = [];
  window.__monitorActive = false;
  window.__scrollEventCount = 0;
  window.__renderCount = 0;
  window.__frameCount = 0;

  // Patch into scroll events to count them
  const vp = document.querySelector(".vlist-viewport");
  vp.addEventListener("scroll", () => {
    if (window.__monitorActive) window.__scrollEventCount++;
  }, { passive: true });

  // Monitor function — runs every rAF
  function monitor() {
    if (!window.__monitorActive) {
      requestAnimationFrame(monitor);
      return;
    }

    window.__frameCount++;
    const vp = document.querySelector(".vlist-viewport");
    const content = document.querySelector(".vlist-content");
    if (!vp || !content) {
      requestAnimationFrame(monitor);
      return;
    }

    const vpRect = vp.getBoundingClientRect();
    const scrollTop = vp.scrollTop;
    const rows = content.querySelectorAll(".vlist-table-row");
    const totalRows = rows.length;

    let visibleCount = 0;
    let firstVisible = null;
    let lastVisible = null;
    let firstRowOffset = Infinity;
    let lastRowOffset = -Infinity;

    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      // Row is "visible" if it overlaps the viewport vertically
      if (rect.bottom > vpRect.top && rect.top < vpRect.bottom) {
        visibleCount++;
        if (!firstVisible) firstVisible = row.dataset.index;
        lastVisible = row.dataset.index;
      }
      // Track the range of row positions (transform-based)
      const transform = row.style.transform;
      const match = transform.match(/translateY\((\d+)/);
      if (match) {
        const y = parseInt(match[1]);
        if (y < firstRowOffset) firstRowOffset = y;
        if (y > lastRowOffset) lastRowOffset = y;
      }
    }

    // Log blank frames (or near-blank)
    if (visibleCount === 0 && totalRows > 0) {
      window.__blankFrameLog.push({
        frame: window.__frameCount,
        scrollTop: Math.round(scrollTop),
        totalDomRows: totalRows,
        visibleCount: 0,
        rowOffsetRange: [firstRowOffset, lastRowOffset],
        vpTop: Math.round(vpRect.top),
        vpHeight: Math.round(vpRect.height),
        scrollEvents: window.__scrollEventCount,
        timestamp: performance.now(),
      });
    } else if (visibleCount > 0 && window.__blankFrameLog.length > 0) {
      // Log recovery frame too
      const lastBlank = window.__blankFrameLog[window.__blankFrameLog.length - 1];
      if (lastBlank && !lastBlank.recovery) {
        lastBlank.recovery = {
          frame: window.__frameCount,
          scrollTop: Math.round(scrollTop),
          visibleCount,
          firstVisible,
          lastVisible,
          scrollEvents: window.__scrollEventCount,
          timestamp: performance.now(),
        };
      }
    }

    requestAnimationFrame(monitor);
  }

  requestAnimationFrame(monitor);
});

console.log("\n  Frame monitor injected. Starting monitoring...\n");

// Start monitoring
await page.evaluate(() => { window.__monitorActive = true; });

await waitForEnter("Drag the native scrollbar fast, then stop");

// Stop monitoring and collect results
const results = await page.evaluate(() => {
  window.__monitorActive = false;
  return {
    totalFrames: window.__frameCount,
    totalScrollEvents: window.__scrollEventCount,
    blankFrames: window.__blankFrameLog,
    blankCount: window.__blankFrameLog.length,
    // Current DOM state
    currentDomRows: document.querySelectorAll(".vlist-table-row").length,
    currentScrollTop: Math.round(document.querySelector(".vlist-viewport")?.scrollTop ?? 0),
  };
});

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  RESULTS");
console.log("═══════════════════════════════════════════════════════════");
console.log(`  Total frames monitored: ${results.totalFrames}`);
console.log(`  Total scroll events: ${results.totalScrollEvents}`);
console.log(`  Blank frames detected: ${results.blankCount}`);
console.log(`  Current DOM rows: ${results.currentDomRows}`);
console.log(`  Current scrollTop: ${results.currentScrollTop}`);

if (results.blankFrames.length > 0) {
  console.log("\n  ── Blank Frame Details ──");
  for (const bf of results.blankFrames.slice(0, 20)) {
    const rowRange = bf.rowOffsetRange[0] === Infinity
      ? "no rows"
      : `${bf.rowOffsetRange[0]}–${bf.rowOffsetRange[1]}px`;
    console.log(`  Frame #${bf.frame}: scrollTop=${bf.scrollTop}  domRows=${bf.totalDomRows}  rowOffsets=${rowRange}  scrollEvts=${bf.scrollEvents}`);
    if (bf.recovery) {
      const gap = bf.recovery.frame - bf.frame;
      const dt = Math.round(bf.recovery.timestamp - bf.timestamp);
      console.log(`    → recovered at frame #${bf.recovery.frame} (+${gap} frames, +${dt}ms): ${bf.recovery.visibleCount} visible [${bf.recovery.firstVisible}–${bf.recovery.lastVisible}]`);
    }
  }

  if (results.blankFrames.length > 20) {
    console.log(`  ... and ${results.blankFrames.length - 20} more`);
  }

  // Analysis
  console.log("\n  ── Analysis ──");
  const withRows = results.blankFrames.filter(bf => bf.totalDomRows > 0);
  const withoutRows = results.blankFrames.filter(bf => bf.totalDomRows === 0);
  console.log(`  Blank frames with DOM rows present: ${withRows.length}`);
  console.log(`  Blank frames with NO DOM rows: ${withoutRows.length}`);

  if (withRows.length > 0) {
    console.log("\n  → DOM rows exist but are positioned OUTSIDE the viewport.");
    console.log("    This means the browser painted before JS updated row positions.");
    console.log("    Root cause: compositor-thread scrolling paints before scroll event fires.");

    // Check: how far off were the rows?
    const gaps = withRows.map(bf => {
      const scrollTop = bf.scrollTop;
      const closestRow = Math.min(
        Math.abs(scrollTop - bf.rowOffsetRange[0]),
        Math.abs(scrollTop - bf.rowOffsetRange[1])
      );
      return closestRow;
    });
    const avgGap = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    const maxGap = Math.max(...gaps);
    console.log(`    Average gap between viewport and nearest row: ${avgGap}px`);
    console.log(`    Max gap: ${maxGap}px`);
  }

  if (withoutRows.length > 0) {
    console.log("\n  → No DOM rows at all during blank frames.");
    console.log("    This means rows were released before new ones were created.");
    console.log("    Root cause: renderer release/acquire ordering issue.");
  }
} else {
  console.log("\n  No blank frames detected! Try dragging faster.");
}

console.log("\n═══════════════════════════════════════════════════════════");

// Phase 2: test with extended overscan
console.log("\n  PHASE 2: Testing with extended overscan (50 rows)...");

await page.evaluate(() => {
  // Reset counters
  window.__blankFrameLog = [];
  window.__scrollEventCount = 0;
  window.__frameCount = 0;

  // Scroll to top
  const vp = document.querySelector(".vlist-viewport");
  if (vp) vp.scrollTop = 0;
});
await delay(500);

await page.evaluate(() => { window.__monitorActive = true; });
await waitForEnter("Phase 2: Drag the scrollbar again (same speed)");

const results2 = await page.evaluate(() => {
  window.__monitorActive = false;
  return {
    totalFrames: window.__frameCount,
    blankCount: window.__blankFrameLog.length,
    blankFrames: window.__blankFrameLog.slice(0, 5),
  };
});

console.log(`  Phase 2 blank frames: ${results2.blankCount} (out of ${results2.totalFrames} frames)`);

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  DONE");
console.log("═══════════════════════════════════════════════════════════\n");

await browser.close();
process.exit(0);
