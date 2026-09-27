// Scroll FPS for the SolidJS page. This suite calls the vlist entry directly,
// matching the existing SolidJS benchmark, which does not boot the Solid runtime.
// The mode sets scroll.mode on it.

import { createVList } from "vlist";
import { defineSuite, benchmarkTemplate } from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { findViewport } from "../../../engine/viewport.js";
import { runLogicalScroll, scrollCapturePlugin } from "../../../engine/logical-scroll.js";
import { loadSynthetic, withScrollMode } from "../../../engine/synthetic.js";

const DESCRIPTION = "Sustained scrolling for 5s. Native and synthetic are driven by the same position write, then the rows are checked.";

function defineMode(mode) {
  defineSuite({
    id: `scroll-logical-${mode}-solidjs`,
    name: "Scroll FPS (SolidJS)",
    description: DESCRIPTION,
    icon: "📜",
    hasScrollSpeed: true,
    run: async (ctx) => {
      if (mode === "synthetic") await loadSynthetic();
      return runLogicalScroll({
        ...ctx,
        mode,
        createList(container, items) {
          let write;
          const list = createVList(withScrollMode({
            container,
            items,
            item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
          }, mode), [scrollCapturePlugin((set) => { write = set; })]);
          const viewport = findViewport(container);
          return {
            set: (position) => write(position),
            get: () => mode === "synthetic" ? list.getScrollPosition() : viewport.scrollTop,
            destroy: () => list.destroy(),
          };
        },
      });
    },
  });
}

defineMode("native");
if (__BENCH_HAS_SYNTHETIC__) defineMode("synthetic");
