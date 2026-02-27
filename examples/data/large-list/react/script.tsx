// Large List — React implementation with useVList hook
// Uses builder pattern with compression + scrollbar plugins
// Demonstrates handling 100K–5M items with automatic scroll compression

import { useState, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useVList, useVListEvent } from "vlist-react";
import type { VList } from "@floor/vlist";

// =============================================================================
// Constants
// =============================================================================

const ITEM_HEIGHT = 48;
const SIZES = {
  "100k": 100_000,
  "500k": 500_000,
  "1m": 1_000_000,
  "2m": 2_000_000,
  "5m": 5_000_000,
} as const;

type SizeKey = keyof typeof SIZES;

const COLORS = [
  "#667eea",
  "#764ba2",
  "#f093fb",
  "#f5576c",
  "#4facfe",
  "#43e97b",
  "#fa709a",
  "#fee140",
];

// =============================================================================
// Utilities
// =============================================================================

// Simple hash for consistent per-item values
const hash = (n: number): number => {
  let h = (n + 1) * 2654435761;
  h ^= h >>> 16;
  return Math.abs(h);
};

// Generate items on the fly
const generateItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    value: hash(i) % 100,
    hash: hash(i).toString(16).slice(0, 8).toUpperCase(),
    color: COLORS[i % COLORS.length],
  }));

// Item template
const itemTemplate = (
  item: ReturnType<typeof generateItems>[0],
  index: number,
) => `
  <div class="item-row">
    <div class="item-color" style="background:${item.color}"></div>
    <div class="item-info">
      <span class="item-label">#${(index + 1).toLocaleString()}</span>
      <span class="item-hash">${item.hash}</span>
    </div>
    <div class="item-bar-wrap">
      <div class="item-bar" style="width:${item.value}%;background:${item.color}"></div>
    </div>
    <span class="item-value">${item.value}%</span>
  </div>
`;

// =============================================================================
// App Component
// =============================================================================

