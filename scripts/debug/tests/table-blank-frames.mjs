/**
 * Debug: table blank frames during native scrollbar drag.
 *
 * Opens the data-table example non-headless and cycles through CSS overrides
 * to isolate which property causes blank frames during fast native scrollbar drag.
 *
 * Each test injects a CSS override, then waits for you to manually drag the
 * native scrollbar. Press Enter in the terminal to move to the next test.
 *
 *   bun scripts/debug/tests/table-blank-frames.mjs
 *
 * Hypotheses tested:
 *   1. will-change: transform on rows (creates per-row compositor layers)
 *   2. contain: content on rows (restricts paint)
 *   3. minWidth on .vlist-content (inline style from table plugin)
 *   4. flex column layout on root (vs position: relative like core)
 *   5. viewport height: auto + flex: 1 (vs height: 100% like core)
 *   6. position: absolute cells (vs inline-flow)
 */

import { launchBrowser, openPage, delay, findChrome } from "../core.mjs";

// =============================================================================
// Helpers
// =============================================================================

function waitForEnter(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(`\n  >>> ${prompt} — press Enter to continue...`);
    process.stdin.setRawMode?.(false);
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve();
    });
  });
}

async function injectCSS(page, id, css) {
  await page.evaluate(
    (styleId, styleCSS) => {
      let el = document.getElementById(styleId);
      if (!el) {
        el = document.createElement("style");
        el.id = styleId;
        document.head.appendChild(el);
      }
      el.textContent = styleCSS;
    },
    id,
    css,
  );
}

async function removeCSS(page, id) {
  await page.evaluate((styleId) => {
    document.getElementById(styleId)?.remove();
  }, id);
}

async function getTableState(page) {
  return page.evaluate(() => {
    const root = document.querySelector(".vlist--table");
    const vp = document.querySelector(".vlist-viewport");
    const content = document.querySelector(".vlist-content");
    const rows = document.querySelectorAll(".vlist-table-row");
    if (!root || !vp || !content) return { error: "missing elements" };

    const rootCS = getComputedStyle(root);
    const vpCS = getComputedStyle(vp);
    const contentCS = getComputedStyle(content);
    const rowCS = rows.length > 0 ? getComputedStyle(rows[0]) : null;

    return {
      domRows: rows.length,
      vpScrollHeight: vp.scrollHeight,
      vpClientHeight: vp.clientHeight,
      vpOverflow: vpCS.overflow,
      vpHeight: vpCS.height,
      rootDisplay: rootCS.display,
      rootFlexDir: rootCS.flexDirection,
      contentMinWidth: content.style.minWidth,
      contentContain: contentCS.contain,
      rowWillChange: rowCS?.willChange ?? "n/a",
      rowContain: rowCS?.contain ?? "n/a",
      rowPosition: rowCS?.position ?? "n/a",
    };
  });
}

// =============================================================================
// CSS Override Tests
// =============================================================================

const TESTS = [
  {
    name: "BASELINE",
    description: "No CSS overrides — reproduce the blank frame issue",
    css: null,
  },
  {
    name: "NO will-change",
    description:
      "Remove will-change: transform from rows → single compositor layer",
    css: `.vlist-table-row { will-change: auto !important; }`,
  },
  {
    name: "NO contain on rows",
    description: "Remove contain: content from rows",
    css: `.vlist-table-row { contain: none !important; }`,
  },
  {
    name: "NO will-change + NO contain",
    description: "Remove both will-change and contain from rows",
    css: `.vlist-table-row { will-change: auto !important; contain: none !important; }`,
  },
  {
    name: "NO minWidth on content",
    description: "Remove inline minWidth from .vlist-content (table sets this)",
    css: `.vlist-content { min-width: 0 !important; }`,
  },
  {
    name: "CORE-LIKE viewport",
    description:
      "Viewport: height:100%, overflow:auto (like core) instead of flex:1, height:auto",
    css: `.vlist--table .vlist-viewport { flex: none !important; height: 100% !important; min-height: 0 !important; }`,
  },
  {
    name: "NO flex root",
    description:
      "Root: position:relative (like core) instead of display:flex, flex-direction:column",
    css: `.vlist--table { display: block !important; flex-direction: unset !important; position: relative !important; }
           .vlist--table .vlist-viewport { height: 100% !important; flex: none !important; }`,
  },
  {
    name: "MATCH CORE exactly",
    description:
      "Make table rows match core .vlist-item: no will-change, right:0 instead of inline width",
    css: `.vlist-table-row {
            will-change: auto !important;
            right: 0 !important;
            width: auto !important;
          }
          .vlist-table-cell {
            position: relative !important;
          }`,
  },
];

// =============================================================================
// Main
// =============================================================================

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
console.log("  TABLE BLANK FRAMES — CSS Hypothesis Testing");
console.log("  Drag the native scrollbar fast after each override.");
console.log("═══════════════════════════════════════════════════════════");

const initState = await getTableState(page);
console.log("\n  Initial state:");
console.log(`    Rows in DOM: ${initState.domRows}`);
console.log(`    Viewport: ${initState.vpClientHeight}px (scroll: ${initState.vpScrollHeight}px)`);
console.log(`    Row will-change: ${initState.rowWillChange}`);
console.log(`    Row contain: ${initState.rowContain}`);
console.log(`    Row position: ${initState.rowPosition}`);
console.log(`    Content minWidth: ${initState.contentMinWidth}`);
console.log(`    Root display: ${initState.rootDisplay} ${initState.rootFlexDir}`);

for (const test of TESTS) {
  console.log("\n───────────────────────────────────────────────────────────");
  console.log(`  TEST: ${test.name}`);
  console.log(`  ${test.description}`);
  console.log("───────────────────────────────────────────────────────────");

  // Reset to baseline
  await removeCSS(page, "debug-override");

  if (test.css) {
    await injectCSS(page, "debug-override", test.css);
    console.log(`  CSS injected.`);
  }

  // Show current computed state
  const state = await getTableState(page);
  console.log(`  → will-change: ${state.rowWillChange}`);
  console.log(`  → contain: ${state.rowContain}`);
  console.log(`  → position: ${state.rowPosition}`);
  console.log(`  → viewport height: ${state.vpHeight}`);
  console.log(`  → root display: ${state.rootDisplay}`);

  // Scroll back to top so user can test fresh each time
  await page.evaluate(() => {
    const vp = document.querySelector(".vlist-viewport");
    if (vp) vp.scrollTop = 0;
  });
  await delay(300);

  await waitForEnter(`Drag the scrollbar fast. Does it blank? (${test.name})`);
}

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  DONE — all tests complete");
console.log("═══════════════════════════════════════════════════════════\n");

await browser.close();
process.exit(0);
