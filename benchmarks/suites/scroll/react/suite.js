// Scroll FPS for React. Both modes use the same position write.
// The adapter receives factory so synthetic comes from vlist/synthetic.

import { createRoot } from "react-dom/client";
import { useVList } from "vlist-react";
import { createVList as createSynthetic } from "vlist/synthetic";
import { defineSuite, benchmarkTemplate, waitFrames } from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { findViewport } from "../../../engine/viewport.js";
import { runLogicalScroll, scrollCapturePlugin } from "../../../engine/logical-scroll.js";

const DESCRIPTION = "Sustained scrolling for 5s. Native and synthetic are driven by the same position write, then the rows are checked.";

function mount(container, items, factory) {
  let write;
  let readInstance = () => null;
  function List() {
    const api = useVList({
      items,
      item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
      ...(factory ? { factory } : {}),
      plugins: [scrollCapturePlugin((set) => { write = set; })],
    });
    api.containerRef.current = container;
    readInstance = () => api.getInstance();
    return null;
  }
  const root = createRoot(container);
  root.render(<List />);
  return {
    ready: waitFrames(15).then(() => {
      if (!write) throw new Error("React list did not install the scroll writer");
    }),
    set: (position) => write(position),
    get: () => (factory ? readInstance()?.getScrollPosition?.() : findViewport(container).scrollTop),
    destroy: () => root.unmount(),
  };
}

function defineMode(mode) {
  defineSuite({
    id: `scroll-logical-${mode}-react`,
    name: "Scroll FPS (React)",
    description: DESCRIPTION,
    icon: "📜",
    hasScrollSpeed: true,
    run: (ctx) => runLogicalScroll({
      ...ctx,
      mode,
      settleFrames: 0,
      createList: async (target, items) => {
        const created = mount(target, items, mode === "synthetic" ? createSynthetic : undefined);
        await created.ready;
        return created;
      },
    }),
  });
}

defineMode("native");
if (__BENCH_HAS_SYNTHETIC__) defineMode("synthetic");
