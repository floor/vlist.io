// Basic List — React implementation using vlist-react adapter
// Interactive control panel demonstrating core vlist API: item count, overscan,
// scrollToIndex, and data operations (append, prepend, remove).

import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useVList, useVListEvent } from "vlist-react";
import {
  DEFAULT_COUNT,
  ITEM_HEIGHT,
  makeUser,
  makeUsers,
  itemTemplate,
} from "../shared.js";

// =============================================================================
// VListPanel — owns the vlist instance, reports events + instance to parent
// =============================================================================

function VListPanel({
  users,
  overscan,
  onReady,
  onSelectionChange,
  onRangeChange,
}: {
  users: any[];
  overscan: number;
  onReady: (instance: any) => void;
  onSelectionChange: (selected: number[]) => void;
  onRangeChange: (range: { start: number; end: number }) => void;
}) {
  const { containerRef, instanceRef } = useVList({
    ariaLabel: "User list",
    overscan,
    items: users,
    item: {
      height: ITEM_HEIGHT,
      template: itemTemplate,
    },
    selection: { mode: "single" },
  });

  useVListEvent(instanceRef, "selection:change", ({ selected }: any) => {
    onSelectionChange(selected);
  });

  useVListEvent(instanceRef, "range:change", ({ range }: any) => {
    onRangeChange(range);
  });

  // Expose instance to parent after mount
  useEffect(() => {
    if (instanceRef.current) onReady(instanceRef.current);
  }, [instanceRef.current]);

  return <div ref={containerRef} id="list-container" />;
}

// =============================================================================
// App Component
// =============================================================================

