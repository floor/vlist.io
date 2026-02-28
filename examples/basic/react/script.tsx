// Basic List — React implementation
// Interactive control panel demonstrating core vlist API: item count, overscan,
// scrollToIndex, and data operations (append, prepend, remove).

import { useState, useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { vlist } from "vlist";
import {
  DEFAULT_COUNT,
  ITEM_HEIGHT,
  makeUser,
  makeUsers,
  itemTemplate,
} from "../shared.js";

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
  const [stats, setStats] = useState({ dom: 0, total: DEFAULT_COUNT });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const usersRef = useRef(users);
  usersRef.current = users;

  // Create/recreate vlist instance
  useEffect(() => {
    if (!containerRef.current) return;

    if (instanceRef.current) {
      instanceRef.current.destroy();
    }

    instanceRef.current = vlist({
      container: containerRef.current,
      ariaLabel: "User list",
      overscan,
      items: usersRef.current,
      item: {
        height: ITEM_HEIGHT,
        template: itemTemplate,
      },
    }).build();

    instanceRef.current.on("range:change", ({ range }: any) => {
      setStats({
        dom: range.end - range.start + 1,
        total: usersRef.current.length,
      });
    });

    instanceRef.current.on("scroll", () => {
      const domNodes = containerRef.current?.querySelectorAll(".vlist-item").length ?? 0;
      setStats((prev) => ({ ...prev, dom: domNodes }));
    });

    return () => {
      if (instanceRef.current) {
        instanceRef.current.destroy();
      }
    };
  }, [overscan]);

  // Sync items with instance when users change (for append/prepend/remove)
  const syncItems = useCallback(
    (newUsers: any[]) => {
      setUsers(newUsers);
      usersRef.current = newUsers;
      setStats((prev) => ({ ...prev, total: newUsers.length }));
    },
    [],
  );

  // Navigation
  const handleGoToIndex = () => {
    const clamped = Math.max(0, Math.min(scrollIndex, users.length - 1));
    instanceRef.current?.scrollToIndex(clamped, {
      align: scrollAlign,
      behavior: "smooth",
      duration: 400,
    });
  };

  const scrollToFirst = () => {
    instanceRef.current?.scrollToIndex(0, {
      behavior: "smooth",
      duration: 300,
    });
  };

  const scrollToMiddle = () => {
    instanceRef.current?.scrollToIndex(Math.floor(users.length / 2), {
      align: "center",
      behavior: "smooth",
      duration: 500,
    });
  };

  const scrollToLast = () => {
    instanceRef.current?.scrollToIndex(users.length - 1, {
      align: "end",
      behavior: "smooth",
      duration: 500,
    });
  };

  // Data operations
  const handleAppend = () => {
    const newUser = makeUser(nextId);
    setNextId(nextId + 1);
    const newUsers = [...usersRef.current, newUser];
    syncItems(newUsers);
    instanceRef.current?.appendItems([newUser]);
  };

  const handlePrepend = () => {
    const newUser = makeUser(nextId);
    setNextId(nextId + 1);
    const newUsers = [newUser, ...usersRef.current];
    syncItems(newUsers);
    instanceRef.current?.prependItems([newUser]);
  };

  const handleAppend100 = () => {
    const batch = makeUsers(100, nextId);
    setNextId(nextId + 100);
    const newUsers = [...usersRef.current, ...batch];
    syncItems(newUsers);
    instanceRef.current?.appendItems(batch);
  };

  const handleRemove = () => {
    if (usersRef.current.length === 0) return;
    const newUsers = usersRef.current.slice(0, -1);
    syncItems(newUsers);
    instanceRef.current?.setItems(newUsers);
  };

  const handleClear = () => {
    syncItems([]);
    instanceRef.current?.setItems([]);
  };

  const handleReset = () => {
    const newUsers = makeUsers(DEFAULT_COUNT);
    setNextId(DEFAULT_COUNT + 1);
    setOverscan(3);
    syncItems(newUsers);
    // Recreate via useEffect by changing overscan (or force recreate)
    if (instanceRef.current) {
      instanceRef.current.destroy();
    }
    instanceRef.current = vlist({
      container: containerRef.current!,
      ariaLabel: "User list",
      overscan: 3,
      items: newUsers,
      item: {
        height: ITEM_HEIGHT,
        template: itemTemplate,
      },
    }).build();

    instanceRef.current.on("range:change", ({ range }: any) => {
      setStats({
        dom: range.end - range.start + 1,
        total: usersRef.current.length,
      });
    });
  };

  const memorySaved =
    stats.total > 0 ? Math.round((1 - stats.dom / stats.total) * 100) : 0;

  return (
    <div className="container">
      <header>
        <h1>Basic List</h1>
        <p className="description">
          React implementation — the core of <code>@floor/vlist</code>.
          Use the control panel to explore item count, overscan, scroll-to,
          and data operations in real time.
        </p>
      </header>

      <div className="split-layout">
        <div className="split-main">
          <div ref={containerRef} id="list-container" />
        </div>

        <aside className="split-panel">
          {/* Items */}
          <section className="panel-section">
            <h3 className="panel-title">Items</h3>

            <div className="panel-row">
              <label className="panel-label">Count</label>
              <span className="panel-value">
                {users.length.toLocaleString()}
              </span>
            </div>
            <div className="panel-row">
              <input
                type="range"
                className="panel-slider"
                min="100"
                max="100000"
                step="100"
                value={Math.min(users.length, 100000)}
                onChange={(e) => {
                  const count = parseInt(e.target.value, 10);
                  const newUsers = makeUsers(count);
                  setNextId(count + 1);
                  syncItems(newUsers);
                  if (instanceRef.current) {
                    instanceRef.current.destroy();
                  }
                  instanceRef.current = vlist({
                    container: containerRef.current!,
                    ariaLabel: "User list",
                    overscan,
                    items: newUsers,
                    item: {
                      height: ITEM_HEIGHT,
                      template: itemTemplate,
                    },
                  }).build();
                  instanceRef.current.on("range:change", ({ range }: any) => {
                    setStats({
                      dom: range.end - range.start + 1,
                      total: usersRef.current.length,
                    });
                  });
                }}
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
                onChange={(e) => setOverscan(parseInt(e.target.value, 10))}
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
                  title="Remove last item"
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
            <strong>
              {stats.total > 0
                ? Math.round(
                    (stats.dom / stats.total) * 100,
                  )
                : 0}
              %
            </strong>
          </span>
          <span className="example-footer__stat">
            {stats.dom} / <strong>{stats.total.toLocaleString()}</strong>
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
