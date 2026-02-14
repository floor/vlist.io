// Controls — React implementation with useVList hook
// Interactive control panel demonstrating vlist's navigation, selection, and viewport APIs

import { useState, useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { createVList } from "vlist";
import {
  TOTAL,
  items,
  itemTemplate,
  formatSelectionCount,
  calculateMemorySaved,
} from "../shared.js";

// =============================================================================
// App Component
// =============================================================================

type SelectionMode = "none" | "single" | "multiple";

function App() {
  // State
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("single");
  const [scrollIndex, setScrollIndex] = useState(0);
  const [scrollAlign, setScrollAlign] = useState<"start" | "center" | "end">(
    "start",
  );
  const [stats, setStats] = useState({
    domNodes: 0,
    memorySaved: 0,
  });
  const [viewport, setViewport] = useState({
    scrollPos: 0,
    direction: "–" as string,
    range: "–" as string,
  });
  const [selection, setSelection] = useState<number[]>([]);
  const [lastClicked, setLastClicked] = useState<{
    item: (typeof items)[0];
    index: number;
  } | null>(null);

  // Initialize vlist with manual instance management
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  // Create/recreate vlist instance when selection mode changes
  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy existing instance
    if (instanceRef.current) {
      instanceRef.current.destroy();
    }

    // Create new instance with current selection mode
    instanceRef.current = createVList({
      container: containerRef.current,
      ariaLabel: "User list",
      selection: { mode: selectionMode },
      item: {
        height: 64,
        template: itemTemplate,
      },
      items,
    });

    // Track scroll events
    instanceRef.current.on("scroll", ({ scrollTop, direction }: any) => {
      setViewport((prev) => ({
        ...prev,
        scrollPos: Math.round(scrollTop),
        direction: direction === "up" ? "↑ up" : "↓ down",
      }));
    });

    // Track range changes
    instanceRef.current.on("range:change", ({ range }: any) => {
      const domNodes = range.end - range.start + 1;
      const saved = calculateMemorySaved(domNodes, TOTAL);

      setStats({ domNodes, memorySaved: saved });
      setViewport((prev) => ({
        ...prev,
        range: `${range.start.toLocaleString()} – ${range.end.toLocaleString()}`,
      }));
    });

    // Track selection changes
    instanceRef.current.on("selection:change", ({ selected }: any) => {
      setSelection(selected);
    });

    // Track item clicks
    instanceRef.current.on("item:click", ({ item, index }: any) => {
      setLastClicked({ item, index });
      setScrollIndex(index);
    });

    // Cleanup
    return () => {
      if (instanceRef.current) {
        instanceRef.current.destroy();
      }
    };
  }, [selectionMode]);

  // Navigation handlers
  const handleGoToIndex = () => {
    instanceRef.current?.scrollToIndex(
      Math.max(0, Math.min(scrollIndex, TOTAL - 1)),
      scrollAlign,
    );
  };

  const scrollToFirst = () => {
    instanceRef.current?.scrollToIndex(0, "start");
  };

  const scrollToMiddle = () => {
    instanceRef.current?.scrollToIndex(Math.floor(TOTAL / 2), "center");
  };

  const scrollToLast = () => {
    instanceRef.current?.scrollToIndex(TOTAL - 1, "end");
  };

  const scrollToRandom = () => {
    const idx = Math.floor(Math.random() * TOTAL);
    instanceRef.current?.scrollToIndex(idx, "center");
    setScrollIndex(idx);
  };

  const handleSmoothTop = () => {
    instanceRef.current?.scrollToIndex(0, {
      align: "start",
      behavior: "smooth",
      duration: 600,
    });
  };

  const handleSmoothBottom = () => {
    instanceRef.current?.scrollToIndex(TOTAL - 1, {
      align: "end",
      behavior: "smooth",
      duration: 600,
    });
  };

  // Selection handlers
  const handleSelectionModeChange = (mode: SelectionMode) => {
    setSelectionMode(mode);
    setSelection([]);
    setLastClicked(null);
  };

  const handleSelectAll = () => {
    if (selectionMode !== "multiple") {
      setSelectionMode("multiple");
      // Defer selectAll() until after useEffect recreates the instance
      setTimeout(() => {
        instanceRef.current?.selectAll();
      }, 10);
    } else {
      instanceRef.current?.selectAll();
    }
  };

  const handleClearSelection = () => {
    instanceRef.current?.clearSelection();
  };

  return (
    <div className="container container--wide">
      <header>
        <h1>Controls</h1>
        <p className="description">
          React implementation with <code>useVList</code> hook. Interactive
          control panel demonstrating vlist's navigation, selection, and
          viewport APIs with 100,000 items.
        </p>
      </header>

      <div className="stats" id="stats">
        <span>
          <strong>Total:</strong> {TOTAL.toLocaleString()}
        </span>
        <span>
          <strong>DOM nodes:</strong> {stats.domNodes}
        </span>
        <span>
          <strong>Memory saved:</strong> {stats.memorySaved}%
        </span>
        <span>
          <strong>Scroll:</strong>{" "}
          <span id="scroll-position">{viewport.scrollPos}px</span>
        </span>
        <span>
          <strong>Direction:</strong>{" "}
          <span id="scroll-direction">{viewport.direction}</span>
        </span>
        <span>
          <strong>Range:</strong>{" "}
          <span id="visible-range">{viewport.range}</span>
        </span>
      </div>

      <div className="split-layout">
        <div className="split-main">
          <div ref={containerRef} id="list-container" />
        </div>

        <aside className="split-panel">
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
                  max={TOTAL - 1}
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
                  onChange={(e) =>
                    setScrollAlign(e.target.value as typeof scrollAlign)
                  }
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
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                  </svg>
                  First
                </button>
                <button onClick={scrollToMiddle} className="panel-btn">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 7H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4z" />
                  </svg>
                  Middle
                </button>
                <button onClick={scrollToLast} className="panel-btn">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                  </svg>
                  Last
                </button>
                <button onClick={scrollToRandom} className="panel-btn">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                  </svg>
                  Random
                </button>
              </div>
            </div>

            <div className="panel-row">
              <label className="panel-label">Smooth scroll</label>
              <div className="panel-btn-group">
                <button onClick={handleSmoothTop} className="panel-btn">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                  </svg>
                  Top
                </button>
                <button onClick={handleSmoothBottom} className="panel-btn">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                  </svg>
                  Bottom
                </button>
              </div>
            </div>
          </section>

          {/* Selection */}
          <section className="panel-section">
            <h3 className="panel-title">Selection</h3>

            <div className="panel-row">
              <label className="panel-label">Mode</label>
              <div className="panel-segmented">
                {(["none", "single", "multiple"] as SelectionMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      className={`panel-segmented__btn ${
                        selectionMode === mode
                          ? "panel-segmented__btn--active"
                          : ""
                      }`}
                      onClick={() => handleSelectionModeChange(mode)}
                    >
                      {mode}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="panel-row">
              <label className="panel-label">Actions</label>
              <div className="panel-btn-group">
                <button onClick={handleSelectAll} className="panel-btn">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2zM7 17h10V7H7v10zm2-8h6v6H9V9z" />
                  </svg>
                  Select all
                </button>
                <button onClick={handleClearSelection} className="panel-btn">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                  Clear
                </button>
              </div>
            </div>

            <div className="panel-row">
              <span className="panel-label">Selected</span>
              <span className="panel-value">
                {formatSelectionCount(selection.length)}
              </span>
            </div>
          </section>

          {/* Item Detail */}
          <section className="panel-section">
            <h3 className="panel-title">Last clicked</h3>
            <div className="panel-detail">
              {lastClicked ? (
                <>
                  <div className="panel-detail__header">
                    <span className="panel-detail__avatar">
                      {lastClicked.item.initials}
                    </span>
                    <div>
                      <div className="panel-detail__name">
                        {lastClicked.item.name}
                      </div>
                      <div className="panel-detail__email">
                        {lastClicked.item.email}
                      </div>
                    </div>
                  </div>
                  <div className="panel-detail__meta">
                    <span>id: {lastClicked.item.id}</span>
                    <span>index: {lastClicked.index}</span>
                  </div>
                </>
              ) : (
                <span className="panel-detail__empty">
                  Click an item to see details
                </span>
              )}
            </div>
          </section>
        </aside>
      </div>

      <footer>
        <p>
          Only visible items are rendered in the DOM. Scroll to see the magic!
          ⚛️
        </p>
      </footer>
    </div>
  );
}

// =============================================================================
// Mount
// =============================================================================

createRoot(document.getElementById("react-root")!).render(<App />);
