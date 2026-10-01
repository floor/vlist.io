// Scroll FPS for Vue. Both modes use the same position write.

import { createApp } from "vue";
import { useVList } from "vlist/vue";
import { defineSuite, benchmarkTemplate, waitFrames } from "../../../runner.js";
import { ITEM_HEIGHT } from "../../../engine/constants.js";
import { findViewport } from "../../../engine/viewport.js";
import { runLogicalScroll, scrollCapturePlugin } from "../../../engine/logical-scroll.js";
import { loadSynthetic } from "../../../engine/synthetic.js";

const DESCRIPTION = "Sustained scrolling for 5s. Native and synthetic are driven by the same position write, then the rows are checked.";

const mount = (container, items, mode) => {
  let write;
  let instance = null;
  const List = {
    props: { items: Array, target: Object },
    setup(props) {
      const api = useVList({
        items: props.items,
        item: { height: ITEM_HEIGHT, template: benchmarkTemplate },
        scroll: { mode },
      }, [scrollCapturePlugin((set) => { write = set; })]);
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
    get: () => (mode === "synthetic" ? instance?.value?.getScrollPosition?.() : findViewport(container).scrollTop),
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
    run: async (ctx) => {
      if (mode === "synthetic") await loadSynthetic();
      return runLogicalScroll({
        ...ctx,
        mode,
        settleFrames: 0,
        createList: async (target, items) => {
          const created = mount(target, items, mode);
          await created.ready;
          return created;
        },
      });
    },
  });
}

defineMode("native");
if (__BENCH_HAS_SYNTHETIC__) defineMode("synthetic");
