// Grid Photo Album — React
// Uses vlist/builder with withGrid + withScrollbar plugins
// Demonstrates a virtualized 2D photo gallery with React hooks

import { useState, useRef, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { vlist, withGrid, withScrollbar } from "vlist";

// =============================================================================
// Data Generation
// =============================================================================

const PHOTO_COUNT = 1084;
const ITEM_COUNT = 600;

const categories = [
  "Nature",
  "Urban",
  "Portrait",
  "Abstract",
  "Travel",
  "Food",
  "Animals",
  "Architecture",
  "Art",
  "Space",
];

const items = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const picId = i % PHOTO_COUNT;
  const category = categories[i % categories.length];
  return {
    id: i + 1,
    title: `Photo ${i + 1}`,
    category,
    likes: Math.floor(Math.random() * 500),
    picId,
  };
});

// =============================================================================
// Item Template
// =============================================================================

const itemTemplate = (item: (typeof items)[0]) => `
  <div class="card">
    <img
      class="card__img"
      src="https://picsum.photos/id/${item.picId}/300/225"
      alt="${item.title}"
      loading="lazy"
      decoding="async"
    />
    <div class="card__overlay">
      <span class="card__title">${item.title}</span>
      <span class="card__category">${item.category}</span>
    </div>
    <div class="card__likes">♥ ${item.likes}</div>
  </div>
`;

// =============================================================================
// App Component
// =============================================================================

