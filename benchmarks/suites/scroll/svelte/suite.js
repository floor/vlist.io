// Scroll FPS for Svelte. Both modes use the same position write.

import { vlist } from "vlist-svelte";
import { createVList as createSynthetic } from "vlist/synthetic";
import { defineSuite, benchmarkTemplate } from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { findViewport } from "../../../engine/viewport.js";
import { runLogicalScroll, scrollCapturePlugin } from "../../../engine/logical-scroll.js";

const DESCRIPTION = "Sustained scrolling for 5s. Native and synthetic are driven by the same position write, then the rows are checked.";

function defineMode(mode) {
  defineSuite({
    id: `scroll-logical-${mode}-svelte`,
    name: "Scroll FPS (Svelte)",
    description: DESCRIPTION,
    icon: "📜",
    hasScrollSpeed: true,
    run: (ctx) => runLogicalScroll({
      ...ctx,
      mode,
      createList(container, items) {
        let write;
        let instance;
        const action = vlist(container, {
          config: {
            items,
            item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
            ...(mode === "synthetic" ? { factory: createSynthetic } : {}),
            plugins: [scrollCapturePlugin((set) => { write = set; })],
          },
          onInstance: (value) => { instance = value; },
        });
        if (!write) throw new Error("Svelte list did not install the scroll writer");
        return {
          set: (position) => write(position),
          get: () => mode === "synthetic" ? instance.getScrollPosition() : findViewport(container).scrollTop,
          destroy: () => action.destroy?.(),
        };
      },
    }),
  });
}

defineMode("native");
if (__BENCH_HAS_SYNTHETIC__) defineMode("synthetic");
