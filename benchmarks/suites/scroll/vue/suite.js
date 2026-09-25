// Scroll FPS for Vue. Both modes use the same position write.

import { createApp } from "vue";
import { useVList } from "vlist-vue";
import { createVList as createSynthetic } from "vlist/synthetic";
import { defineSuite, benchmarkTemplate, waitFrames } from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { findViewport } from "../../../engine/viewport.js";
import { runLogicalScroll, scrollCapturePlugin } from "../../../engine/logical-scroll.js";

const DESCRIPTION = "Sustained scrolling for 5s. Native and synthetic are driven by the same position write, then the rows are checked.";

const mount = (container, items, factory) => {
  let write;
  let instance = null;
  const List = {
    props: { items: Array, target: Object },
    setup(props) {
      const api = useVList({
        items: props.items,
        item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
        ...(factory ? { factory } : {}),
        plugins: [scrollCapturePlugin((set) => { write = set; })],
      });
      api.containerRef.value = props.target;
      instance = api.instance;
      return () => null;
    },
  };
  const app = createApp(List, { items, target: container });
  app.mount(container);
  return {
    ready: waitFrames(5).then(() => {
      if (!write) throw new Error("Vue list did not install the scroll writer");
    }),
    set: (position) => write(position),
    get: () => (factory ? instance?.value?.getScrollPosition?.() : findViewport(container).scrollTop),
    destroy: () => app.unmount(),
  };
};

function defineMode(mode) {
  defineSuite({
    id: `scroll-logical-${mode}-vue`,
    name: "Scroll FPS (Vue)",
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
