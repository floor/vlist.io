/**
 * Debug: verify v2 plugin fixes across all examples.
 * Tests: async (items rendering), selection (highlighting + keyboard),
 * groups (scrollToIndex), grid/masonry (layout), scrollbar, messaging.
 *
 *   bun scripts/debug/tests/v2-fixes.mjs
 *   bun scripts/debug/tests/v2-fixes.mjs --only=grid
 */
import { suite } from "../runner.mjs";
import { checkRenders } from "../presets.mjs";

const TESTS = [
  {
    name: "data-table",
    path: "/examples/data-table",
    settle: 3000,
    test: async (s) => checkRenders(s),
  },

  {
    name: "window-scroll",
    path: "/examples/window-scroll",
    settle: 3000,
    test: async (s) => checkRenders(s),
  },

  {
    name: "track-list",
    path: "/examples/track-list",
    settle: 3000,
    test: async (s) => checkRenders(s),
  },

  {
    name: "velocity-loading",
    path: "/examples/velocity-loading",
    settle: 3000,
    test: async (s) => checkRenders(s),
  },

  {
    name: "basic",
    path: "/examples/basic",
    settle: 1500,
    test: async (s) => checkRenders(s),
  },

  {
    name: "contact-list",
    path: "/examples/contact-list",
    settle: 2000,
    test: async (s) => {
      const jumpResult = await s.evaluate(() => {
        const btns = document.querySelectorAll("[data-letter]");
        let mBtn = null;
        for (const btn of btns) {
          if (btn.dataset.letter === "M") { mBtn = btn; break; }
        }
        if (!mBtn) return { error: "M button not found" };
        mBtn.click();
        return { clicked: "M" };
      });
      console.log("  Jump:", JSON.stringify(jumpResult));
      await s.wait(800);

      const visState = await s.evaluate(() => {
        const stickyContainer = document.querySelector(".vlist-sticky-header");
        const stickyText = stickyContainer?.textContent?.trim();
        const vp = document.querySelector(".vlist-viewport");
        const scrollTop = vp ? Math.round(vp.scrollTop) : 0;
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
        return { stickyHeader: stickyText, scrollTop, firstVisibleText, scrolled: scrollTop > 100 };
      });
      console.log("  Visible:", JSON.stringify(visState));
      return { pass: visState.scrolled };
    },
  },

  {
    name: "photo-album (grid)",
    path: "/examples/photo-album",
    settle: 2000,
    test: async (s) => {
      const state = await s.evaluate(() => {
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

  {
    name: "messaging",
    path: "/examples/messaging",
    settle: 2000,
    test: async (s) => {
      const initState = await s.evaluate(() => {
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
          vpHeight: Math.round(vpRect.height),
          lastItemVisible: lastRect ? lastRect.bottom <= vpRect.bottom + 5 : false,
          atBottom: Math.abs(vp.scrollTop + vp.clientHeight - vp.scrollHeight) < 5,
        };
      });
      console.log("  Init:", JSON.stringify(initState, null, 2));

      await s.type("#message-input, input[type=text]", "test message");
      await s.press("Enter");
      await s.wait(500);

      const afterSend = await s.evaluate(() => {
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

  {
    name: "carousel",
    path: "/examples/carousel",
    settle: 1500,
    test: async (s) => checkRenders(s),
  },

  {
    name: "accessibility",
    path: "/examples/accessibility",
    settle: 1500,
    test: async (s) => {
      const content = await s.page.$(".vlist-content");
      if (content) await content.focus();
      await s.press("ArrowDown");
      await s.press("ArrowDown");
      await s.wait(200);

      const state = await s.evaluate(() => {
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

await suite(TESTS);
