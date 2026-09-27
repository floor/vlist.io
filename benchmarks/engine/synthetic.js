// engine/synthetic.js — Synthetic input through `scroll.mode`
//
// A list is synthetic with `scroll: { mode: "synthetic" }` on the one `vlist`
// entry. The driver is a separate file, loaded the first time a list needs it,
// and until it arrives the list scrolls natively. A synthetic suite therefore
// loads it before measuring, through the factory it measures: once loaded, a
// list is synthetic from its first frame, so no sample sees the native start.
//
// Each vlist bundle keeps its own copy of the loaded driver: `vlist` for core,
// `vlist/config` for the framework adapters. Load it through the one in use.

import { createVList } from "vlist";
import { ITEM_HEIGHT } from "./constants.js";

/** `config` with its input model set. */
export const withScrollMode = (config, mode) => ({
  ...config,
  scroll: { ...config.scroll, mode },
});

// The synthetic driver owns touch: its viewport carries the touch-action the
// native path never sets.
const isSynthetic = (list) =>
  list.element.querySelector(".vlist-viewport")?.style.touchAction.includes("pinch-zoom") ?? false;

/** Resolves once `list` takes synthetic input. */
export const whenSynthetic = (list, timeout = 10_000) =>
  isSynthetic(list)
    ? Promise.resolve()
    : new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          off();
          reject(new Error("The synthetic driver did not load"));
        }, timeout);
        const off = list.on("scroll:mode", ({ mode }) => {
          if (mode !== "synthetic") return;
          clearTimeout(timer);
          off();
          resolve();
        });
      });

/** Load the synthetic driver of `factory`'s bundle before a suite measures it. */
export async function loadSynthetic(factory = createVList) {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:320px;height:320px";
  document.body.append(host);
  const list = factory(withScrollMode({
    container: host,
    items: [{ id: 0 }],
    item: { height: ITEM_HEIGHT, template: () => "" },
  }, "synthetic"));
  try {
    await whenSynthetic(list);
  } finally {
    list.destroy();
    host.remove();
  }
}
