// Horizontal Scrolling — React implementation with useVList hook
// Demonstrates orientation: 'horizontal' with item.width

import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useVList, useVListEvent } from "vlist-react";
import {
  items,
  itemTemplate,
  calculateStats,
  ITEM_HEIGHT,
  ITEM_WIDTH,
} from "../shared.js";

// =============================================================================
// App Component
// =============================================================================

function App() {
  const [stats, setStats] = useState({
    domNodes: 0,
    saved: 0,
  });

  // Initialize vlist
  const { containerRef, instanceRef } = useVList({
    orientation: "horizontal",
    scroll: { wheel: true },
    ariaLabel: "Horizontal card carousel",
    item: {
      height: ITEM_HEIGHT,
      width: ITEM_WIDTH,
      template: itemTemplate,
    },
    items,
  });

  // Update stats
  const updateStats = () => {
    const domNodes = document.querySelectorAll(".vlist-item").length;
    const { saved } = calculateStats(domNodes, items.length);
    setStats({ domNodes, saved });
  };

  // Track scroll and range changes
  useVListEvent(instanceRef, "scroll", updateStats);
  useVListEvent(instanceRef, "range:change", updateStats);

  // Track item clicks
  useVListEvent(instanceRef, "item:click", ({ item, index }) => {
    console.log(`Clicked: ${item.title} at index ${index}`);
  });

  // Navigation handlers
  const scrollToStart = () => {
    instanceRef.current?.scrollToIndex(0);
  };

  const scrollToCenter = () => {
    instanceRef.current?.scrollToIndex(5000, "center");
  };

  const scrollToEnd = () => {
    instanceRef.current?.scrollToIndex(items.length - 1, "end");
  };

  const smoothScroll = () => {
    const current = instanceRef.current?.getScrollPosition() || 0;
    const targetIndex = current < 100 ? 500 : 0;
    instanceRef.current?.scrollToIndex(targetIndex, {
      align: "start",
      behavior: "smooth",
      duration: 800,
    });
  };

  return (
    <div className="container">
      <header>
        <h1>Horizontal Scrolling</h1>
        <p className="description">
          React implementation with <code>useVList</code> hook. A horizontal
          virtual list rendering 10,000 cards with{" "}
          <code>orientation: 'horizontal'</code> and{" "}
          <code>scroll.wheel: true</code>. Scroll with mouse wheel, trackpad
          swipe, or the buttons below. Only visible items are in the DOM.
        </p>
      </header>

      <div className="stats">
        <span>
          <strong>Total:</strong> {items.length.toLocaleString()}
        </span>
        <span>
          <strong>DOM nodes:</strong> {stats.domNodes}
        </span>
        <span>
          <strong>Memory saved:</strong> {stats.saved}%
        </span>
      </div>

      <div ref={containerRef} id="list-container" />

      <div className="controls">
        <button onClick={scrollToStart}>⏮ Start</button>
        <button onClick={scrollToCenter}>⏺ Center (5000)</button>
        <button onClick={scrollToEnd}>⏭ End</button>
        <button onClick={smoothScroll}>🎞 Smooth Scroll</button>
      </div>

      <footer>
        <p>
          Uses <code>orientation: 'horizontal'</code> with <code>item.width</code>{" "}
          for the main axis and <code>item.height</code> for the cross axis.{" "}
          <code>scroll.wheel: true</code> maps vertical mouse wheel to
          horizontal scroll. Custom scrollbar renders at the bottom
          automatically. ⚛️
        </p>
      </footer>
    </div>
  );
}

// =============================================================================
// Mount
// =============================================================================

createRoot(document.getElementById("react-root")!).render(<App />);
