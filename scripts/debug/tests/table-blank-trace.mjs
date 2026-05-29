/**
 * Debug: trace exactly what happens during table blank frames.
 *
 * Hooks into the scroll event to capture DOM state on EVERY scroll frame:
 * - Number of row elements in the DOM
 * - Their transform positions vs viewport scrollTop
 * - Whether rows are visible in the viewport
 * - Content element height
 *
 * Opens non-headless so you can drag the native scrollbar.
 *
 *   bun scripts/debug/tests/table-blank-trace.mjs
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
console.log("  TABLE BLANK TRACE — Per-Scroll-Event DOM State");
console.log("═══════════════════════════════════════════════════════════");

// Inject scroll-event logger that captures DOM state on every scroll
await page.evaluate(() => {
  window.__scrollLog = [];
  window.__tracing = false;

  const vp = document.querySelector(".vlist-viewport");
  const content = document.querySelector(".vlist-content");
  if (!vp || !content) { console.error("Missing elements"); return; }

  vp.addEventListener("scroll", () => {
    if (!window.__tracing) return;

    const scrollTop = vp.scrollTop;
    const vpHeight = vp.clientHeight;
    const contentHeight = parseFloat(content.style.height) || 0;
    const rows = content.querySelectorAll("[role='row'], [role='presentation']");
    const totalDomRows = rows.length;

    let visibleCount = 0;
    let minTransform = Infinity;
    let maxTransform = -Infinity;
    let firstVisibleIdx = -1;
    let lastVisibleIdx = -1;
    const sampleRows = [];

    for (const row of rows) {
      const transform = row.style.transform;
      const match = transform?.match(/translateY\(([0-9.]+)/);
      const y = match ? parseFloat(match[1]) : -1;
      const height = parseFloat(row.style.height) || 0;

      if (y < minTransform) minTransform = y;
      if (y > maxTransform) maxTransform = y;

      // Row is "visible" if its Y position overlaps the viewport scroll range
      if (y + height > scrollTop && y < scrollTop + vpHeight) {
        visibleCount++;
        const idx = parseInt(row.dataset.index ?? "-1");
        if (firstVisibleIdx === -1) firstVisibleIdx = idx;
        lastVisibleIdx = idx;
      }

      if (sampleRows.length < 3) {
        sampleRows.push({
          idx: row.dataset.index,
          id: row.dataset.id,
          y,
          h: height,
          cls: row.className.slice(0, 60),
        });
      }
    }

    const entry = {
      t: performance.now(),
      scrollTop: Math.round(scrollTop),
      vpHeight,
      contentHeight: Math.round(contentHeight),
      domRows: totalDomRows,
      visible: visibleCount,
      firstVisIdx: firstVisibleIdx,
      lastVisIdx: lastVisibleIdx,
      rowYRange: totalDomRows > 0 ? [Math.round(minTransform), Math.round(maxTransform)] : null,
      sampleRows,
    };

    window.__scrollLog.push(entry);

    // Cap at 2000 entries
    if (window.__scrollLog.length > 2000) {
      window.__scrollLog = window.__scrollLog.slice(-1000);
    }
  }, { passive: true });
});

console.log("  Scroll logger injected.\n");

// Start tracing
await page.evaluate(() => { window.__tracing = true; });

await waitForEnter("Drag the native scrollbar fast, reproduce the blank, then stop");

// Stop tracing and collect
const results = await page.evaluate(() => {
  window.__tracing = false;
  const log = window.__scrollLog;

  // Find blank entries (0 visible rows but DOM rows exist)
  const blanks = log.filter(e => e.visible === 0 && e.domRows > 0);
  // Find empty entries (0 DOM rows at all)
  const empties = log.filter(e => e.domRows === 0);
  // Find normal entries
  const normals = log.filter(e => e.visible > 0);

  return {
    totalEvents: log.length,
    blankCount: blanks.length,
    emptyCount: empties.length,
    normalCount: normals.length,
    // Sample of each type
    blankSamples: blanks.slice(0, 10),
    emptySamples: empties.slice(0, 10),
    // First and last entries
    first: log[0] ?? null,
    last: log[log.length - 1] ?? null,
    // Current state
    currentDomRows: document.querySelectorAll(".vlist-content [role='row'], .vlist-content [role='presentation']").length,
    currentScrollTop: Math.round(document.querySelector(".vlist-viewport")?.scrollTop ?? 0),
  };
});

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  RESULTS");
console.log("═══════════════════════════════════════════════════════════");
console.log(`  Total scroll events: ${results.totalEvents}`);
console.log(`  Normal (rows visible): ${results.normalCount}`);
console.log(`  Blank (rows in DOM but not visible): ${results.blankCount}`);
console.log(`  Empty (0 DOM rows): ${results.emptyCount}`);
console.log(`  Current DOM rows: ${results.currentDomRows}`);
console.log(`  Current scrollTop: ${results.currentScrollTop}`);

if (results.first) {
  console.log(`\n  First event: scrollTop=${results.first.scrollTop} domRows=${results.first.domRows} visible=${results.first.visible}`);
}
if (results.last) {
  console.log(`  Last event: scrollTop=${results.last.scrollTop} domRows=${results.last.domRows} visible=${results.last.visible}`);
}

if (results.blankCount > 0) {
  console.log("\n  ── BLANK frames (rows exist but none visible) ──");
  for (const b of results.blankSamples) {
    console.log(`  scrollTop=${b.scrollTop}  vpH=${b.vpHeight}  domRows=${b.domRows}  rowY=[${b.rowYRange?.[0]}–${b.rowYRange?.[1]}]  contentH=${b.contentHeight}`);
    if (b.sampleRows.length > 0) {
      for (const sr of b.sampleRows) {
        console.log(`    row idx=${sr.idx} id=${sr.id?.slice(0,20)} y=${sr.y} h=${sr.h}`);
      }
    }
  }

  // Gap analysis
  const gaps = results.blankSamples.map(b => {
    if (!b.rowYRange) return 0;
    const scrollTop = b.scrollTop;
    return Math.min(
      Math.abs(scrollTop - b.rowYRange[0]),
      Math.abs(scrollTop + b.vpHeight - b.rowYRange[1])
    );
  });
  if (gaps.length > 0) {
    console.log(`\n  Viewport-to-row gap: avg=${Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length)}px  max=${Math.max(...gaps)}px`);
  }
}

if (results.emptyCount > 0) {
  console.log("\n  ── EMPTY frames (zero DOM rows) ──");
  for (const e of results.emptySamples) {
    console.log(`  scrollTop=${e.scrollTop}  vpH=${e.vpHeight}  contentH=${e.contentHeight}`);
  }
}

if (results.blankCount === 0 && results.emptyCount === 0) {
  console.log("\n  No blank/empty scroll events detected.");
  console.log("  If table looked blank, the issue may be visual-only (CSS) or between scroll events.");
}

console.log("\n═══════════════════════════════════════════════════════════\n");

await browser.close();
process.exit(0);
