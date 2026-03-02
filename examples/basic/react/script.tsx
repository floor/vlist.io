// Basic List — React implementation using vlist-react adapter
// Demonstrates core vlist with 100,000 items.

import { createRoot } from "react-dom/client";
import { useVList } from "vlist-react";
import {
  DEFAULT_COUNT,
  ITEM_HEIGHT,
  makeItems,
  itemTemplate,
} from "../shared.js";

// =============================================================================
// App Component
// =============================================================================

const items = makeItems(DEFAULT_COUNT);

function App() {
  const { containerRef } = useVList({
    ariaLabel: "Orders",
    items,
    item: {
      height: ITEM_HEIGHT,
      striped: true,
      template: itemTemplate,
    },
  });

  return (
    <div className="container">
      <header>
        <h1>Basic List</h1>
        <p className="description">
          React implementation — the core of <code>@floor/vlist</code>. Scroll
          through 100,000 items to see virtualization in action.
        </p>
      </header>

      <div className="split-layout">
        <div className="split-main">
          <h2 className="sr-only">Orders</h2>
          <div ref={containerRef} id="list-container" />
        </div>

        <aside className="split-panel">
          <section className="panel-section">
            <h3 className="panel-title">About</h3>
            <p className="panel-text">
              This list renders <strong>100,000 items</strong> but only creates
              DOM nodes for the visible rows. Scroll at any speed — the frame
              rate stays constant.
            </p>
            <p className="panel-text">
              Built with <strong>vlist-react</strong>, the React adapter for
              vlist. One hook, zero boilerplate.
            </p>
          </section>

          <section className="panel-section">
            <h3 className="panel-title">How it works</h3>
            <p className="panel-text">
              Each item has a fixed height of <strong>64 px</strong>. vlist
              calculates which rows are visible and renders only those,
              recycling DOM elements as you scroll.
            </p>
          </section>

          <section className="panel-section">
            <h3 className="panel-title">Accessibility</h3>
            <p className="panel-text">
              vlist implements the <strong>WAI-ARIA Listbox</strong> pattern to
              provide a fully accessible virtual list experience — including{" "}
              <code>role</code>, <code>aria-setsize</code>,{" "}
              <code>aria-posinset</code>, and keyboard navigation out of the
              box.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

// =============================================================================
// Mount
// =============================================================================

createRoot(document.getElementById("react-root")!).render(<App />);
