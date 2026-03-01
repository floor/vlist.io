// Photo Album — Svelte variant
// Uses vlist-svelte action with declarative layout config
// Layout mode toggle: Grid ↔ Masonry

import { vlist, onVListEvent } from "vlist-svelte";
import { createStats } from "../../stats.js";
import {
  ITEM_COUNT,
  ASPECT_RATIO,
  items,
  itemTemplate,
  currentMode,
  currentOrientation,
  currentColumns,
  currentGap,
  list,
  setList,
  setCreateView,
} from "../shared.js";
import "../controls.js";

// =============================================================================
// Stats — shared footer (progress, velocity, visible/total)
// =============================================================================

function getEffectiveItemHeight() {
  const container = document.getElementById("grid-container");
  if (!container || !list) return 200;
  const innerWidth = container.clientWidth - 2;
  const colWidth =
    (innerWidth - (currentColumns - 1) * currentGap) / currentColumns;
  if (currentMode === "masonry") return Math.round(colWidth * 1.05);
  return Math.round(colWidth * ASPECT_RATIO);
}

const stats = createStats({
  getList: () => list,
  getTotal: () => ITEM_COUNT,
  getItemHeight: () => getEffectiveItemHeight(),
  container: "#grid-container",
});

// =============================================================================
// Create / Recreate
// =============================================================================

let action = null;
let firstVisibleIndex = 0;

function getItemConfig(mode, orientation) {
  if (mode === "masonry") {
    return {
      height: (_index, ctx) =>
        ctx ? Math.round(ctx.columnWidth * items[_index].aspectRatio) : 200,
      width:
        orientation === "horizontal"
          ? (_index, ctx) =>
              ctx
                ? Math.round(ctx.columnWidth * items[_index].aspectRatio)
                : 200
          : undefined,
      template: itemTemplate,
    };
  }

  // Grid mode
  if (orientation === "horizontal") {
    const container = document.getElementById("grid-container");
    const innerHeight = container.clientHeight - 2;
    const colWidth =
      (innerHeight - (currentColumns - 1) * currentGap) / currentColumns;

    return {
      height: Math.round(colWidth),
      width: (_index, ctx) =>
        ctx ? Math.round(ctx.columnWidth * (4 / 3)) : 200,
      template: itemTemplate,
    };
  }

  return {
    height: (_index, ctx) =>
      ctx ? Math.round(ctx.columnWidth * ASPECT_RATIO) : 200,
    template: itemTemplate,
  };
}

function createView() {
  // Destroy previous action
  if (action && action.destroy) {
    action.destroy();
    action = null;
    setList(null);
  }

  const container = document.getElementById("grid-container");
  container.innerHTML = "";

  const mode = currentMode;
  const orientation = currentOrientation;
  const columns = currentColumns;
  const gap = currentGap;

  const layoutConfig =
    mode === "masonry"
      ? { layout: "masonry", masonry: { columns, gap } }
      : { layout: "grid", grid: { columns, gap } };

  // Create vlist via Svelte action with declarative config
  action = vlist(container, {
    config: {
      ariaLabel: "Photo gallery",
      orientation,
      ...layoutConfig,
      item: getItemConfig(mode, orientation),
      items,
      scroll: {
        scrollbar: { autoHide: true },
      },
    },
    onInstance: (inst) => {
      setList(inst);

      // Wire events
      onVListEvent(inst, "scroll", () => stats.scheduleUpdate());
      onVListEvent(inst, "range:change", ({ range }) => {
        firstVisibleIndex =
          mode === "grid" ? range.start * columns : range.start;
        stats.scheduleUpdate();
      });
      onVListEvent(inst, "velocity:change", ({ velocity }) =>
        stats.onVelocity(velocity),
      );
      onVListEvent(inst, "item:click", ({ item }) => {
        showDetail(item);
      });

      // Restore scroll position to first visible item
      if (firstVisibleIndex > 0) {
        inst.scrollToIndex(firstVisibleIndex, "start");
      }

      stats.update();
      updateContext();
    },
  });
}

// Register createView so controls.js can call it
setCreateView(createView);

// =============================================================================
// Photo detail (panel)
// =============================================================================

const detailEl = document.getElementById("photo-detail");

function showDetail(item) {
  detailEl.innerHTML = `
    <img
      class="detail__img"
      src="https://picsum.photos/id/${item.picId}/400/300"
      alt="${item.title}"
    />
    <div class="detail__meta">
      <strong>${item.title}</strong>
      <span>${item.category} · ♥ ${item.likes}</span>
    </div>
  `;
}

// =============================================================================
// Footer — right side (contextual)
// =============================================================================

const ftMode = document.getElementById("ft-mode");
const ftOrientation = document.getElementById("ft-orientation");

function updateContext() {
  ftMode.textContent = currentMode;
  ftOrientation.textContent = currentOrientation;
}

// =============================================================================
// Initialise
// =============================================================================

createView();
