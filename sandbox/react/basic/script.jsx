import { useState } from "react";
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

const users = Array.from({ length: 10_000 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  initial: String.fromCharCode(65 + (i % 26)),
  color: COLORS[i % COLORS.length],
}));

// ── App ─────────────────────────────────────────────────────────

function App() {
  const [visibleCount, setVisibleCount] = useState(0);

  // One hook, one ref. vlist owns the DOM inside the container —
  // it renders, recycles, and positions items directly for speed.
  const { containerRef, instanceRef } = useVList({
    items: users,
    item: {
      height: 56,
      // HTML string template (not JSX) — vlist bypasses React's
      // virtual DOM so scrolling stays fast at any list size.
      template: (user, i) => `
        <div class="item">
          <div class="item__avatar" style="background:${user.color}">${user.initial}</div>
          <div class="item__text">
            <div class="item__name">${user.name}</div>
            <div class="item__email">${user.email}</div>
          </div>
          <span class="item__index">#${i + 1}</span>
        </div>
      `,
    },
  });

  // Derive visible DOM count from the render range — no DOM query needed.
  useVListEvent(instanceRef, "range:change", ({ range }) => {
    setVisibleCount(range.end - range.start + 1);
  });

  return (
    <div className="container">
      <header>
        <h1>React · Basic</h1>
        <p className="description">
          Minimal <code>useVList</code> example — 10 000 items, one hook, zero
          boilerplate. Items render as HTML strings so vlist can bypass React's
          reconciler entirely.
        </p>
      </header>

      <p className="stats">
        <strong>{users.length.toLocaleString()}</strong> items
        {" · "}
        <strong>{visibleCount}</strong> in DOM
      </p>

      {/* Attach the ref — vlist takes over from here */}
      <div ref={containerRef} id="list-container" />

      <footer>
        <p>
          <code>useVList</code> returns a <code>containerRef</code> and an{" "}
          <code>instanceRef</code>. Attach the ref, pass your config — done. ⚛️
        </p>
      </footer>
    </div>
  );
}

// ── Mount ───────────────────────────────────────────────────────

createRoot(document.getElementById("react-root")).render(<App />);
