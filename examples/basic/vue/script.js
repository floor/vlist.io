// Basic List — Vue implementation
// Demonstrates core vlist with 100,000 items.

import { createApp, ref, watch, onUnmounted } from "vue";
import { vlist } from "vlist";
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

const App = {
  setup() {
    const containerRef = ref(null);
    let instance = null;

    watch(containerRef, (el) => {
      if (!el) return;

      instance = vlist({
        container: el,
        ariaLabel: "Orders",
        items,
        item: {
          height: ITEM_HEIGHT,
          striped: true,
          template: itemTemplate,
        },
      }).build();
    });

    onUnmounted(() => {
      if (instance) {
        instance.destroy();
        instance = null;
      }
    });

    return { containerRef };
  },

  template: `
    <div class="container">
      <header>
        <h1>Basic List</h1>
        <p class="description">
          Vue implementation — the core of <code>@floor/vlist</code>.
          Scroll through 100,000 items to see virtualization in action.
        </p>
      </header>

      <div class="split-layout">
        <div class="split-main">
          <h2 class="sr-only">Orders</h2>
          <div ref="containerRef" id="list-container"></div>
        </div>

        <aside class="split-panel">
          <section class="panel-section">
            <h3 class="panel-title">About</h3>
            <p class="panel-text">
              This list renders <strong>100,000 items</strong> but only
              creates DOM nodes for the visible rows. Scroll at any speed
              — the frame rate stays constant.
            </p>
            <p class="panel-text">
              Built with <strong>Vue</strong> and the core
              <code>vlist</code> library. One ref, zero boilerplate.
            </p>
          </section>

          <section class="panel-section">
            <h3 class="panel-title">How it works</h3>
            <p class="panel-text">
              Each item has a fixed height of <strong>64 px</strong>.
              vlist calculates which rows are visible and renders only
              those, recycling DOM elements as you scroll.
            </p>
          </section>

          <section class="panel-section">
            <h3 class="panel-title">Accessibility</h3>
            <p class="panel-text">
              vlist implements the
              <strong>WAI-ARIA Listbox</strong> pattern to provide a fully
              accessible virtual list experience — including
              <code>role</code>, <code>aria-setsize</code>,
              <code>aria-posinset</code>, and keyboard navigation out of
              the box.
            </p>
          </section>
        </aside>
      </div>
    </div>
  `,
};

// =============================================================================
// Mount
// =============================================================================

createApp(App).mount("#vue-root");
