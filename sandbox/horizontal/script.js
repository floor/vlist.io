// Horizontal Scrolling Example
// Demonstrates direction: 'horizontal' with item.width

import { createVList } from "vlist";

// Color palette for cards
const colors = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a18cd1", "#fbc2eb"],
  ["#fccb90", "#d57eeb"],
  ["#e0c3fc", "#8ec5fc"],
  ["#f5576c", "#ff9a9e"],
  ["#667eea", "#00f2fe"],
];

// Generate test data — 10,000 cards
const items = Array.from({ length: 10000 }, (_, i) => {
  const color = colors[i % colors.length];
  return {
    id: i + 1,
    title: `Card ${i + 1}`,
    subtitle: `Item #${(i + 1).toLocaleString()}`,
    emoji: ["🎵", "🎶", "🎸", "🥁", "🎹", "🎺", "🎻", "🎷", "🪗", "🪘"][i % 10],
    gradientStart: color[0],
    gradientEnd: color[1],
  };
});

// Create horizontal virtual list
const list = createVList({
  container: "#list-container",
  direction: "horizontal",
  scroll: { wheel: false, scrollbar: "none" },
  ariaLabel: "Horizontal card carousel",
  item: {
    width: 180,
    template: (item) => `
      <div class="card" style="background: linear-gradient(135deg, ${item.gradientStart} 0%, ${item.gradientEnd} 100%);">
        <div class="card-emoji">${item.emoji}</div>
        <div class="card-title">${item.title}</div>
        <div class="card-subtitle">${item.subtitle}</div>
      </div>
    `,
  },
  items: items,
});

// Update stats display
const statsEl = document.getElementById("stats");

const updateStats = () => {
  const domNodes = document.querySelectorAll(".vlist-item").length;
  const total = items.length;
  const saved = Math.round((1 - domNodes / total) * 100);

  statsEl.innerHTML = `
    <span><strong>Total:</strong> ${total.toLocaleString()}</span>
    <span><strong>DOM nodes:</strong> ${domNodes}</span>
    <span><strong>Memory saved:</strong> ${saved}%</span>
  `;
};

list.on("scroll", updateStats);
list.on("range:change", updateStats);
updateStats();

// Log clicks
list.on("item:click", ({ item, index }) => {
  console.log(`Clicked: ${item.title} at index ${index}`);
});

// Control buttons
document.getElementById("btn-start")?.addEventListener("click", () => {
  list.scrollToIndex(0);
});

document.getElementById("btn-center")?.addEventListener("click", () => {
  list.scrollToIndex(5000, "center");
});

document.getElementById("btn-end")?.addEventListener("click", () => {
  list.scrollToIndex(items.length - 1, "end");
});

document.getElementById("btn-smooth")?.addEventListener("click", () => {
  const current = list.getScrollPosition();
  const targetIndex = current < 100 ? 500 : 0;
  list.scrollToIndex(targetIndex, {
    align: "start",
    behavior: "smooth",
    duration: 800,
  });
});
