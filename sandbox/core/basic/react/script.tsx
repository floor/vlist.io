// Core Example - React (Lightweight 4.2KB)
// Same result as Basic, but using vlist/core for a smaller bundle
// Demonstrates core entry point with React hooks

import { useState, useRef, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createVList } from "vlist/core";

// =============================================================================
// Data Generation
// =============================================================================

let nextId = 1;

function generateItems(count: number) {
  return Array.from({ length: count }, () => {
    const id = nextId++;
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      initials: String.fromCharCode(65 + ((id - 1) % 26)),
    };
  });
}

// =============================================================================
// Item Template
// =============================================================================

const itemTemplate = (item: any, index: number) => `
  <div class="item-content">
    <div class="item-avatar">${item.initials}</div>
    <div class="item-details">
      <div class="item-name">${item.name}</div>
      <div class="item-email">${item.email}</div>
    </div>
    <div class="item-index">#${index + 1}</div>
  </div>
`;

// =============================================================================
// App Component
// =============================================================================

function App() {
  const [items, setItems] = useState(() => generateItems(100000));
  const [stats, setStats] = useState({ total: 100000, domNodes: 0, saved: 0 });
  const [scrollInfo, setScrollInfo] = useState({ position: 0, direction: "–" });
  const [visibleRange, setVisibleRange] = useState("–");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [scrollIndex, setScrollIndex] = useState("0");
  const [scrollAlign, setScrollAlign] = useState<"start" | "center" | "end">("start");

  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  // Update stats
  const updateStats = useCallback(() => {
    if (!instanceRef.current) return;
    const total = instanceRef.current.total;
    const domNodes = document.querySelectorAll(".vlist-item").length;
    const saved = Math.round((1 - domNodes / total) * 100);
    setStats({ total, domNodes, saved });
  }, []);

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

    // Create new instance
    instanceRef.current = createVList({
      container: containerRef.current,
      ariaLabel: "User list",
      item: {
        height: 64,
        template: itemTemplate,
      },
      items,
    });

    // Bind events
    instanceRef.current.on("scroll", (scrollTop: number, direction: string) => {
      setScrollInfo({
        position: Math.round(scrollTop),
        direction: direction === "up" ? "↑ up" : "↓ down",
      });
    });

    instanceRef.current.on("range:change", ({ range }: any) => {
      setVisibleRange(`${range.start} – ${range.end}`);
      updateStats();
    });

    instanceRef.current.on("item:click", ({ item, index }: any) => {
      setSelectedItem({ ...item, index });
    });

    updateStats();

    // Cleanup
    return () => {
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, [items, updateStats]);

  // Navigation handlers
  const handleGo = useCallback(() => {
    if (!instanceRef.current) return;
    const index = parseInt(scrollIndex, 10);
    if (Number.isNaN(index)) return;
    const clamped = Math.max(0, Math.min(index, instanceRef.current.total - 1));
    instanceRef.current.scrollToIndex(clamped, scrollAlign);
  }, [scrollIndex, scrollAlign]);

  const handleFirst = useCallback(() => {
    instanceRef.current?.scrollToIndex(0, "start");
  }, []);

  const handleMiddle = useCallback(() => {
    if (!instanceRef.current) return;
    instanceRef.current.scrollToIndex(Math.floor(instanceRef.current.total / 2), "center");
  }, []);

  const handleLast = useCallback(() => {
    if (!instanceRef.current) return;
    instanceRef.current.scrollToIndex(instanceRef.current.total - 1, "end");
  }, []);

  const handleRandom = useCallback(() => {
    if (!instanceRef.current) return;
    const index = Math.floor(Math.random() * instanceRef.current.total);
    instanceRef.current.scrollToIndex(index, "center");
    setScrollIndex(String(index));
  }, []);

  const handleSmoothTop = useCallback(() => {
    instanceRef.current?.scrollToIndex(0, {
      align: "start",
      behavior: "smooth",
      duration: 600,
    });
  }, []);

  const handleSmoothBottom = useCallback(() => {
    if (!instanceRef.current) return;
    instanceRef.current.scrollToIndex(instanceRef.current.total - 1, {
      align: "end",
      behavior: "smooth",
      duration: 600,
    });
  }, []);

  // Data method handlers
  const handleAppend = useCallback(() => {
    const newItems = generateItems(100);
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const handlePrepend = useCallback(() => {
    const newItems = generateItems(100);
    setItems((prev) => [...newItems, ...prev]);
  }, []);

  const handleReset10k = useCallback(() => {
    nextId = 1;
    setItems(generateItems(10000));
  }, []);

  const handleReset100k = useCallback(() => {
    nextId = 1;
    setItems(generateItems(100000));
  }, []);

  return (
    <div className="container">
      <header>
        <h1>
          Core <span className="badge">4.2 KB</span>
        </h1>
        <p className="description">
          Same virtual list as <a href="/sandbox/basic">Basic</a>, but using the lightweight{" "}
          <code>vlist/core</code> entry — <strong>11.4 KB</strong> minified (
          <strong>4.2 KB gzip</strong>). The minimal core provides everything most lists need:
          fixed & variable heights, scrolling, data methods, and events.
        </p>
      </header>

      <div className="bundle-info">
        <div className="bundle-item">
          <div className="bundle-label">Bundle size</div>
          <div className="bundle-size">
            11.4 KB <span className="muted">minified</span>
          </div>
        </div>
        <div className="bundle-item">
          <div className="bundle-label">Gzipped</div>
          <div className="bundle-size">
            4.2 KB <span className="muted">over the wire</span>
          </div>
        </div>
      </div>

      <div className="import-diff">
        <div className="import-line removed">
          <span className="diff-marker">−</span>
          <code>
            import {"{"} createVList {"}"} from <span className="hl">"vlist"</span>;
          </code>
        </div>
        <div className="import-line added">
          <span className="diff-marker">+</span>
          <code>
            import {"{"} createVList {"}"} from <span className="hl">"vlist/core"</span>;
          </code>
        </div>
      </div>

      <div className="stats">
        <span>
          <strong>Total:</strong> {stats.total.toLocaleString()}
        </span>
        <span>
          <strong>DOM nodes:</strong> {stats.domNodes}
        </span>
        <span>
          <strong>Memory saved:</strong> {stats.saved}%
        </span>
        <span>
          <strong>Scroll:</strong> {scrollInfo.position}px
        </span>
        <span>
          <strong>Direction:</strong> {scrollInfo.direction}
        </span>
        <span>
          <strong>Range:</strong> {visibleRange}
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
                  max={items.length - 1}
                  value={scrollIndex}
                  onChange={(e) => setScrollIndex(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGo()}
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
                <button onClick={handleGo} className="panel-btn panel-btn--icon" title="Go">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="panel-row">
              <label className="panel-label">Quick jump</label>
              <div className="panel-btn-group">
                <button onClick={handleFirst} className="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                  </svg>
                  First
                </button>
                <button onClick={handleMiddle} className="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 7H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4z" />
                  </svg>
                  Middle
                </button>
                <button onClick={handleLast} className="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                  </svg>
                  Last
                </button>
                <button onClick={handleRandom} className="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                  </svg>
                  Top
                </button>
                <button onClick={handleSmoothBottom} className="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                  </svg>
                  Bottom
                </button>
              </div>
            </div>
          </section>

          {/* Data Methods */}
          <section className="panel-section">
            <h3 className="panel-title">Data Methods</h3>

            <div className="panel-row">
              <label className="panel-label">Mutate</label>
              <div className="panel-btn-group">
                <button onClick={handleAppend} className="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  Append 100
                </button>
                <button onClick={handlePrepend} className="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 11h6V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
                  </svg>
                  Prepend 100
                </button>
              </div>
            </div>

            <div className="panel-row">
              <label className="panel-label">Reset</label>
              <div className="panel-btn-group">
                <button onClick={handleReset10k} className="panel-btn">
                  10K
                </button>
                <button onClick={handleReset100k} className="panel-btn">
                  100K
                </button>
              </div>
            </div>
          </section>

          {/* Item Detail */}
          <section className="panel-section">
            <h3 className="panel-title">Last clicked</h3>
            <div className="panel-detail">
              {selectedItem ? (
                <>
                  <div className="panel-detail__header">
                    <span className="panel-detail__avatar">{selectedItem.initials}</span>
                    <div>
                      <div className="panel-detail__name">{selectedItem.name}</div>
                      <div className="panel-detail__email">{selectedItem.email}</div>
                    </div>
                  </div>
                  <div className="panel-detail__meta">
                    <span>id: {selectedItem.id}</span>
                    <span>index: {selectedItem.index}</span>
                  </div>
                </>
              ) : (
                <span className="panel-detail__empty">Click an item to see details</span>
              )}
            </div>
          </section>
        </aside>
      </div>

      <footer>
        <p>
          Core supports fixed & variable heights, scrollToIndex, data methods, events, and window
          scrolling — everything most lists need. ✨
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
