// Bounded Scroll — vanilla example (RFC-012)
// 1M items, no scale plugin. scroll.mode "bounded" keeps the content element
// small (a viewport-multiple runway) and rebases a logical origin near edges.

import { createVList } from "vlist";
import { COUNT, ITEM_HEIGHT, makeItems, itemTemplate } from "../shared.js";

const items = makeItems(COUNT);

const list = createVList({
  container: "#list-container",
  ariaLabel: "Bounded list",
  items,
  scroll: { mode: "bounded" },
  item: {
    height: ITEM_HEIGHT,
    template: itemTemplate,
  },
}, []);

document.getElementById("btn-first")?.addEventListener("click", () => list.scrollToIndex(0, "start"));
document.getElementById("btn-middle")?.addEventListener("click", () => list.scrollToIndex(Math.floor(COUNT / 2), "start"));
document.getElementById("btn-last")?.addEventListener("click", () => list.scrollToIndex(COUNT - 1, "end"));

// Expose for the debug harness.
window.__vlist = list;
