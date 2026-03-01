// Basic List — SolidJS implementation using vlist-solidjs adapter
// Interactive control panel demonstrating core vlist API: item count, overscan,
// scrollToIndex, and data operations (append, prepend, remove).

import { render } from "solid-js/web";
import { createSignal, createMemo } from "solid-js";
import { createVList, createVListEvent } from "vlist-solidjs";
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
  const [users, setUsers] = createSignal(makeUsers(DEFAULT_COUNT));
  const [nextId, setNextId] = createSignal(DEFAULT_COUNT + 1);
  const [overscan, setOverscan] = createSignal(3);
  const [scrollIndex, setScrollIndex] = createSignal(0);
  const [scrollAlign, setScrollAlign] = createSignal("start");
  const [domCount, setDomCount] = createSignal(0);
  const [selectedIndex, setSelectedIndex] = createSignal(-1);

  // Config accessor — createVList reacts to items changes automatically
  const config = () => ({
    ariaLabel: "User list",
    overscan: overscan(),
    items: users(),
    item: {
      height: ITEM_HEIGHT,
      template: itemTemplate,
    },
    selection: { mode: "single" },
  });

  // Create vlist via the SolidJS adapter
  const { setRef, instance } = createVList(config);

  // Bind events via the adapter helper
  createVListEvent(instance, "selection:change", ({ selected }) => {
    setSelectedIndex(selected.length > 0 ? selected[0] : -1);
  });

  createVListEvent(instance, "range:change", ({ range }) => {
    setDomCount(range.end - range.start + 1);
  });

  // Derived values
  const total = () => users().length;

  const visiblePercent = () => {
    return total() > 0 ? Math.round((domCount() / total()) * 100) : 0;
  };

  const memorySaved = () => {
    return total() > 0 ? Math.round((1 - domCount() / total()) * 100) : 0;
  };

  // Navigation
  const handleGoToIndex = () => {
    const clamped = Math.max(0, Math.min(scrollIndex(), total() - 1));
    instance()?.scrollToIndex(clamped, {
      align: scrollAlign(),
      behavior: "smooth",
      duration: 400,
    });
  };

  const scrollToFirst = () => {
    instance()?.scrollToIndex(0, { behavior: "smooth", duration: 300 });
  };

  const scrollToMiddle = () => {
    instance()?.scrollToIndex(Math.floor(total() / 2), {
      align: "center",
      behavior: "smooth",
      duration: 500,
    });
  };

  const scrollToLast = () => {
    instance()?.scrollToIndex(total() - 1, {
      align: "end",
      behavior: "smooth",
      duration: 500,
    });
  };

  // Count slider
  const handleCountChange = (e) => {
    const count = parseInt(e.target.value, 10);
    setUsers(makeUsers(count));
    setNextId(count + 1);
  };

  // Overscan slider
  const handleOverscanChange = (e) => {
    setOverscan(parseInt(e.target.value, 10));
  };

  // Data operations
  const handleAppend = () => {
    const newUser = makeUser(nextId());
    setNextId((n) => n + 1);
    setUsers((prev) => [...prev, newUser]);
    instance()?.appendItems([newUser]);
  };

  const handlePrepend = () => {
    const newUser = makeUser(nextId());
    setNextId((n) => n + 1);
    setUsers((prev) => [newUser, ...prev]);
    instance()?.prependItems([newUser]);
  };

  const handleAppend100 = () => {
    const batch = makeUsers(100, nextId());
    setNextId((n) => n + 100);
    setUsers((prev) => [...prev, ...batch]);
    instance()?.appendItems(batch);
  };

  const handleRemove = () => {
    const current = users();
    if (current.length === 0) return;
    const idx =
      selectedIndex() >= 0 && selectedIndex() < current.length
        ? selectedIndex()
        : current.length - 1;
    instance()?.clearSelection();
    setSelectedIndex(-1);
    setUsers((prev) => prev.filter((_, i) => i !== idx));
    instance()?.setItems(users());
  };

  const handleClear = () => {
    setUsers([]);
    instance()?.setItems([]);
  };

  const handleReset = () => {
    const newUsers = makeUsers(DEFAULT_COUNT);
    setUsers(newUsers);
    setNextId(DEFAULT_COUNT + 1);
    setOverscan(3);
  };

  return (
    <div class="container">
      <header>
        <h1>Basic List</h1>
        <p class="description">
          SolidJS implementation — the core of <code>@floor/vlist</code>. Use
          the control panel to explore item count, overscan, scroll-to, and data
          operations in real time.
        </p>
      </header>

      <div class="split-layout">
        <div class="split-main">
          <div ref={setRef} id="list-container" />
        </div>

        <aside class="split-panel">
          {/* Items */}
          <section class="panel-section">
            <h3 class="panel-title">Items</h3>

            <div class="panel-row">
              <label class="panel-label">Count</label>
              <span class="panel-value">{total().toLocaleString()}</span>
            </div>
            <div class="panel-row">
              <input
                type="range"
                class="panel-slider"
                min="100"
                max="100000"
                step="100"
                value={Math.min(total(), 100000)}
                onChange={handleCountChange}
              />
            </div>

            <div class="panel-row">
              <label class="panel-label">Overscan</label>
              <span class="panel-value">{overscan()}</span>
            </div>
            <div class="panel-row">
              <input
                type="range"
                class="panel-slider"
                min="0"
                max="10"
                step="1"
                value={overscan()}
                onChange={handleOverscanChange}
              />
            </div>
          </section>

          {/* Scroll To */}
          <section class="panel-section">
            <h3 class="panel-title">Scroll To</h3>

            <div class="panel-row">
              <div class="panel-input-group">
                <input
                  type="number"
                  class="panel-input"
                  placeholder="Index"
                  min="0"
                  value={scrollIndex()}
                  onInput={(e) =>
                    setScrollIndex(parseInt(e.target.value, 10) || 0)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGoToIndex();
                  }}
                />
                <select
                  class="panel-select"
                  value={scrollAlign()}
                  onChange={(e) => setScrollAlign(e.target.value)}
                >
                  <option value="start">start</option>
                  <option value="center">center</option>
                  <option value="end">end</option>
                </select>
                <button class="panel-btn" onClick={handleGoToIndex}>
                  Go
                </button>
              </div>
            </div>

            <div class="panel-row">
              <div class="panel-btn-group">
                <button
                  class="panel-btn panel-btn--icon"
                  title="First"
                  onClick={scrollToFirst}
                >
                  <i class="icon icon--up" />
                </button>
                <button
                  class="panel-btn panel-btn--icon"
                  title="Middle"
                  onClick={scrollToMiddle}
                >
                  <i class="icon icon--center" />
                </button>
                <button
                  class="panel-btn panel-btn--icon"
                  title="Last"
                  onClick={scrollToLast}
                >
                  <i class="icon icon--down" />
                </button>
              </div>
            </div>
          </section>

          {/* Data Operations */}
          <section class="panel-section">
            <h3 class="panel-title">Data</h3>

            <div class="panel-row">
              <div class="panel-btn-group">
                <button
                  class="panel-btn"
                  title="Prepend 1 item"
                  onClick={handlePrepend}
                >
                  <i class="icon icon--add" /> Prepend
                </button>
                <button
                  class="panel-btn"
                  title="Append 1 item"
                  onClick={handleAppend}
                >
                  <i class="icon icon--add" /> Append
                </button>
                <button
                  class="panel-btn"
                  title="Append 100 items"
                  onClick={handleAppend100}
                >
                  <i class="icon icon--add" /> +100
                </button>
              </div>
            </div>

            <div class="panel-row">
              <div class="panel-btn-group">
                <button
                  class="panel-btn"
                  title="Remove selected or last item"
                  onClick={handleRemove}
                >
                  <i class="icon icon--remove" /> Remove
                </button>
                <button
                  class="panel-btn"
                  title="Clear all items"
                  onClick={handleClear}
                >
                  <i class="icon icon--trash" /> Clear
                </button>
                <button
                  class="panel-btn"
                  title="Reset to 10,000 items"
                  onClick={handleReset}
                >
                  <i class="icon icon--shuffle" /> Reset
                </button>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <footer class="example-footer" id="example-footer">
        <div class="example-footer__left">
          <span class="example-footer__stat">
            <strong>{visiblePercent()}%</strong>
          </span>
          <span class="example-footer__stat">
            {domCount()} / <strong>{total().toLocaleString()}</strong>
            <span class="example-footer__unit"> items</span>
          </span>
          <span class="example-footer__stat">
            <strong>{memorySaved()}%</strong>
            <span class="example-footer__unit"> saved</span>
          </span>
        </div>
        <div class="example-footer__right">
          <span class="example-footer__stat">
            height <strong>{ITEM_HEIGHT}</strong>
            <span class="example-footer__unit">px</span>
          </span>
          <span class="example-footer__stat">
            overscan <strong>{overscan()}</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}

// =============================================================================
// Mount
// =============================================================================

render(() => <App />, document.getElementById("solidjs-root"));
