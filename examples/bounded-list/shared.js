// Shared data + template for the bounded-list example (RFC-012).
// 1,000,000 items × 50px = 50,000,000px virtual — far past the browser's
// ~16.7M px element-size limit, yet handled WITHOUT the scale plugin's
// compression: scroll.mode "bounded" sizes the content to a viewport runway.

export const COUNT = 1_000_000;
export const ITEM_HEIGHT = 50;

const COLORS = [
  "#667eea", "#764ba2", "#f093fb", "#f5576c",
  "#4facfe", "#43e97b", "#fa709a", "#fee140",
];

export function makeItems(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    color: COLORS[i % COLORS.length],
  }));
}

export const itemTemplate = (item, index) => `
  <div class="bl-row">
    <span class="bl-swatch" style="background:${item.color}"></span>
    <span class="bl-idx">#${(index + 1).toLocaleString()}</span>
  </div>
`;
