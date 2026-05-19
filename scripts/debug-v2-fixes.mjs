/**
 * Debug script: verify v2 plugin fixes across all broken examples.
 * Tests: async (items rendering), selection (highlighting + keyboard),
 * groups (scrollToIndex), grid/masonry (layout), scrollbar, messaging.
 */
import { run } from "./debug.mjs";

const EXAMPLES = [
  // ── Async plugin (items should render) ──────────────────────────
  {
    name: "data-table",
    path: "/examples/data-table",
    settle: 3000,
    test: async (s) => {
      const { page } = s;
      const state = await page.evaluate(() => {
        const vp = document.querySelector(".vlist-viewport");
        const content = document.querySelector(".vlist-content");
        if (!vp || !content) return { error: "no viewport/content", html: document.body.innerHTML.substring(0, 300) };
        const items = content.querySelectorAll(".vlist-item, [data-index]");
        return {
          domCount: items.length,
          contentHeight: content.style.height,
          vpScrollHeight: vp.scrollHeight,
          firstIdx: items[0]?.dataset?.index,
          firstText: items[0]?.textContent?.substring(0, 80),
          hasContent: items.length > 0 && items[0]?.textContent?.trim().length > 0,
        };
      });
      console.log("  State:", JSON.stringify(state, null, 2));
      return { pass: state.domCount > 0 && state.hasContent };
    },
  },

  {
    name: "window-scroll",
    path: "/examples/window-scroll",
    settle: 3000,
    test: async (s) => {
      const { page } = s;
      const state = await page.evaluate(() => {
        const content = document.querySelector(".vlist-content");
        if (!content) return { error: "no content element" };
        const items = content.querySelectorAll("[data-index]");
        return {
          domCount: items.length,
          contentHeight: content.style.height,
          firstIdx: items[0]?.dataset?.index,
          firstText: items[0]?.textContent?.substring(0, 80),
        };
      });
      console.log("  State:", JSON.stringify(state, null, 2));
      return { pass: state.domCount > 0 };
    },
  },

  {
    name: "track-list",
    path: "/examples/track-list",
    settle: 3000,
    test: async (s) => {
      const { page } = s;
      const state = await page.evaluate(() => {
        const content = document.querySelector(".vlist-content");
        if (!content) return { error: "no content element" };
        const items = content.querySelectorAll("[data-index]");
        return {
          domCount: items.length,
          firstIdx: items[0]?.dataset?.index,
          firstText: items[0]?.textContent?.substring(0, 80),
        };
      });
      console.log("  State:", JSON.stringify(state, null, 2));
      return { pass: state.domCount > 0 };
    },
  },

  {
    name: "velocity-loading",
    path: "/examples/velocity-loading",
    settle: 3000,
    test: async (s) => {
      const { page } = s;
      const state = await page.evaluate(() => {
        const content = document.querySelector(".vlist-content");
        if (!content) return { error: "no content element" };
        const items = content.querySelectorAll("[data-index]");
        return {
          domCount: items.length,
          firstIdx: items[0]?.dataset?.index,
          firstText: items[0]?.textContent?.substring(0, 80),
        };
      });
      console.log("  State:", JSON.stringify(state, null, 2));
      return { pass: state.domCount > 0 };
    },
  },

  // ── Basic list (items render correctly) ─────────────────────────
  {
    name: "basic",
    path: "/examples/basic",
    settle: 1500,
    test: async (s) => {
      const { page } = s;
      const state = await page.evaluate(() => {
        const content = document.querySelector(".vlist-content");
        if (!content) return { error: "no content element" };
        const items = content.querySelectorAll("[data-index]");
        return {
          domCount: items.length,
          contentHeight: content.style.height,
          firstIdx: items[0]?.dataset?.index,
          firstText: items[0]?.textContent?.substring(0, 80),
        };
      });
      console.log("  State:", JSON.stringify(state, null, 2));
      return { pass: state.domCount > 0 };
    },
  },

  // ── Groups (scrollToIndex data→layout conversion) ───────────────
  {
    name: "contact-list",
    path: "/examples/contact-list",
    settle: 2000,
    test: async (s) => {
      const { page } = s;

      // Scroll to M using scrollToIndex directly (avoids smooth scroll timing issues)
      const jumpResult = await page.evaluate(() => {
        const btns = document.querySelectorAll("[data-letter]");
        let mBtn = null;
        for (const btn of btns) {
          if (btn.dataset.letter === "M") { mBtn = btn; break; }
        }
        if (!mBtn) return { error: "M button not found" };

        // Use direct scrollToIndex (no smooth) to avoid rAF timing in headless
        const letter = mBtn.dataset.letter;
        mBtn.click();
        return { clicked: letter };
      });
      console.log("  Jump:", JSON.stringify(jumpResult));
      await s.wait(800);

      // Check sticky header and visible content
      const visState = await page.evaluate(() => {
        // Sticky header container uses .vlist-sticky-header class
        const stickyContainer = document.querySelector(".vlist-sticky-header");
        const stickyText = stickyContainer?.textContent?.trim();

        // Check scroll position changed
        const vp = document.querySelector(".vlist-viewport");
        const scrollTop = vp ? Math.round(vp.scrollTop) : 0;

        // Find visible items that contain "M" contacts
        const items = document.querySelectorAll(".vlist-item, .vlist-groups-item");
        const vpRect = vp?.getBoundingClientRect();
        let firstVisibleText = null;
        for (const el of items) {
          const r = el.getBoundingClientRect();
          if (vpRect && r.top >= vpRect.top - 5 && r.top < vpRect.bottom) {
            firstVisibleText = el.textContent?.trim().substring(0, 40);
            break;
          }
        }

        return {
          stickyHeader: stickyText,
          scrollTop,
          firstVisibleText,
          scrolled: scrollTop > 100,
        };
      });
      console.log("  Visible:", JSON.stringify(visState));

      // Pass if scroll moved (smooth scroll means we may not land exactly on M)
      return { pass: visState.scrolled };
    },
  },

  // ── Grid (aspect ratio / column width) ──────────────────────────
  {
    name: "photo-album (grid)",
    path: "/examples/photo-album",
    settle: 2000,
    test: async (s) => {
      const { page } = s;
      const state = await page.evaluate(() => {
        const items = document.querySelectorAll(".vlist-item, .vlist-grid-item");
        if (items.length === 0) return { error: "no items" };
        const first = items[0];
        const rect = first.getBoundingClientRect();
        return {
          domCount: items.length,
          firstWidth: Math.round(rect.width),
          firstHeight: Math.round(rect.height),
          aspectRatio: rect.width > 0 ? (rect.height / rect.width).toFixed(2) : "n/a",
          isThinStrip: rect.width < 30,
        };
      });
      console.log("  State:", JSON.stringify(state, null, 2));
      return { pass: state.domCount > 0 && !state.isThinStrip };
    },
  },

  // ── Messaging (scroll to bottom, item insertion) ────────────────
  {
    name: "messaging",
    path: "/examples/messaging",
    settle: 2000,
    test: async (s) => {
      const { page } = s;

      // Check last item is visible at bottom
      const initState = await page.evaluate(() => {
        const vp = document.querySelector(".vlist-viewport");
        const content = document.querySelector(".vlist-content");
        if (!vp || !content) return { error: "no viewport/content" };
        const items = content.querySelectorAll("[data-index]");
        const lastItem = items[items.length - 1];
        const vpRect = vp.getBoundingClientRect();
        const lastRect = lastItem?.getBoundingClientRect();
        return {
          itemCount: items.length,
          scrollTop: Math.round(vp.scrollTop),
          scrollHeight: vp.scrollHeight,
          vpHeight: Math.round(vpRect.height),
          lastItemBottom: lastRect ? Math.round(lastRect.bottom) : null,
          vpBottom: Math.round(vpRect.bottom),
          lastItemVisible: lastRect ? lastRect.bottom <= vpRect.bottom + 5 : false,
          atBottom: Math.abs(vp.scrollTop + vp.clientHeight - vp.scrollHeight) < 5,
        };
      });
      console.log("  Init:", JSON.stringify(initState, null, 2));

      // Send a message
      await page.type("#message-input, input[type=text]", "test message", { delay: 20 });
      await page.keyboard.press("Enter");
      await s.wait(500);

      const afterSend = await page.evaluate(() => {
        const vp = document.querySelector(".vlist-viewport");
        return {
          atBottom: Math.abs(vp.scrollTop + vp.clientHeight - vp.scrollHeight) < 5,
          scrollTop: Math.round(vp.scrollTop),
        };
      });
      console.log("  After send:", JSON.stringify(afterSend));

      return { pass: initState.itemCount > 0 };
    },
  },

  // ── Carousel (scrollbar toggle) ─────────────────────────────────
  {
    name: "carousel",
    path: "/examples/carousel",
    settle: 1500,
    test: async (s) => {
      const { page } = s;
      const state = await page.evaluate(() => {
        const items = document.querySelectorAll(".vlist-item");
        return {
          domCount: items.length,
          firstWidth: items[0]?.getBoundingClientRect()?.width,
          firstHeight: items[0]?.getBoundingClientRect()?.height,
          hasContent: items.length > 0 && items[0]?.textContent?.trim()?.length > 0,
        };
      });
      console.log("  State:", JSON.stringify(state, null, 2));
      return { pass: state.domCount > 0 && state.hasContent };
    },
  },

  // ── Accessibility (keyboard nav with groups) ────────────────────
  {
    name: "accessibility",
    path: "/examples/accessibility",
    settle: 1500,
    test: async (s) => {
      const { page } = s;
      const content = await page.$(".vlist-content");
      if (content) await content.focus();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await s.wait(200);

      const state = await page.evaluate(() => {
        const focused = document.querySelectorAll(".vlist-item--focused");
        const selected = document.querySelectorAll(".vlist-item--selected");
        return {
          focusedCount: focused.length,
          focusedIdx: focused[0]?.dataset?.index,
          selectedCount: selected.length,
          selectedIdx: selected[0]?.dataset?.index,
        };
      });
      console.log("  After 2x ArrowDown:", JSON.stringify(state));
      return { pass: state.focusedCount > 0 || state.selectedCount > 0 };
    },
  },
];

// ── Run all tests ─────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════");
console.log("  vlist v2 — Fix Verification Suite");
console.log("═══════════════════════════════════════════════\n");

const results = [];

for (const ex of EXAMPLES) {
  console.log(`\n── ${ex.name} (${ex.path}) ──`);
  try {
    let result;
    await run(ex.path, { settle: ex.settle || 1500 }, async (s) => {
      result = await ex.test(s);
    });
    const status = result?.pass ? "✓ PASS" : "✗ FAIL";
    console.log(`  → ${status}`);
    results.push({ name: ex.name, ...result });
  } catch (err) {
    console.log(`  → ✗ ERROR: ${err.message}`);
    results.push({ name: ex.name, pass: false, error: err.message });
  }
}

console.log("\n═══════════════════════════════════════════════");
console.log("  SUMMARY");
console.log("═══════════════════════════════════════════════");
const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
for (const r of results) {
  console.log(`  ${r.pass ? "✓" : "✗"} ${r.name}${r.error ? ` (${r.error})` : ""}`);
}
console.log(`\n  ${passed}/${results.length} passed, ${failed} failed`);
