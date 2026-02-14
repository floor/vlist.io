// Grid Layout — React implementation with useVList hook
// Virtualized 2D photo gallery with 1,000 real photos from Lorem Picsum

import { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useVList, useVListEvent } from "vlist/react";
import {
  items,
  itemTemplate,
  calculateRowHeight,
  calculateGridStats,
  DEFAULT_COLUMNS,
  DEFAULT_GAP,
} from "../shared.js";

// =============================================================================
// App Component
// =============================================================================

function App() {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [gap, setGap] = useState(DEFAULT_GAP);
  const [stats, setStats] = useState({
    domNodes: 0,
    rows: 0,
    saved: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate row height based on container width
  const [height, setHeight] = useState(200);

  useEffect(() => {
    if (containerRef.current) {
      const newHeight = calculateRowHeight(
        containerRef.current.clientWidth,
        columns,
        gap,
      );
      setHeight(newHeight);
    }
  }, [columns, gap]);

  // Initialize vlist
  const { containerRef: vlistRef, instanceRef } = useVList({
    ariaLabel: "Photo gallery",
    layout: "grid",
    grid: {
      columns,
      gap,
    },
    item: {
      height,
      template: itemTemplate,
    },
    items,
  });

  // Update stats
  const updateStats = () => {
    const domNodes = document.querySelectorAll(
      ".vlist-item, .vlist-grid-item",
    ).length;
    const { rows, saved } = calculateGridStats(domNodes, items.length, columns);
    setStats({ domNodes, rows, saved });
  };

  // Track scroll and range changes
  useVListEvent(instanceRef, "scroll", updateStats);
  useVListEvent(instanceRef, "range:change", updateStats);

  // Track item clicks
  useVListEvent(instanceRef, "item:click", ({ item, index }) => {
    console.log(`Clicked: ${item.title} (${item.category}) at index ${index}`);
  });

  // Initial stats
  useEffect(() => {
    updateStats();
  }, [columns, gap]);

  // Merge refs
  const setRefs = (el: HTMLDivElement | null) => {
    containerRef.current = el;
    if (typeof vlistRef === "function") {
      vlistRef(el);
    } else if (vlistRef) {
      vlistRef.current = el;
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Grid Layout</h1>
        <p className="description">
          React implementation with <code>useVList</code> hook. Virtualized 2D
          grid with 1,000 real photos from{" "}
          <a href="https://picsum.photos" target="_blank" rel="noreferrer">
            Lorem Picsum
          </a>
          . Only visible rows are rendered — images load on demand as you
          scroll.
        </p>
      </header>

      <div className="controls">
        <label>
          Columns:
          <select
            value={columns}
            onChange={(e) => setColumns(parseInt(e.target.value, 10))}
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
          </select>
        </label>
        <label>
          Gap:
          <select value={gap} onChange={(e) => setGap(parseInt(e.target.value, 10))}>
            <option value="0">0px</option>
            <option value="4">4px</option>
            <option value="8">8px</option>
            <option value="12">12px</option>
            <option value="16">16px</option>
          </select>
        </label>
      </div>

      <div className="stats">
        <span>
          <strong>Total:</strong> {items.length.toLocaleString()} photos
        </span>
        <span>
          <strong>Rows:</strong> {stats.rows.toLocaleString()}
        </span>
        <span>
          <strong>DOM nodes:</strong> {stats.domNodes}
        </span>
        <span>
          <strong>Memory saved:</strong> {stats.saved}%
        </span>
      </div>

      <div ref={setRefs} id="grid-container" />

      <footer>
        <p>
          Only visible rows are rendered. Each item is positioned with{" "}
          <code>translate(x, y)</code>. Photos courtesy of{" "}
          <a href="https://picsum.photos" target="_blank" rel="noreferrer">
            Picsum
          </a>{" "}
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
