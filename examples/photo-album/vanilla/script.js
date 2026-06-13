// Photo Album — Virtualized 2D photo gallery
// Demonstrates grid + masonry + scrollbar plugins
// Layout mode toggle: Grid ↔ Masonry

import {
  createVList,
  grid,
  groups,
  masonry,
  scrollbar,
  selection,
} from "vlist";
import { createStats } from "../../stats.js";
import { createInfoUpdater } from "../../info.js";
import {
  ITEM_COUNT,
  ASPECT_RATIO,
  items,
  itemTemplate,
  currentMode,
  currentOrientation,
  currentColumns,
  currentGap,
  followFocus,
  useGroups,
  list,
  setFactory,
  onReady,
  createView,
} from "../shared.js";
import "../controls.js";

const PADDING = 2;
const GROUP_HEADER_HEIGHT = 32;

function groupsPlugin() {
  if (!useGroups) return null;
  return groups({
    getGroupForIndex: (index, item) => item?.month ?? "…",
    header: {
      height: GROUP_HEADER_HEIGHT,
      template: (key) => key,
    },
    sticky: true,
  });
}

// =============================================================================
// Stats — shared info bar (progress, velocity, visible/total)
// =============================================================================

function getEffectiveItemHeight() {
  const container = document.getElementById("list-container");
  if (!container || !list) return 200;
  const innerWidth = container.clientWidth - PADDING * 2;
  const colWidth =
    (innerWidth - (currentColumns - 1) * currentGap) / currentColumns;
  if (currentMode === "masonry") return Math.round(colWidth * 1.05);
  return Math.round(colWidth * ASPECT_RATIO);
}

export const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => ITEM_COUNT,
  getItemSize: () => getEffectiveItemHeight(),
  getColumns: () => currentColumns,
  getContainerSize: () => {
    const el = document.querySelector("#list-container");
    if (!el) return 0;
    return currentOrientation === "horizontal"
      ? el.clientWidth
      : el.clientHeight;
  },
});

const updateInfo = createInfoUpdater(stats);

// =============================================================================
// Create / Recreate
// =============================================================================

setFactory(
  (snap) => {
    const container = document.getElementById("list-container");

    if (currentMode === "grid") {
      return createGridView(
        container,
        currentOrientation,
        currentColumns,
        currentGap,
        snap,
      );
    }
    return createMasonryView(
      container,
      currentOrientation,
      currentColumns,
      currentGap,
      snap,
    );
  },
  {
    key: "photo-album",
    transition: 250,
  },
);

onReady((list) => {
  list.on("scroll", updateInfo);
  list.on("range:change", updateInfo);
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });
  list.on("selection:change", ({ items: selected }) => {
    if (selected.length > 0) showDetail(selected[0]);
  });

  updateInfo();
  updateContext();
});

function createGridView(container, orientation, columns, gap, snap) {
  if (orientation === "horizontal") {
    const innerHeight = container.clientHeight - PADDING * 2;
    const colWidth = (innerHeight - (columns - 1) * gap) / columns;
    const height = Math.round(colWidth);

    const gp = groupsPlugin();
    return createVList(
      {
        padding: PADDING,
        container: "#list-container",
        ariaLabel: "Photo gallery",
        orientation,
        item: {
          height,
          width: (_index, ctx) =>
            ctx ? Math.round(ctx.columnWidth / ASPECT_RATIO) : 200,
          template: itemTemplate,
        },
        items,
      },
      [
        grid({ columns, gap }),
        ...(gp ? [gp] : []),
        selection({ mode: "single", followFocus }),
        scrollbar({ autoHide: true }),
        snap,
      ],
    );
  }

  const gp = groupsPlugin();
  return createVList(
    {
      padding: PADDING,
      container: "#list-container",
      ariaLabel: "Photo gallery",
      orientation,
      item: {
        height: (_index, ctx) =>
          ctx ? Math.round(ctx.columnWidth * ASPECT_RATIO) : 200,
        template: itemTemplate,
      },
      items,
    },
    [
      grid({ columns, gap }),
      ...(gp ? [gp] : []),
      selection({ mode: "single", followFocus }),
      scrollbar({ autoHide: true }),
      snap,
    ],
  );
}

function createMasonryView(container, orientation, columns, gap, snap) {
  const gp = groupsPlugin();
  return createVList(
    {
      container: "#list-container",
      ariaLabel: "Photo gallery",
      orientation,
      padding: PADDING,
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
    },
    [
      masonry({ columns, gap }),
      ...(gp ? [gp] : []),
      selection({ mode: "single", followFocus }),
      scrollbar({ autoHide: true }),
      snap,
    ],
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
      <span>${item.month} · ${item.category} · ♥ ${item.likes}</span>
    </div>
  `;
}

// =============================================================================
// Info bar — right side (contextual)
// =============================================================================

const infoMode = document.getElementById("info-mode");
const infoOrientation = document.getElementById("info-orientation");

function updateContext() {
  infoMode.textContent = currentMode;
  infoOrientation.textContent = currentOrientation === "vertical" ? "Y" : "X";
}

// =============================================================================
// Initialise
// =============================================================================

createView();
