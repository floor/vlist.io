/**
 * Debug: precise table blank diagnosis.
 *
 * Injects instrumentation that captures EXACTLY what happens on each
 * scroll event: whether the render runs, what range it computes,
 * what offsets it produces, and what the DOM looks like after.
 *
 *   bun scripts/debug/tests/table-blank-precise.mjs
 */

import { launchBrowser, openPage, delay } from "../core.mjs";

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
console.log("  TABLE BLANK PRECISE — Scroll Event Trace");
console.log("═══════════════════════════════════════════════════════════");

// Inject per-scroll-event capture that runs AFTER the render cycle
await page.evaluate(() => {
  window.__traceLog = [];
  window.__tracing = false;
  window.__lastBlankState = null;

  const vp = document.querySelector(".vlist-viewport");
  const content = document.querySelector(".vlist-content");

  // Capture on every scroll event, using a microtask to run AFTER
  // the synchronous render pipeline completes
  vp.addEventListener("scroll", () => {
    if (!window.__tracing) return;

    // Run after the render cycle completes (microtask)
    Promise.resolve().then(() => {
      const scrollTop = vp.scrollTop;
      const vpHeight = vp.clientHeight;
      const contentH = parseFloat(content.style.height) || 0;
      const rows = content.querySelectorAll("[role='row'], [role='presentation']");
      const domRows = rows.length;

      let visible = 0;
      const transforms = [];
      let hasNegative = false;

      for (const row of rows) {
        const raw = row.style.transform || "";
        // Match negative numbers too
        const m = raw.match(/translateY\((-?[0-9.]+)/);
        const y = m ? parseFloat(m[1]) : null;
        const h = parseFloat(row.style.height) || 0;
        const idx = row.dataset.index;
        const id = row.dataset.id;

        if (y !== null && y + h > scrollTop && y < scrollTop + vpHeight) {
          visible++;
        }
        if (y !== null && y < 0) hasNegative = true;

        transforms.push({
          idx,
          id: id ? id.slice(0, 20) : null,
          y,
          h,
          raw: raw.slice(0, 40),
        });
      }

      const isBlank = visible === 0 && domRows > 0;

      const entry = {
        t: Math.round(performance.now()),
        st: Math.round(scrollTop),
        ch: Math.round(contentH),
        dom: domRows,
        vis: visible,
        blank: isBlank,
        neg: hasNegative,
        transforms: isBlank ? transforms.slice(0, 5) : [],
      };

      // Only log interesting events (blanks, or first/last)
      if (isBlank) {
        window.__traceLog.push(entry);
        window.__lastBlankState = {
          ...entry,
          allTransforms: transforms,
        };
      } else if (window.__traceLog.length < 10) {
        window.__traceLog.push(entry);
      }
    });
  }, { passive: true });

  // Also monitor via rAF for sustained blank detection
  let blankFrameCount = 0;
  let wasBlank = false;

  function rafCheck() {
    if (!window.__tracing) { requestAnimationFrame(rafCheck); return; }

    const scrollTop = vp.scrollTop;
    const vpHeight = vp.clientHeight;
    const rows = content.querySelectorAll("[role='row'], [role='presentation']");

    let visible = 0;
    for (const row of rows) {
      const m = row.style.transform?.match(/translateY\((-?[0-9.]+)/);
      if (m) {
        const y = parseFloat(m[1]);
        const h = parseFloat(row.style.height) || 0;
        if (y + h > scrollTop && y < scrollTop + vpHeight) visible++;
      }
    }

    const isBlank = visible === 0 && rows.length > 0;
    if (isBlank) {
      blankFrameCount++;
    } else if (wasBlank && !isBlank) {
      // Recovery
      console.log(`%c[RECOVERY] Blank lasted ${blankFrameCount} frames, now visible=${visible}`, "color: lime");
      blankFrameCount = 0;
    }
    wasBlank = isBlank;

    requestAnimationFrame(rafCheck);
  }
  requestAnimationFrame(rafCheck);
});

// Start tracing
await page.evaluate(() => { window.__tracing = true; });

console.log("\n  Tracing active. Browser is open for manual scrollbar drag.");
console.log("  Drag the native scrollbar to reproduce the blank.");
console.log("  Results will be collected when the script exits.\n");

// Listen for console messages from the page
page.on("console", msg => {
  const text = msg.text();
  if (text.includes("[RECOVERY]") || text.includes("[BLANK]")) {
    console.log("  PAGE: " + text);
  }
});

// Wait for user to test, then collect
await delay(30000);

const results = await page.evaluate(() => {
  window.__tracing = false;
  return {
    logLength: window.__traceLog.length,
    log: window.__traceLog.slice(0, 30),
    lastBlank: window.__lastBlankState,
  };
});

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  RESULTS");
console.log("═══════════════════════════════════════════════════════════");
console.log(`  Events captured: ${results.logLength}`);

// Show blank events
const blanks = results.log.filter(e => e.blank);
const normals = results.log.filter(e => !e.blank);

console.log(`  Blank events: ${blanks.length}`);
console.log(`  Normal events: ${normals.length}`);

if (blanks.length > 0) {
  console.log("\n  ── BLANK scroll events ──");
  for (const b of blanks.slice(0, 10)) {
    console.log(`  scroll=${b.st}  dom=${b.dom}  contentH=${b.ch}  hasNeg=${b.neg}`);
    if (b.transforms.length > 0) {
      for (const t of b.transforms) {
        console.log(`    row idx=${t.idx} id=${t.id} y=${t.y} h=${t.h} raw="${t.raw}"`);
      }
    }
  }
}

if (results.lastBlank) {
  console.log("\n  ── Last blank state (all rows) ──");
  console.log(`  scroll=${results.lastBlank.st}  dom=${results.lastBlank.dom}  contentH=${results.lastBlank.ch}`);
  for (const t of results.lastBlank.allTransforms) {
    console.log(`    idx=${t.idx} id=${t.id} y=${t.y} h=${t.h} raw="${t.raw}"`);
  }
}

if (normals.length > 0) {
  console.log("\n  ── Normal events (first few) ──");
  for (const n of normals.slice(0, 5)) {
    console.log(`  scroll=${n.st}  dom=${n.dom}  visible=${n.vis}`);
  }
}

console.log("\n═══════════════════════════════════════════════════════════\n");

await browser.close();
process.exit(0);
