// Photo Album — React variant
// Uses useVList hook from vlist-react with declarative layout config
// Layout mode toggle: Grid ↔ Masonry

import { useState, useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useVList, useVListEvent } from "vlist-react";
import { ITEM_COUNT, ASPECT_RATIO, items, itemTemplate } from "../shared.js";
import { createStats } from "../../stats.js";
import { createInfoUpdater } from "../../info.js";

// =============================================================================
// Stats (module-level — shared across remounts)
// =============================================================================

let statsInstance: ReturnType<typeof createStats> | null = null;
let infoUpdater: (() => void) | null = null;

// =============================================================================
// Grid Container — keyed component that remounts on config change
// =============================================================================

function GridContainer({
  mode,
  orientation,
  columns,
  gap,
  onItem,
}: {
  mode: "grid" | "masonry";
  orientation: "vertical" | "horizontal";
  columns: number;
  gap: number;
  onItem: (item: any) => void;
}) {
  const itemConfig = getItemConfig(mode, orientation, columns, gap);

  const layoutConfig =
    mode === "masonry"
      ? { layout: "masonry" as const, masonry: { columns, gap } }
      : { layout: "grid" as const, grid: { columns, gap } };

  const { containerRef, instanceRef } = useVList({
    ariaLabel: "Photo gallery",
    orientation,
    ...layoutConfig,
    item: itemConfig,
    items,
    scroll: {
      scrollbar: { autoHide: true },
    },
  });

  // Wire stats
  useEffect(() => {
    if (!statsInstance) {
      statsInstance = createStats({
        getScrollPosition: () => instanceRef.current?.getScrollPosition() ?? 0,
        getTotal: () => ITEM_COUNT,
        getItemSize: () => {
          const el = document.getElementById("grid-container");
          if (!el) return 200;
          const innerWidth = el.clientWidth - 2;
          const colW = (innerWidth - (columns - 1) * gap) / columns;
          return mode === "masonry"
            ? Math.round(colW * 1.05)
            : Math.round(colW * ASPECT_RATIO);
        },
        getColumns: () => columns,
        getContainerSize: () => {
          const el = document.getElementById("grid-container");
          if (!el) return 0;
          return orientation === "horizontal"
            ? el.clientWidth
            : el.clientHeight;
        },
      });
    }
    if (!infoUpdater) {
      infoUpdater = createInfoUpdater(statsInstance);
    }
    infoUpdater();
  }, []);

  useVListEvent(instanceRef, "scroll", () => {
    infoUpdater?.();
  });

  useVListEvent(instanceRef, "range:change", () => {
    infoUpdater?.();
  });

  useVListEvent(instanceRef, "velocity:change", ({ velocity }) => {
    statsInstance?.onVelocity(velocity);
    infoUpdater?.();
  });

  useVListEvent(instanceRef, "item:click", ({ item }) => {
    onItem(item);
  });

  return <div ref={containerRef} id="grid-container" />;
}

// =============================================================================
// Item config helper
// =============================================================================

function getItemConfig(
  mode: string,
  orientation: string,
  columns: number,
  gap: number,
) {
  if (mode === "masonry") {
    return {
      height: (_index: number, ctx: any) =>
        ctx ? Math.round(ctx.columnWidth * items[_index].aspectRatio) : 200,
      width:
        orientation === "horizontal"
          ? (_index: number, ctx: any) =>
              ctx
                ? Math.round(ctx.columnWidth * items[_index].aspectRatio)
                : 200
          : undefined,
      template: itemTemplate,
    };
  }

  // Grid — horizontal needs fixed cross-axis height
  if (orientation === "horizontal") {
    return {
      height: 200, // will be overridden by grid renderer
      width: (_index: number, ctx: any) =>
        ctx ? Math.round(ctx.columnWidth * (4 / 3)) : 200,
      template: itemTemplate,
    };
  }

  return {
    height: (_index: number, ctx: any) =>
      ctx ? Math.round(ctx.columnWidth * ASPECT_RATIO) : 200,
    template: itemTemplate,
  };
}

// =============================================================================
// App Component
// =============================================================================

