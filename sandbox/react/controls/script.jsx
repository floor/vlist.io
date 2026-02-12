import { useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { useVList, useVListEvent } from "vlist/react";

// ── Data ────────────────────────────────────────────────────────

const COLORS = [
  "#667eea",
  "#764ba2",
  "#f5576c",
  "#4facfe",
  "#43e97b",
  "#fa709a",
  "#feca57",
  "#a8edea",
];

const ROLES = ["Admin", "Editor", "Viewer", "Guest"];

const users = Array.from({ length: 10_000 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  initial: String.fromCharCode(65 + (i % 26)),
  role: ROLES[i % ROLES.length],
  color: COLORS[i % COLORS.length],
}));

// ── Template ────────────────────────────────────────────────────
// HTML string — not JSX. vlist renders items directly to the DOM,
// bypassing React's reconciler so scrolling stays fast at any size.

const template = (user, i) => `
  <div class="item-content">
    <div class="item-avatar" style="background:${user.color}">${user.initial}</div>
    <div class="item-details">
      <div class="item-name">${user.name}</div>
      <div class="item-email">${user.email}</div>
    </div>
    <span class="item-role item-role--${user.role.toLowerCase()}">${user.role}</span>
    <span class="item-index">#${i + 1}</span>
  </div>
`;

// ── Panels ──────────────────────────────────────────────────────

function NavigationPanel({ onScrollTo, total }) {
  const [index, setIndex] = useState(0);
  const [align, setAlign] = useState("start");

  return (
    <section className="panel-section">
      <h3 className="panel-title">Navigation</h3>

      <div className="panel-row">
        <label className="panel-label">Scroll to index</label>
        <div className="panel-input-group">
          <input
            type="number"
            min={0}
            max={total - 1}
            value={index}
            onChange={(e) => setIndex(parseInt(e.target.value, 10) || 0)}
            onKeyDown={(e) => e.key === "Enter" && onScrollTo(index, align)}
            className="panel-input"
          />
          <select
            value={align}
            onChange={(e) => setAlign(e.target.value)}
            className="panel-select"
          >
            <option value="start">start</option>
            <option value="center">center</option>
            <option value="end">end</option>
          </select>
          <button
            onClick={() => onScrollTo(index, align)}
            className="panel-btn panel-btn--icon"
            title="Go"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="panel-row">
        <label className="panel-label">Quick jump</label>
        <div className="panel-btn-group">
          <button className="panel-btn" onClick={() => onScrollTo(0, "start")}>
            First
          </button>
          <button
            className="panel-btn"
            onClick={() => onScrollTo(Math.floor(total / 2), "center")}
          >
            Middle
          </button>
          <button
            className="panel-btn"
            onClick={() => onScrollTo(total - 1, "end")}
          >
            Last
          </button>
          <button
            className="panel-btn"
            onClick={() => {
              const i = Math.floor(Math.random() * total);
              setIndex(i);
              onScrollTo(i, "center");
            }}
          >
            Random
          </button>
        </div>
      </div>

      <div className="panel-row">
        <label className="panel-label">Smooth scroll</label>
        <div className="panel-btn-group">
          <button
            className="panel-btn"
            onClick={() =>
              onScrollTo(0, {
                align: "start",
                behavior: "smooth",
                duration: 600,
              })
            }
          >
            ↑ Top
          </button>
          <button
            className="panel-btn"
            onClick={() =>
              onScrollTo(total - 1, {
                align: "end",
                behavior: "smooth",
                duration: 600,
              })
            }
          >
            ↓ Bottom
          </button>
        </div>
      </div>
    </section>
  );
}

function SelectionPanel({ count, onSelectAll, onClear }) {
  const label =
    count === 0
      ? "0 items"
      : count === 1
        ? "1 item"
        : `${count.toLocaleString()} items`;

  return (
    <section className="panel-section">
      <h3 className="panel-title">Selection</h3>
      <div className="panel-row">
        <label className="panel-label">Actions</label>
        <div className="panel-btn-group">
          <button className="panel-btn" onClick={onSelectAll}>
            Select all
          </button>
          <button className="panel-btn" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
      <div className="panel-row">
        <span className="panel-label">Selected</span>
        <span className="panel-value">{label}</span>
      </div>
    </section>
  );
}

function ItemDetail({ item }) {
  return (
    <section className="panel-section">
      <h3 className="panel-title">Last clicked</h3>
      <div className="panel-detail">
        {!item ? (
          <span className="panel-detail__empty">
            Click an item to see details
          </span>
        ) : (
          <>
            <div className="panel-detail__header">
              <span
                className="panel-detail__avatar"
                style={{ background: item.color }}
              >
                {item.initial}
              </span>
              <div>
                <div className="panel-detail__name">{item.name}</div>
                <div className="panel-detail__email">{item.email}</div>
              </div>
            </div>
            <div className="panel-detail__meta">
              <span>id: {item.id}</span>
              <span>role: {item.role}</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ── App ─────────────────────────────────────────────────────────

function App() {
  const [selectedCount, setSelectedCount] = useState(0);
  const [clickedItem, setClickedItem] = useState(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [direction, setDirection] = useState(null);
  const [range, setRange] = useState(null);

  const { containerRef, instanceRef } = useVList({
    items: users,
    item: { height: 64, template },
    selection: { mode: "multiple" },
    ariaLabel: "User list",
  });

  // Derive visible count from the render range — no DOM query.
  useVListEvent(instanceRef, "range:change", ({ range: r }) => {
    setRange(r);
  });

  useVListEvent(instanceRef, "scroll", (e) => {
    setScrollTop(e.scrollTop);
    setDirection(e.direction);
  });

  useVListEvent(instanceRef, "selection:change", ({ selected }) => {
    setSelectedCount(selected.length);
  });

  useVListEvent(instanceRef, "item:click", ({ item }) => {
    setClickedItem(item);
  });

  const handleScrollTo = useCallback(
    (index, alignOrOpts) =>
      instanceRef.current?.scrollToIndex(index, alignOrOpts),
    [instanceRef],
  );

  const visibleCount = range ? range.end - range.start + 1 : 0;

  return (
    <div className="container container--wide">
      <header>
        <h1>React · Controls</h1>
        <p className="description">
          <code>useVList</code> with selection, navigation, and scroll tracking.
          Every panel is driven by React state via <code>useVListEvent</code> —
          vlist emits events, React re-renders the UI around it.
        </p>
      </header>

      <div className="stats">
        <strong>{users.length.toLocaleString()}</strong> items
        {" · "}
        <strong>{visibleCount}</strong> in DOM
        {" · "}
        <strong>{Math.round(scrollTop)}px</strong> scroll
        {" · "}
        {direction === "up" ? "↑" : direction === "down" ? "↓" : "–"}
        {range && (
          <>
            {" · "} rows {range.start}–{range.end}
          </>
        )}
      </div>

      <div className="split-layout">
        <div className="split-main">
          <div ref={containerRef} id="list-container" />
        </div>

        <aside className="split-panel">
          <NavigationPanel onScrollTo={handleScrollTo} total={users.length} />
          <SelectionPanel
            count={selectedCount}
            onSelectAll={() => instanceRef.current?.selectAll()}
            onClear={() => instanceRef.current?.clearSelection()}
          />
          <ItemDetail item={clickedItem} />
        </aside>
      </div>

      <footer>
        <p>
          vlist fires events, React owns the state. The two never fight over the
          DOM — that's what makes it fast. ⚛️
        </p>
      </footer>
    </div>
  );
}

// ── Mount ───────────────────────────────────────────────────────

createRoot(document.getElementById("react-root")).render(<App />);
