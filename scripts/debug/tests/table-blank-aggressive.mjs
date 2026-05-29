/**
 * Debug: aggressive scrollbar drag + rAF visual monitor.
 *
 * Two approaches:
 * 1. Aggressive Puppeteer drag (faster, fewer steps)
 * 2. Inject a rAF monitor, then leave browser open for manual testing
 *
 *   bun scripts/debug/tests/table-blank-aggressive.mjs
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
console.log("  TABLE BLANK AGGRESSIVE — Scrollbar Drag + rAF Monitor");
console.log("═══════════════════════════════════════════════════════════");

// Get viewport geometry
const geo = await page.evaluate(() => {
  const vp = document.querySelector(".vlist-viewport");
  const rect = vp.getBoundingClientRect();
  return {
    right: rect.right,
    top: rect.top,
    height: rect.height,
    scrollbarWidth: vp.offsetWidth - vp.clientWidth,
    scrollHeight: vp.scrollHeight,
    clientHeight: vp.clientHeight,
  };
});

const scrollbarX = geo.right - geo.scrollbarWidth / 2;
const trackTop = geo.top;
const trackHeight = geo.height;
const thumbH = Math.max(30, (geo.clientHeight / geo.scrollHeight) * geo.height);

console.log(`  Scrollbar at X=${Math.round(scrollbarX)}, width=${geo.scrollbarWidth}px`);

// Inject rAF monitor that captures blank frames with full diagnostic
await page.evaluate(() => {
  window.__blankLog = [];
  window.__frameLog = [];
  window.__monitoring = false;
  window.__frameNum = 0;

  function monitor() {
    if (!window.__monitoring) { requestAnimationFrame(monitor); return; }

    window.__frameNum++;
    const vp = document.querySelector(".vlist-viewport");
    const content = document.querySelector(".vlist-content");
    if (!vp || !content) { requestAnimationFrame(monitor); return; }

    const scrollTop = vp.scrollTop;
    const vpHeight = vp.clientHeight;
    const rows = content.querySelectorAll("[role='row'], [role='presentation']");
    const domRows = rows.length;

    let visible = 0;
    let minY = Infinity, maxY = -Infinity;
    for (const row of rows) {
      const m = row.style.transform?.match(/translateY\(([0-9.]+)/);
      if (m) {
        const y = parseFloat(m[1]);
        const h = parseFloat(row.style.height) || 0;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y + h;
        if (y + h > scrollTop && y < scrollTop + vpHeight) visible++;
      }
    }

    const contentH = parseFloat(content.style.height) || 0;

    // Always log frame state (capped)
    const entry = {
      f: window.__frameNum,
      st: Math.round(scrollTop),
      dom: domRows,
      vis: visible,
      yMin: minY === Infinity ? -1 : Math.round(minY),
      yMax: maxY === -Infinity ? -1 : Math.round(maxY),
      ch: Math.round(contentH),
    };

    if (window.__frameLog.length < 5000) window.__frameLog.push(entry);

    // Blank frame: DOM rows exist but none visible
    if (visible === 0 && domRows > 0) {
      window.__blankLog.push({
        ...entry,
        gap: minY === Infinity ? -1 : Math.round(Math.min(
          Math.abs(scrollTop - minY),
          Math.abs(scrollTop + vpHeight - maxY)
        )),
      });
    }

    requestAnimationFrame(monitor);
  }
  requestAnimationFrame(monitor);
});

// ── Test: Aggressive drag (instant jump) ──
console.log("\n  Test: Aggressive drag (top → 70% in 3 steps)...");

await page.evaluate(() => {
  document.querySelector(".vlist-viewport").scrollTop = 0;
});
await delay(300);
await page.evaluate(() => {
  window.__monitoring = true;
  window.__frameNum = 0;
  window.__blankLog = [];
  window.__frameLog = [];
});

const thumbStartY = trackTop + thumbH / 2;
const targetY = trackTop + trackHeight * 0.7;

await page.mouse.move(scrollbarX, thumbStartY);
await page.mouse.down();
// 3 fast moves
await page.mouse.move(scrollbarX, thumbStartY + (targetY - thumbStartY) * 0.33, { steps: 1 });
await page.mouse.move(scrollbarX, thumbStartY + (targetY - thumbStartY) * 0.66, { steps: 1 });
await page.mouse.move(scrollbarX, targetY, { steps: 1 });
await page.mouse.up();

await delay(500);

const r1 = await page.evaluate(() => {
  window.__monitoring = false;
  return {
    frames: window.__frameLog.length,
    blanks: window.__blankLog.length,
    blankSamples: window.__blankLog.slice(0, 5),
    lastFrames: window.__frameLog.slice(-5),
  };
});

console.log(`  Frames: ${r1.frames}  Blank: ${r1.blanks}`);
if (r1.blanks > 0) {
  console.log("  Blank frames:");
  for (const b of r1.blankSamples) {
    console.log(`    f#${b.f}: scroll=${b.st} dom=${b.dom} rowY=[${b.yMin}–${b.yMax}] gap=${b.gap}px`);
  }
}
console.log("  Last frames:", r1.lastFrames.map(f => `scroll=${f.st} dom=${f.dom} vis=${f.vis}`).join(" | "));

// ── Now inject console diagnostic for manual testing ──
console.log("\n───────────────────────────────────────────────────────────");
console.log("  MANUAL TEST MODE");
console.log("  Injecting blank-frame detector. Drag the scrollbar.");
console.log("  Blanks will be logged to browser DevTools console.");
console.log("  Press Ctrl+C in this terminal when done.");
console.log("───────────────────────────────────────────────────────────");

await page.evaluate(() => {
  window.__monitoring = true;
  window.__frameNum = 0;
  window.__blankLog = [];
  window.__manualBlankCount = 0;

  // Override the monitor to log to console
  const vp = document.querySelector(".vlist-viewport");
  const content = document.querySelector(".vlist-content");

  let lastLogTime = 0;

  function manualMonitor() {
    if (!window.__monitoring) return;

    const scrollTop = vp.scrollTop;
    const vpHeight = vp.clientHeight;
    const rows = content.querySelectorAll("[role='row'], [role='presentation']");
    const domRows = rows.length;

    let visible = 0;
    let minY = Infinity, maxY = -Infinity;
    for (const row of rows) {
      const m = row.style.transform?.match(/translateY\(([0-9.]+)/);
      if (m) {
        const y = parseFloat(m[1]);
        const h = parseFloat(row.style.height) || 0;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y + h;
        if (y + h > scrollTop && y < scrollTop + vpHeight) visible++;
      }
    }

    const contentH = parseFloat(content.style.height) || 0;

    if (visible === 0 && domRows > 0) {
      window.__manualBlankCount++;
      const now = performance.now();
      if (now - lastLogTime > 100) { // Throttle logging
        console.warn(`[BLANK #${window.__manualBlankCount}] scroll=${Math.round(scrollTop)} dom=${domRows} rows@[${Math.round(minY)}–${Math.round(maxY)}] viewport=[${Math.round(scrollTop)}–${Math.round(scrollTop+vpHeight)}] contentH=${Math.round(contentH)}`);
        lastLogTime = now;
      }
    } else if (visible === 0 && domRows === 0) {
      const now = performance.now();
      if (now - lastLogTime > 100) {
        console.error(`[EMPTY] scroll=${Math.round(scrollTop)} NO DOM ROWS contentH=${Math.round(contentH)}`);
        lastLogTime = now;
      }
    }

    requestAnimationFrame(manualMonitor);
  }
  requestAnimationFrame(manualMonitor);

  console.log("%c[vlist debug] Blank frame detector active. Drag the scrollbar to test.", "color: cyan; font-weight: bold");
});

// Keep the script alive so the browser stays open
await new Promise(() => {});
