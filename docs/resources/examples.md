---
created: 2026-02-21
updated: 2026-04-15
status: published
---

# Examples

The examples is an interactive development environment for exploring vlist examples and browsing the source code.

## Quick Start

```bash
# Build and serve
bun run examples

# Or separately
bun run build          # Build vlist library
bun run build:examples  # Build examples examples
bun run serve          # Start dev server
```

Then open http://localhost:3337/examples

## Structure

The examples is organized by feature architecture, with each folder representing either a feature or a category of examples:

```
examples/
├── build.ts              # Auto-discovers and builds all examples
├── renderer.ts           # Server-side rendering for example pages
├── index.html            # Examples landing page
├── examples.css           # Shared styles
├── shell.html            # HTML template wrapper
│
├── basic/                # Getting Started - pure vanilla JS
├── controls/             # Getting Started - full API (4 frameworks)
│   ├── javascript/
│   ├── react/
│   ├── vue/
│   └── svelte/
│
├── core/                 # Core (Lightweight) - 4.2KB gzipped
│   └── basic/
│       ├── javascript/   # 4.2KB gzip
│       ├── react/        # 122.3KB gzip
│       ├── vue/          # 213.6KB gzip
│       └── svelte/       # 4.2KB gzip
│
├── grid/                 # Grid Feature (vlist/grid)
│   └── photo-album/
│       ├── javascript/
│       ├── react/
│       ├── vue/
│       └── svelte/
│
├── data/                 # Data Feature (vlist (withAsync))
│   ├── large-list/       # withScale (4 frameworks)
│   └── velocity-loading/ # Async loading
│
├── contact-list/         # A-Z contact list (vlist (withGroups))
│
├── horizontal/           # Horizontal scrolling
│   └── basic/            # 4 frameworks
│
├── builder/              # Builder Pattern examples
│   ├── basic/
│   ├── controls/
│   ├── large-list/
│   ├── photo-album/
│   └── chat/
│
└── (advanced examples)
    ├── messaging/
    ├── variable-heights/
    ├── scroll-restore/
    ├── window-scroll/
    └── wizard-nav/
```

## Adding a New Example

### Single Framework Example

1. Create a new folder in the appropriate feature category:

```
examples/my-feature/my-example/
├── content.html
├── script.js
└── styles.css
```

2. The build script auto-discovers it:

```bash
bun run build:examples
# Output: Found 33 examples including my-feature/my-example
```

### Multi-Framework Example

For examples with multiple framework variants:

```
examples/my-feature/my-example/
├── javascript/
│   ├── content.html
│   ├── script.js
│   └── styles.css
├── react/
│   ├── content.html
│   ├── script.tsx
│   └── styles.css
├── vue/
│   ├── content.html
│   ├── script.js
│   └── styles.css
└── svelte/
    ├── content.html
    ├── script.js
    └── styles.css
```

The build script automatically detects nested framework directories.

## Build Script

`examples/build.ts` automatically:

- Recursively scans `examples/` for directories containing `script.js`, `script.jsx`, or `script.tsx`
- Detects framework variants (javascript/, react/, vue/, svelte/ subdirectories)
- Builds all examples in parallel using Bun
- Outputs to `examples/{path}/dist/script.js`
- Reports build times, bundle sizes (minified and gzipped), and CSS sizes
- Deduplicates React/Vue frameworks when linked (prevents dual framework instances)

```bash
bun run build:examples

# Output:
# 🔨 Building examples...
# ✅ examples.css                   12.3 KB
# 📦 Found 33 examples: basic, core/basic/javascript, core/basic/react, ...
# ✅ core/basic/javascript  77ms   11.4 KB → 4.2 KB gzip  css 2.7 KB
# ✅ core/basic/react     100ms   403.2 KB → 122.3 KB gzip  css 2.7 KB
# ✅ photo-album/javascript  87ms   32.3 KB → 11.0 KB gzip  css 2.0 KB
# ...
# ✨ Built 33/33 examples in 276ms
```