function App() {
  const [mode, setMode] = useState<"grid" | "masonry">("grid");
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">(
    "vertical",
  );
  const [columns, setColumns] = useState(4);
  const [gap, setGap] = useState(8);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  // Key forces full remount when layout config changes
  const listKey = `${mode}-${orientation}-${columns}-${gap}`;

  // Update info bar context
  useEffect(() => {
    const infoMode = document.getElementById("info-mode");
    const infoOrientation = document.getElementById("info-orientation");
    if (infoMode) infoMode.textContent = mode;
    if (infoOrientation) infoOrientation.textContent = orientation;
  }, [mode, orientation]);

  const scrollTo = useCallback((target: "first" | "middle" | "last") => {
    const el = document.querySelector("#grid-container .vlist-viewport");
    if (!el) return;
    // Access instance via DOM — the useVList hook manages it internally
    const idx =
      target === "first"
        ? 0
        : target === "middle"
          ? Math.floor(ITEM_COUNT / 2)
          : ITEM_COUNT - 1;
    // Use the instance ref from the child — we need a different approach
    // Dispatch a custom event that the container can listen for
    window.dispatchEvent(
      new CustomEvent("photo-album:scroll-to", { detail: { index: idx } }),
    );
  }, []);

  return (
    <div className="container">
      <header>
        <h1>Photo Album</h1>
        <p className="description">
          Virtualized 2D photo gallery with real images from Lorem Picsum.
          Toggle between grid and masonry layouts, adjust columns and gap — only
          visible rows are rendered.
        </p>
      </header>

      <div className="split-layout">
        <div className="split-main split-main--full">
          <h2 className="sr-only">Photos</h2>
          <GridContainer
            key={listKey}
            mode={mode}
            orientation={orientation}
            columns={columns}
            gap={gap}
            onItem={setSelectedPhoto}
          />
        </div>

        <aside className="split-panel">
          {/* Layout */}
          <section className="ui-section">
            <h3 className="ui-title">Layout</h3>

            <div className="ui-row">
              <label className="ui-label">Mode</label>
              <div className="ui-segmented">
                {(["grid", "masonry"] as const).map((m) => (
                  <button
                    key={m}
                    className={`ui-segmented__btn${m === mode ? " ui-segmented__btn--active" : ""}`}
                    onClick={() => setMode(m)}
                  >
                    {m === "grid" ? "Grid" : "Masonry"}
                  </button>
                ))}
              </div>
            </div>

            <div className="ui-row">
              <label className="ui-label">Orientation</label>
              <div className="ui-segmented">
                {(["vertical", "horizontal"] as const).map((o) => (
                  <button
                    key={o}
                    className={`ui-segmented__btn${o === orientation ? " ui-segmented__btn--active" : ""}`}
                    onClick={() => setOrientation(o)}
                  >
                    {o === "vertical" ? "Vertical" : "Horizontal"}
                  </button>
                ))}
              </div>
            </div>

            <div className="ui-row">
              <label className="ui-label">
                {orientation === "horizontal" ? "Rows" : "Columns"}
              </label>
              <div className="ui-btn-group">
                {[3, 4, 5, 6, 10].map((c) => (
                  <button
                    key={c}
                    className={`ui-ctrl-btn${c === columns ? " ui-ctrl-btn--active" : ""}`}
                    onClick={() => setColumns(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="ui-row">
              <label className="ui-label">Gap</label>
              <div className="ui-btn-group">
                {[0, 4, 8, 12, 16].map((g) => (
                  <button
                    key={g}
                    className={`ui-ctrl-btn${g === gap ? " ui-ctrl-btn--active" : ""}`}
                    onClick={() => setGap(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Navigation */}
          <section className="ui-section">
            <h3 className="ui-title">Navigation</h3>
            <div className="ui-row">
              <div className="ui-btn-group">
                <button
                  className="ui-btn ui-btn--icon"
                  title="First"
                  onClick={() => scrollTo("first")}
                >
                  <i className="icon icon--up" />
                </button>
                <button
                  className="ui-btn ui-btn--icon"
                  title="Middle"
                  onClick={() => scrollTo("middle")}
                >
                  <i className="icon icon--center" />
                </button>
                <button
                  className="ui-btn ui-btn--icon"
                  title="Last"
                  onClick={() => scrollTo("last")}
                >
                  <i className="icon icon--down" />
                </button>
              </div>
            </div>
          </section>

          {/* Photo Detail */}
          <section className="ui-section">
            <h3 className="ui-title">Last clicked</h3>
            <div className="ui-detail">
              {selectedPhoto ? (
                <>
                  <img
                    className="detail__img"
                    src={`https://picsum.photos/id/${selectedPhoto.picId}/400/300`}
                    alt={selectedPhoto.title}
                  />
                  <div className="detail__meta">
                    <strong>{selectedPhoto.title}</strong>
                    <span>
                      {selectedPhoto.category} · ♥ {selectedPhoto.likes}
                    </span>
                  </div>
                </>
              ) : (
                <span className="ui-detail__empty">
                  Click a photo to see details
                </span>
              )}
            </div>
          </section>
        </aside>
      </div>

      <div className="example-info" id="example-info">
        <div className="example-info__left">
          <span className="example-info__stat">
            <strong id="info-progress">0%</strong>
          </span>
          <span className="example-info__stat">
            <span id="info-velocity">0.00</span> /{" "}
            <strong id="info-velocity-avg">0.00</strong>
            <span className="example-info__unit">px/ms</span>
          </span>
          <span className="example-info__stat">
            <span id="info-dom">0</span> / <strong id="info-total">0</strong>
            <span className="example-info__unit">items</span>
          </span>
        </div>
        <div className="example-info__right">
          <span className="example-info__stat">
            <strong id="info-mode">grid</strong>
          </span>
          <span className="example-info__stat">
            <strong id="info-orientation">vertical</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Mount
// =============================================================================

createRoot(document.getElementById("react-root")!).render(<App />);
