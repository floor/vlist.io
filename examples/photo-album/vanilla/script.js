// Photo Album — Virtualized 2D photo gallery
// Demonstrates withGrid + withMasonry + withScrollbar plugins
// Layout mode toggle: Grid ↔ Masonry

import { vlist, withGrid, withMasonry, withScrollbar } from "vlist";
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

export const stats = createStats({
  getList: () => list,
  getTotal: () => ITEM_COUNT,
  getItemHeight: () => getEffectiveItemHeight(),
  container: "#grid-container",
});

// =============================================================================
// Create / Recreate
// =============================================================================

let firstVisibleIndex = 0;

function createView() {
  if (list) {
    list.destroy();
    setList(null);
  }

  const container = document.getElementById("grid-container");
  container.innerHTML = "";

  const orientation = currentOrientation;
  const columns = currentColumns;
  const gap = currentGap;

  if (currentMode === "grid") {
    createGridView(container, orientation, columns, gap);
  } else {
    createMasonryView(container, orientation, columns, gap);
  }

  // Wire events
  list.on("scroll", stats.scheduleUpdate);
  list.on("range:change", ({ range }) => {
    firstVisibleIndex =
      currentMode === "grid" ? range.start * currentColumns : range.start;
    stats.scheduleUpdate();
  });
  list.on("velocity:change", ({ velocity }) => stats.onVelocity(velocity));

  list.on("item:click", ({ item }) => {
    showDetail(item);
  });

  // Restore scroll position to first visible item
  if (firstVisibleIndex > 0) {
    list.scrollToIndex(firstVisibleIndex, "start");
  }

  stats.update();
  updateContext();
}

// Register createView so controls.js can call it
setCreateView(createView);

function createGridView(container, orientation, columns, gap) {
  if (orientation === "horizontal") {
    const innerHeight = container.clientHeight - 2;
    const colWidth = (innerHeight - (columns - 1) * gap) / columns;
    const height = Math.round(colWidth);

    setList(
      vlist({
        container: "#grid-container",
        ariaLabel: "Photo gallery",
        orientation,
        item: {
          height,
          width: (_index, ctx) =>
            ctx ? Math.round(ctx.columnWidth * (4 / 3)) : 200,
          template: itemTemplate,
        },
        items,
      })
        .use(withGrid({ columns, gap }))
        .use(withScrollbar({ autoHide: true }))
        .build(),
    );
  } else {
    setList(
      vlist({
        container: "#grid-container",
        ariaLabel: "Photo gallery",
        orientation,
        item: {
          height: (_index, ctx) =>
            ctx ? Math.round(ctx.columnWidth * ASPECT_RATIO) : 200,
          template: itemTemplate,
        },
        items,
      })
        .use(withGrid({ columns, gap }))
        .use(withScrollbar({ autoHide: true }))
        .build(),
    );
  }
}

function createMasonryView(container, orientation, columns, gap) {
  setList(
    vlist({
      container: "#grid-container",
      ariaLabel: "Photo gallery",
      orientation,
      item: {
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
      },
      items,
    })
      .use(withMasonry({ columns, gap }))
      .use(withScrollbar({ autoHide: true }))
      .build(),
  );
}

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