function App() {
  // State
  const [users, setUsers] = useState(() => makeUsers(DEFAULT_COUNT));
  const [nextId, setNextId] = useState(DEFAULT_COUNT + 1);
  const [overscan, setOverscan] = useState(3);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [scrollAlign, setScrollAlign] = useState<"start" | "center" | "end">(
    "start",
  );
  const [domCount, setDomCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [instance, setInstance] = useState<any>(null);

  // Derived values
  const total = users.length;
  const visiblePercent = total > 0 ? Math.round((domCount / total) * 100) : 0;
  const memorySaved = total > 0 ? Math.round((1 - domCount / total) * 100) : 0;

  // Navigation
  const handleGoToIndex = () => {
    const clamped = Math.max(0, Math.min(scrollIndex, total - 1));
    instance?.scrollToIndex(clamped, {
      align: scrollAlign,
      behavior: "smooth",
      duration: 400,
    });
  };

  const scrollToFirst = () => {
    instance?.scrollToIndex(0, { behavior: "smooth", duration: 300 });
  };

  const scrollToMiddle = () => {
    instance?.scrollToIndex(Math.floor(total / 2), {
      align: "center",
      behavior: "smooth",
      duration: 500,
    });
  };

  const scrollToLast = () => {
    instance?.scrollToIndex(total - 1, {
      align: "end",
      behavior: "smooth",
      duration: 500,
    });
  };

  // Count slider
  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    setUsers(makeUsers(count));
    setNextId(count + 1);
  };

  // Overscan slider
  const handleOverscanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOverscan(parseInt(e.target.value, 10));
  };

  // Data operations
  const handleAppend = () => {
    const newUser = makeUser(nextId);
    setNextId((n) => n + 1);
    setUsers((prev) => [...prev, newUser]);
    instance?.appendItems([newUser]);
  };

  const handlePrepend = () => {
    const newUser = makeUser(nextId);
    setNextId((n) => n + 1);
    setUsers((prev) => [newUser, ...prev]);
    instance?.prependItems([newUser]);
  };

  const handleAppend100 = () => {
    const batch = makeUsers(100, nextId);
    setNextId((n) => n + 100);
    setUsers((prev) => [...prev, ...batch]);
    instance?.appendItems(batch);
  };

  const handleRemove = () => {
    if (users.length === 0) return;
    const idx =
      selectedIndex >= 0 && selectedIndex < users.length
        ? selectedIndex
        : users.length - 1;
    instance?.clearSelection();
    setSelectedIndex(-1);
    const newUsers = users.filter((_, i) => i !== idx);
    setUsers(newUsers);
    instance?.setItems(newUsers);
  };

  const handleClear = () => {
    setUsers([]);
    instance?.setItems([]);
  };

  const handleReset = () => {
    setUsers(makeUsers(DEFAULT_COUNT));
    setNextId(DEFAULT_COUNT + 1);
    setOverscan(3);
    setSelectedIndex(-1);
  };

  return (
    <div className="container">
      <header>
        <h1>Basic List</h1>
        <p className="description">
          React implementation — the core of <code>@floor/vlist</code>. Use the
          control panel to explore item count, overscan, scroll-to, and data
          operations in real time.
        </p>
      </header>

      <div className="split-layout">
        <div className="split-main">
          {/* key={overscan} remounts VListPanel so useVList picks up new overscan */}
          <VListPanel
            key={overscan}
            users={users}
            overscan={overscan}
            onReady={setInstance}
            onSelectionChange={(selected) => {
              setSelectedIndex(selected.length > 0 ? selected[0] : -1);
            }}
            onRangeChange={(range) => {
              setDomCount(range.end - range.start + 1);
            }}
          />
        </div>

        <aside className="split-panel">
          {/* Items */}
          <section className="panel-section">
            <h3 className="panel-title">Items</h3>

            <div className="panel-row">
              <label className="panel-label">Count</label>
              <span className="panel-value">{total.toLocaleString()}</span>
            </div>
            <div className="panel-row">
              <input
                type="range"
                className="panel-slider"
                min="100"
                max="100000"
                step="100"
                value={Math.min(total, 100000)}
                onChange={handleCountChange}
              />
            </div>

            <div className="panel-row">
              <label className="panel-label">Overscan</label>
              <span className="panel-value">{overscan}</span>
            </div>
            <div className="panel-row">
              <input
                type="range"
                className="panel-slider"
                min="0"
                max="10"
                step="1"
                value={overscan}
                onChange={handleOverscanChange}
              />
            </div>
          </section>

          {/* Scroll To */}
          <section className="panel-section">
            <h3 className="panel-title">Scroll To</h3>

            <div className="panel-row">
              <div className="panel-input-group">
                <input
                  type="number"
                  className="panel-input"
                  placeholder="Index"
                  min="0"
                  value={scrollIndex}
                  onChange={(e) =>
                    setScrollIndex(parseInt(e.target.value, 10) || 0)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGoToIndex();
                  }}
                />
                <select
                  className="panel-select"
                  value={scrollAlign}
                  onChange={(e) =>
                    setScrollAlign(e.target.value as typeof scrollAlign)
                  }
                >
                  <option value="start">start</option>
                  <option value="center">center</option>
                  <option value="end">end</option>
                </select>
                <button className="panel-btn" onClick={handleGoToIndex}>
                  Go
                </button>
              </div>
            </div>

            <div className="panel-row">
              <div className="panel-btn-group">
                <button
                  className="panel-btn panel-btn--icon"
                  title="First"
                  onClick={scrollToFirst}
                >
                  <i className="icon icon--up"></i>
                </button>
                <button
                  className="panel-btn panel-btn--icon"
                  title="Middle"
                  onClick={scrollToMiddle}
                >
                  <i className="icon icon--center"></i>
                </button>
                <button
                  className="panel-btn panel-btn--icon"
                  title="Last"
                  onClick={scrollToLast}
                >
                  <i className="icon icon--down"></i>
                </button>
              </div>
            </div>
          </section>

          {/* Data Operations */}
          <section className="panel-section">
            <h3 className="panel-title">Data</h3>

            <div className="panel-row">
              <div className="panel-btn-group">
                <button
                  className="panel-btn"
                  title="Prepend 1 item"
                  onClick={handlePrepend}
                >
                  <i className="icon icon--add"></i> Prepend
                </button>
                <button
                  className="panel-btn"
                  title="Append 1 item"
                  onClick={handleAppend}
                >
                  <i className="icon icon--add"></i> Append
                </button>
                <button
                  className="panel-btn"
                  title="Append 100 items"
                  onClick={handleAppend100}
                >
                  <i className="icon icon--add"></i> +100
                </button>
              </div>
            </div>

            <div className="panel-row">
              <div className="panel-btn-group">
                <button
                  className="panel-btn"
                  title="Remove selected or last item"
                  onClick={handleRemove}
                >
                  <i className="icon icon--remove"></i> Remove
                </button>
                <button
                  className="panel-btn"
                  title="Clear all items"
                  onClick={handleClear}
                >
                  <i className="icon icon--trash"></i> Clear
                </button>
                <button
                  className="panel-btn"
                  title="Reset to 10,000 items"
                  onClick={handleReset}
                >
                  <i className="icon icon--shuffle"></i> Reset
                </button>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <footer className="example-footer" id="example-footer">
        <div className="example-footer__left">
          <span className="example-footer__stat">
            <strong>{visiblePercent}%</strong>
          </span>
          <span className="example-footer__stat">
            {domCount} / <strong>{total.toLocaleString()}</strong>
            <span className="example-footer__unit"> items</span>
          </span>
          <span className="example-footer__stat">
            <strong>{memorySaved}%</strong>
            <span className="example-footer__unit"> saved</span>
          </span>
        </div>
        <div className="example-footer__right">
          <span className="example-footer__stat">
            height <strong>{ITEM_HEIGHT}</strong>
            <span className="example-footer__unit">px</span>
          </span>
          <span className="example-footer__stat">
            overscan <strong>{overscan}</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}

// =============================================================================
// Mount
// =============================================================================

createRoot(document.getElementById("react-root")!).render(<App />);