### Watch Mode

For development, use watch mode to auto-rebuild on changes:

```bash
bun run dev:examples
```

## Dev Server

`serve.ts` is a simple Bun-based static file server with:

- **Breadcrumb navigation** - click any path segment to navigate
- **File icons** - Zed-style SVG icons for each file type
- **Markdown rendering** - `.md` files render as HTML
- **Syntax highlighting** - TypeScript, JSON, YAML files are highlighted
- **Hidden files** - `.git`, `node_modules`, `.DS_Store`, `bun.lock` are hidden

### Served vs Rendered

| Extension | Behavior |
|-----------|----------|
| `.html`, `.js`, `.css` | Served as-is (for browsers to execute) |
| `.ts`, `.tsx`, `.jsx` | Rendered with syntax highlighting |
| `.json`, `.yaml`, `.yml` | Rendered with syntax highlighting |
| `.md` | Rendered as HTML |
| `LICENSE`, `.gitignore` | Rendered as text |

### Raw Files

Add `?raw` to any URL to get the raw file:

```
http://localhost:3337/README.md       # Rendered as HTML
http://localhost:3337/README.md?raw   # Raw markdown
```

## Example Structure

### Content HTML (`content.html`)

This file contains only the example content (not the full HTML document). The server wraps it with `shell.html`:

```html
<!-- For vanilla JS/Svelte examples -->
<div class="container">
    <header>
        <h1>My Example</h1>
        <p class="description">Example description</p>
    </header>
    
    <div id="list-container"></div>
    
    <footer>
        <p>Footer text</p>
    </footer>
</div>
```

```html
<!-- For React examples -->
<div id="react-root"></div>
```

```html
<!-- For Vue examples -->
<div id="vue-root"></div>
```

The server automatically injects:
- `examples.css` - Shared styles
- `styles.css` - Example-specific styles
- `dist/script.js` - Built JavaScript

## Example Scripts

### Basic Example

Minimal list with no features (7.7 KB gzipped):

```javascript
import { vlist } from "vlist";

const items = Array.from({ length: 100000 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
}));

const list = vlist({
  container: "#list-container",
  item: {
    height: 64,
    template: (item) => `<div>${item.name}</div>`,
  },
  items,
}).build();
```

### With Features

Composable features via `.use()` — only bundled features are included:

```javascript
import { vlist, withGrid, withScrollbar } from "vlist";

const gallery = vlist({
  container: "#grid-container",
  item: {
    height: 200,
    template: (item) => `<img src="${item.url}" />`,
  },
  items,
})
  .use(withGrid({ columns: 4, gap: 8 }))
  .use(withScrollbar({ autoHide: true }))
  .build();
```

### React Example

Using React hooks with vlist:

```tsx
import { useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { vlist } from "vlist";

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    instanceRef.current = vlist({
      container: containerRef.current,
      item: { height: 64, template: (item) => `<div>${item.name}</div>` },
      items,
    });

    return () => instanceRef.current?.destroy();
  }, []);

  return <div ref={containerRef} />;
}

createRoot(document.getElementById("react-root")!).render(<App />);
```

## Organization Guidelines

### When to Create a Feature Folder

Create a dedicated feature folder (e.g., `grid/`, `data/`, `groups/`) when:
- The example demonstrates a specific vlist feature (e.g., `vlist/grid`, `vlist (withAsync)`)
- You plan to have multiple examples for that feature
- The feature is documented and stable

### When to Use Framework Variants

Provide multiple framework variants when:
- The example is a key showcase (basic, photo-album, large-list)
- It demonstrates important patterns developers will copy
- The implementation differs meaningfully across frameworks

### Single Framework Examples

Use a single framework (usually vanilla JS) when:
- The example is simple or experimental
- Framework choice doesn't significantly affect the implementation
- The focus is on a specific vlist feature, not framework integration

## Port

The dev server runs on port **3337** by default (to avoid conflicts with common ports like 3000).