function App() {
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">(
    "vertical",
  );
  const [columns, setColumns] = useState(4);
  const [gap, setGap] = useState(8);
  const [stats, setStats] = useState({
    domNodes: 0,
    rows: 0,
    saved: "0.0",
  });
  const [visibleRange, setVisibleRange] = useState("–");
  const [selectedPhoto, setSelectedPhoto] = useState<(typeof items)[0] | null>(
    null,
  );
  const [gridInfo, setGridInfo] = useState({
    orientation: "vertical" as "vertical" | "horizontal",
    columns: 4,
    gap: 8,
    rowHeight: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const statsRafRef = useRef<number | null>(null);

  // Update stats
  const updateStats = useCallback(() => {
    const domNodes = document.querySelectorAll(".vlist-item").length;
    const totalRows = Math.ceil(ITEM_COUNT / columns);
    const saved = ((1 - domNodes / ITEM_COUNT) * 100).toFixed(1);
    setStats({ domNodes, rows: totalRows, saved });
  }, [columns]);

  const scheduleStatsUpdate = useCallback(() => {
    if (statsRafRef.current) return;
    statsRafRef.current = requestAnimationFrame(() => {
      statsRafRef.current = null;
      updateStats();
    });
  }, [updateStats]);

  // Create/recreate list instance
  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy previous instance
    if (instanceRef.current) {
      instanceRef.current.destroy();
      instanceRef.current = null;
    }

    // Clear container
    containerRef.current.innerHTML = "";

    // Calculate row height from column width to maintain 4:3 aspect ratio
    const innerWidth = containerRef.current.clientWidth - 2; // account for border
    const colWidth = (innerWidth - (columns - 1) * gap) / columns;
    const height = Math.round(colWidth * 0.75);

    // Update grid info
    setGridInfo({ orientation, columns, gap, rowHeight: height });

    // Create new instance
    instanceRef.current = vlist({
      container: containerRef.current,
      ariaLabel: "Photo gallery",
      orientation,
      item: {
        height,
        width: orientation === "horizontal" ? colWidth : undefined,
        template: itemTemplate,
      },
      items,
    })
      .use(withGrid({ columns, gap }))
      .use(withScrollbar({ autoHide: true }))
      .build();

    // Bind events
    instanceRef.current.on("scroll", scheduleStatsUpdate);
    instanceRef.current.on("range:change", ({ range }: any) => {
      setVisibleRange(`rows ${range.start} – ${range.end}`);
      scheduleStatsUpdate();
    });
    instanceRef.current.on("item:click", ({ item }: any) => {
      setSelectedPhoto(item);
    });

    updateStats();

    // Cleanup
    return () => {
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, [orientation, columns, gap, updateStats, scheduleStatsUpdate]);

  // Navigation helpers
  const scrollToFirst = useCallback(() => {
    instanceRef.current?.scrollToIndex(0, "start");
  }, []);

  const scrollToMiddle = useCallback(() => {
    instanceRef.current?.scrollToIndex(Math.floor(ITEM_COUNT / 2), "center");
  }, []);

  const scrollToLast = useCallback(() => {
    instanceRef.current?.scrollToIndex(ITEM_COUNT - 1, "end");
  }, []);

  return (
    <div className="container">
      <header>
        <h1>Builder · Grid</h1>
        <p className="description">
          Composable entry point – <code>vlist/builder</code> with{" "}
          <code>withGrid</code> + <code>withScrollbar</code> plugins.
          Virtualized 2D photo gallery with real images from Lorem Picsum.
          Configurable columns and gap — only visible rows are rendered.
        </p>
      </header>

      <div className="stats">
        <strong>Photos:</strong> {ITEM_COUNT} · <strong>Rows:</strong>{" "}
        {stats.rows} · <strong>DOM:</strong> {stats.domNodes} ·{" "}
        <strong>Virtualized:</strong> {stats.saved}%
      </div>

      <div className="grid-info">
        <strong>Orientation:</strong> {gridInfo.orientation} ·{" "}
        <strong>Columns:</strong> {gridInfo.columns} · <strong>Gap:</strong>{" "}
        {gridInfo.gap}px · <strong>Row height:</strong> {gridInfo.rowHeight}px ·{" "}
        <strong>Aspect:</strong> 4:3
      </div>

      <div className="split-layout">
        <div className="split-main">
          <div ref={containerRef} id="grid-container" />
        </div>

        <aside className="split-panel">
          {/* Grid Controls */}
          <section className="panel-section">
            <h3 className="panel-title">Grid</h3>

            <div className="panel-row">
              <label className="panel-label">Orientation</label>
              <div className="panel-btn-group">
                {(["vertical", "horizontal"] as const).map((orient) => (
                  <button
                    key={orient}
                    data-orientation={orient}
                    className={`ctrl-btn ${orient === orientation ? "ctrl-btn--active" : ""}`}
                    onClick={() => setOrientation(orient)}
                  >
                    {orient === "vertical" ? "Vertical" : "Horizontal"}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel-row">
              <label className="panel-label">Columns</label>
              <div className="panel-btn-group">
                {[2, 3, 4, 5, 6].map((cols) => (
                  <button
                    key={cols}
                    data-cols={cols}
                    className={`ctrl-btn ${cols === columns ? "ctrl-btn--active" : ""}`}
                    onClick={() => setColumns(cols)}
                  >
                    {cols}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel-row">
              <label className="panel-label">Gap</label>
              <div className="panel-btn-group">
                {[0, 4, 8, 12, 16].map((gapValue) => (
                  <button
                    key={gapValue}
                    data-gap={gapValue}
                    className={`ctrl-btn ${gapValue === gap ? "ctrl-btn--active" : ""}`}
                    onClick={() => setGap(gapValue)}
                  >
                    {gapValue}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Navigation */}
          <section className="panel-section">
            <h3 className="panel-title">Navigation</h3>
            <div className="panel-row">
              <label className="panel-label">Quick jump</label>
              <div className="panel-btn-group">
                <button className="panel-btn" onClick={scrollToFirst}>
                  First
                </button>
                <button className="panel-btn" onClick={scrollToMiddle}>
                  Middle
                </button>
                <button className="panel-btn" onClick={scrollToLast}>
                  Last
                </button>
              </div>
            </div>
            <div className="panel-row">
              <span className="panel-label">Range</span>
              <span className="panel-value">{visibleRange}</span>
            </div>
          </section>

          {/* Photo Detail */}
          <section className="panel-section">
            <h3 className="panel-title">Last clicked</h3>
            <div className="panel-detail">
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
                <span className="panel-detail__empty">
                  Click a photo to see details
                </span>
              )}
            </div>
          </section>
        </aside>
      </div>

      <footer>
        <p>
          The builder's <code>withGrid</code> plugin replaces the list renderer
          with a grid renderer. The virtualizer works in row-space — it only
          materializes DOM for visible rows. Column width auto-adjusts on
          resize. 📸
        </p>
      </footer>
    </div>
  );
}

// =============================================================================
// Mount
// =============================================================================

const root = document.getElementById("react-root");
if (root) {
  createRoot(root).render(<App />);
}