function App() {
  const [currentSize, setCurrentSize] = useState<SizeKey>("1m");
  const [items, setItems] = useState(() => generateItems(SIZES["1m"]));
  const [stats, setStats] = useState({
    total: SIZES["1m"],
    dom: 0,
    genTime: 0,
    buildTime: 0,
  });
  const [viewport, setViewport] = useState({
    scrollPos: 0,
    direction: "–" as string,
    range: "–" as string,
  });
  const [compression, setCompression] = useState({
    isCompressed: false,
    virtualHeight: 0,
    ratio: "1.0",
  });

  const startTimeRef = useRef(0);

  // Initialize vlist with builder pattern
  const { containerRef, instanceRef } = useVList({
    ariaLabel: `${SIZES[currentSize].toLocaleString()} items list`,
    item: {
      height: ITEM_HEIGHT,
      template: itemTemplate,
    },
    items,
    plugins: [
      {
        name: "compression",
        config: {},
      },
      {
        name: "scrollbar",
        config: { autoHide: true },
      },
    ],
  });

  // Track scroll events
  useVListEvent(instanceRef, "scroll", ({ scrollTop, direction }) => {
    setViewport((prev) => ({
      ...prev,
      scrollPos: Math.round(scrollTop),
      direction: direction === "up" ? "↑ up" : "↓ down",
    }));
  });

  // Track range changes
  useVListEvent(instanceRef, "range:change", ({ range }) => {
    const domNodes = range.end - range.start + 1;
    setStats((prev) => ({ ...prev, dom: domNodes }));
    setViewport((prev) => ({
      ...prev,
      range: `${range.start.toLocaleString()} – ${range.end.toLocaleString()}`,
    }));
  });

  // Update compression info when size changes
  const updateCompressionInfo = useCallback((count: number) => {
    const totalHeight = count * ITEM_HEIGHT;
    const maxHeight = 16_777_216; // browser limit ~16.7M px
    const isCompressed = totalHeight > maxHeight;
    const ratio = isCompressed ? (totalHeight / maxHeight).toFixed(1) : "1.0";

    setCompression({
      isCompressed,
      virtualHeight: totalHeight,
      ratio,
    });
  }, []);

  // Handle size change
  const handleSizeChange = useCallback(
    (size: SizeKey) => {
      const count = SIZES[size];
      startTimeRef.current = performance.now();
      const newItems = generateItems(count);
      const genTime = performance.now() - startTimeRef.current;

      setCurrentSize(size);
      setItems(newItems);
      setStats({
        total: count,
        dom: 0,
        genTime,
        buildTime: performance.now() - startTimeRef.current,
      });
      updateCompressionInfo(count);
    },
    [updateCompressionInfo],
  );

  // Navigation handlers
  const scrollToFirst = () => {
    instanceRef.current?.scrollToIndex(0, "start");
  };

  const scrollToMiddle = () => {
    instanceRef.current?.scrollToIndex(
      Math.floor(SIZES[currentSize] / 2),
      "center",
    );
  };

  const scrollToLast = () => {
    instanceRef.current?.scrollToIndex(SIZES[currentSize] - 1, "end");
  };

  const scrollToRandom = () => {
    const idx = Math.floor(Math.random() * SIZES[currentSize]);
    instanceRef.current?.scrollToIndex(idx, "center");
    setScrollIndex(idx);
  };

  const [scrollIndex, setScrollIndex] = useState(0);
  const [scrollAlign, setScrollAlign] = useState<"start" | "center" | "end">(
    "start",
  );

  const handleGoToIndex = () => {
    instanceRef.current?.scrollToIndex(
      Math.max(0, Math.min(scrollIndex, SIZES[currentSize] - 1)),
      scrollAlign,
    );
  };

  const handleSmoothTop = () => {
    instanceRef.current?.scrollToIndex(0, {
      align: "start",
      behavior: "smooth",
      duration: 800,
    });
  };

  const handleSmoothBottom = () => {
    instanceRef.current?.scrollToIndex(SIZES[currentSize] - 1, {
      align: "end",
      behavior: "smooth",
      duration: 800,
    });
  };

  // Calculate virtualization percentage
  const virtualized =
    stats.total > 0 && stats.dom > 0
      ? ((1 - stats.dom / stats.total) * 100).toFixed(4)
      : "0.0000";

  return (
    <div className="container container--wide">
      <header>
        <h1>Large List</h1>
        <p className="description">
          React implementation with <code>useVList</code> hook +{" "}
          <code>withScale</code> + <code>withScrollbar</code> plugins. Handles
          100K–5M items with automatic scroll scaling when total height exceeds
          the browser's 16.7M pixel limit.
        </p>
      </header>

      <div className="stats" id="stats">
        <strong>Total:</strong> {stats.total.toLocaleString()}
        {" · "}
        <strong>DOM:</strong> {stats.dom}
        {" · "}
        <strong>Virtualized:</strong> {virtualized}%
        {stats.genTime > 0 && (
          <>
            {" · "}
            <strong>Gen:</strong> {stats.genTime.toFixed(0)}ms
          </>
        )}
        {stats.buildTime > 0 && (
          <>
            {" · "}
            <strong>Build:</strong> {stats.buildTime.toFixed(0)}ms
          </>
        )}
      </div>

      <div className="compression-bar" id="compression-info">
        <span
          className={`compression-badge ${
            compression.isCompressed
              ? "compression-badge--active"
              : "compression-badge--off"
          }`}
        >
          {compression.isCompressed ? "COMPRESSED" : "NATIVE"}
        </span>
        <span className="compression-detail">
          Virtual height:{" "}
          <strong>
            {(compression.virtualHeight / 1_000_000).toFixed(1)}M px
          </strong>
          {" · "}
          Ratio: <strong>{compression.ratio}×</strong>
          {" · "}
          Limit: <strong>16.7M px</strong>
        </span>
      </div>

      <div className="split-layout">
        <div className="split-main">
          <div ref={containerRef} id="list-container" />
        </div>

        <aside className="split-panel">
          {/* Size */}
          <section className="panel-section">
            <h3 className="panel-title">Size</h3>
            <div className="panel-row">
              <div className="panel-segmented">
                {(Object.keys(SIZES) as SizeKey[]).map((size) => (
                  <button
                    key={size}
                    className={`panel-segmented__btn ${currentSize === size ? "panel-segmented__btn--active" : ""}`}
                    onClick={() => handleSizeChange(size)}
                  >
                    {size.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Navigation */}
          <section className="panel-section">
            <h3 className="panel-title">Navigation</h3>

            <div className="panel-row">
              <label className="panel-label" htmlFor="scroll-index">
                Scroll to index
              </label>
              <div className="panel-input-group">
                <input
                  type="number"
                  id="scroll-index"
                  min="0"
                  value={scrollIndex}
                  onChange={(e) =>
                    setScrollIndex(parseInt(e.target.value, 10) || 0)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGoToIndex();
                    }
                  }}
                  className="panel-input"
                />
                <select
                  id="scroll-align"
                  value={scrollAlign}
                  onChange={(e) => setScrollAlign(e.target.value as any)}
                  className="panel-select"
                >
                  <option value="start">start</option>
                  <option value="center">center</option>
                  <option value="end">end</option>
                </select>
                <button
                  onClick={handleGoToIndex}
                  className="panel-btn panel-btn--icon"
                  title="Go"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="panel-row">
              <label className="panel-label">Quick jump</label>
              <div className="panel-btn-group">
                <button onClick={scrollToFirst} className="panel-btn">
                  First
                </button>
                <button onClick={scrollToMiddle} className="panel-btn">
                  Middle
                </button>
                <button onClick={scrollToLast} className="panel-btn">
                  Last
                </button>
                <button onClick={scrollToRandom} className="panel-btn">
                  Random
                </button>
              </div>
            </div>

            <div className="panel-row">
              <label className="panel-label">Smooth scroll</label>
              <div className="panel-btn-group">
                <button onClick={handleSmoothTop} className="panel-btn">
                  ↑ Top
                </button>
                <button onClick={handleSmoothBottom} className="panel-btn">
                  ↓ Bottom
                </button>
              </div>
            </div>
          </section>

          {/* Viewport */}
          <section className="panel-section">
            <h3 className="panel-title">Viewport</h3>
            <div className="panel-row">
              <span className="panel-label">Scroll</span>
              <span className="panel-value">
                {viewport.scrollPos.toLocaleString()}px
              </span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Direction</span>
              <span className="panel-value">{viewport.direction}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Range</span>
              <span className="panel-value">{viewport.range}</span>
            </div>
          </section>
        </aside>
      </div>

      <footer>
        <p>
          Compression activates automatically when the virtual height exceeds
          ~16.7 million pixels. The React hook integrates seamlessly with the
          builder's plugin system — compression logic is only loaded when you
          configure the <code>compression</code> plugin. ⚛️
        </p>
      </footer>
    </div>
  );
}

// =============================================================================
// Mount
// =============================================================================

createRoot(document.getElementById("react-root")!).render(<App />);
