---
created: 2026-05-17
updated: 2026-05-17
status: published
---

# Browser Debugging

> Puppeteer-based debug harness for inspecting vlist examples in a real browser.

## Overview

`scripts/debug.mjs` is a reusable module that launches a headless Chrome, navigates to any vlist.io example, and exposes helpers for inspecting DOM state, scroll position, animations, clipping, fonts, and more. Debug scripts are short and disposable — write one per bug, throw it away when done.

**Why not JSDOM?** JSDOM doesn't support `getAnimations()`, `getBoundingClientRect()`, `scrollHeight`, Web Animations API, or real CSS cascade. For layout, animation, and rendering bugs, you need a real browser.

## Quick Start

```js
import { run } from "./scripts/debug.mjs";

await run("/examples/messaging", async (s) => {
  s.print(await s.snapshot(), "STATE");
  s.print(await s.clipped(), "CLIPPED");
  await s.screenshot("initial");
});
```

Run with `node debug-my-bug.mjs` from the vlist.io root. The `run()` helper always closes the browser, even if the script throws.

For manual control (e.g. interactive debugging), use `debug()` directly:

```js
import { debug } from "./scripts/debug.mjs";

const s = await debug("/examples/basic", { headless: false });
// ... inspect interactively ...
await s.close();
```

## API

### `run(path, opts?, callback)`

Safe wrapper — launches a session, runs the callback, always closes the browser.

```js
await run("/examples/basic", async (s) => { ... });
await run("/examples/basic", { headless: false }, async (s) => { ... });
```

### `debug(path, opts?)`

Launches Chrome, navigates to `http://localhost:3338{path}`, waits for the viewport.

| Option | Default | Description |
|--------|---------|-------------|
| `headless` | `true` | Set `false` to watch the browser |
| `width` | `1200` | Viewport width |
| `height` | `800` | Viewport height |
| `base` | `http://localhost:3338` | Base URL |
| `chrome` | auto-detect | Chrome executable path |
| `settle` | `1000` | ms to wait after page load |
| `prefix` | `"vlist"` | CSS class prefix (for custom-prefixed lists) |

Returns a session object with the methods below.

### Inspection

#### `snapshot(opts?)`

Captures item state from the DOM. Returns scroll position, viewport size, DOM count, and per-item details (index, id, heights, transform, visibility, clipping, active animations, text).

```js
await s.snapshot()                    // last 12 items
await s.snapshot({ last: 4 })         // last 4
await s.snapshot({ first: 4 })        // first 4
await s.snapshot({ visible: true })   // only items in viewport
await s.snapshot({ selector: ".vlist-item[data-id^='sent-']" })
```

#### `clipped()`

Finds items where `scrollHeight > offsetHeight` — content overflows the element's set height.

```js
const clips = await s.clipped();
// [{ idx, id, styleH, offsetH, scrollH, text }]
```

#### `animations()`

Lists items with active Web Animations. Returns play state, current time, duration, keyframe transforms, and computed transform.

```js
const anims = await s.animations();
// [{ idx, id, state, time, duration, from, to, computed }]
```

#### `scrollState()`

Returns scroll position, max scroll, viewport dimensions, content dimensions, and edge flags (`atTop`, `atBottom`, `atLeft`, `atRight`). Works for both vertical and horizontal lists.

#### `traceFont(selector?)`

Walks the DOM tree from `selector` up to `<body>`, reporting the computed `font-family` at each level. Default selector: last `.vlist-item`.

#### `compareStyles(selector, properties)`

Captures computed style values for up to 5 elements matching `selector`.

```js
s.print(await s.compareStyles(".vlist-item", ["fontSize", "lineHeight", "fontFamily"]));
```

#### `diff(before, after)`

Compares two snapshots. Returns an array of changes: scroll delta, DOM count changes, added/removed/moved items, height changes, visibility changes, clipping changes.

```js
const before = await s.snapshot({ last: 6 });
// ... do something ...
const after = await s.snapshot({ last: 6 });
s.print(s.diff(before, after), "DIFF");
```

Output:
```
=== DIFF ===
  scroll: 420610 → 420813 (+203)
  dom: 11 → 10
  - [5132] msg-4996
  ~ [5133] msg-4997  position: -203
  + [5136] sent-1  h=61px pos=241
```

### Interaction

| Method | Description |
|--------|-------------|
| `scrollTo("top" \| "bottom" \| number)` | Scroll the viewport (auto-detects horizontal) |
| `type(selector, text)` | Focus and type text |
| `press(key)` | Press a key (e.g. `"Enter"`) |
| `click(selector)` | Click an element |
| `evaluate(fn, ...args)` | Raw `page.evaluate` |
| `wait(ms)` | Sleep |
| `waitForAnimations(timeout?)` | Wait until all animations on items finish (default 3s timeout) |

### Output

#### `screenshot(label?)`

Saves a PNG to `/tmp/vlist-debug/{label}.png`.

#### `print(data, label?)`

Pretty-prints snapshots, diffs, clipping arrays, or raw objects to the console. Automatically detects the data type and formats accordingly.

#### `logs`

Array of all `console.log` messages captured from the page.

#### `page` / `browser`

Direct access to the Puppeteer `Page` and `Browser` objects for anything not covered above.

## Examples

### Height/clipping issue

```js
import { run } from "./scripts/debug.mjs";

await run("/examples/messaging", async (s) => {
  await s.scrollTo("bottom");
  await s.type("#message-input", "A very long message that wraps...");
  await s.press("Enter");
  await s.waitForAnimations();

  s.print(await s.snapshot({ last: 4 }), "AFTER SEND");
  const clips = await s.clipped();
  s.print(clips, clips.length ? "CLIPPED" : "NO CLIPPING");
});
```

### Animation debugging

```js
import { run } from "./scripts/debug.mjs";

await run("/examples/messaging", { headless: false }, async (s) => {
  await s.scrollTo("bottom");
  await s.type("#message-input", "hello");
  await s.press("Enter");
  await s.wait(50); // capture mid-animation

  s.print(await s.animations(), "RUNNING");
  s.print(await s.snapshot({ last: 3 }), "MID-ANIMATION");
  await s.screenshot("mid-anim");

  await s.waitForAnimations();
  s.print(await s.snapshot({ last: 3 }), "SETTLED");
});
```

### Before/after diff

```js
import { run } from "./scripts/debug.mjs";

await run("/examples/basic", async (s) => {
  const before = await s.snapshot({ visible: true });
  await s.scrollTo(5000);
  await s.wait(200);
  const after = await s.snapshot({ visible: true });

  s.print(s.diff(before, after), "SCROLL DIFF");
});
```

### CSS inheritance

```js
import { run } from "./scripts/debug.mjs";

await run("/examples/basic", async (s) => {
  s.print(await s.traceFont(), "FONT TRACE");
  s.print(await s.compareStyles(".vlist-item", [
    "fontFamily", "fontSize", "lineHeight", "boxSizing"
  ]), "ITEM STYLES");
});
```
