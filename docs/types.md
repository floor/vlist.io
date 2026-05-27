---
created: 2026-05-27
updated: 2026-05-27
status: published
---

# Types

Complete TypeScript type reference. For config options and basic types (`VListItem`, `ItemTemplate`, `ScrollToOptions`, `ScrollSnapshot`, `VListAdapter`), see [API Reference](./api.md).

## VList Instance

The object returned by `createVList()`:

```ts
interface VList<T extends VListItem = VListItem> {
  readonly element: HTMLElement;
  readonly items: readonly T[];
  readonly total: number;

  setItems(items: T[]): void;
  appendItems(items: T[]): void;
  prependItems(items: T[]): void;
  updateItem(id: string | number, updates: Partial<T>): void;
  insertItem(item: T, index?: number): void;
  removeItem(id: string | number): void;
  removeItems(ids: ReadonlyArray<string | number>): number;
  getItemAt(index: number): T | undefined;
  getIndexById(id: string | number): number;

  scrollToIndex(index: number, align?: "start" | "center" | "end" | ScrollToOptions): void;
  getScrollPosition(): number;

  on<K extends keyof VListEvents<T>>(event: K, handler: EventHandler<VListEvents<T>[K]>): Unsubscribe;
  off<K extends keyof VListEvents<T>>(event: K, handler: EventHandler<VListEvents<T>[K]>): void;

  destroy(): void;

  // Plugin-registered methods (getGridLayout, getGroupLayout, etc.)
  [key: string]: unknown;
}
```

Plugins extend the instance at runtime via `ctx.registerMethod()` — methods like `getGridLayout()`, `updateGrid()`, etc. are not in the base type but are available after the corresponding plugin is added.

## ViewportState

Current viewport geometry, accessible via `getState().viewport` inside plugins:

```ts
interface ViewportState {
  scrollPosition: number;
  containerSize: number;
  totalSize: number;
  actualSize: number;
  isCompressed: boolean;
  compressionRatio: number;
  visibleRange: Range;
  renderRange: Range;
}

interface Range {
  start: number;
  end: number;
}
```

## Selection Types

```ts
type SelectionMode = "none" | "single" | "multiple";

interface SelectionConfig {
  mode?: SelectionMode;
  initial?: Array<string | number>;
  followFocus?: boolean;
  focusOnClick?: boolean;
}

interface SelectionState {
  selected: Set<string | number>;
  focusedIndex: number;
  focusVisible: boolean;
}
```

## GridSizeContext

Passed to `item.height` when using the `grid()` plugin:

```ts
interface GridSizeContext {
  containerWidth: number;
  columns: number;
  gap: number;
  columnWidth: number;
}
```

Usage:

```ts
item: {
  height: (index, { columnWidth }) => Math.round(columnWidth * 0.75),
}
```

## MasonryContext

Passed to the `size` function in the `masonry()` plugin config:

```ts
interface MasonryContext {
  columnWidth: number;
  columns: number;
  gap: number;
  containerWidth: number;
}
```

## Groups Types

```ts
interface GroupsConfig {
  getGroupForIndex: (index: number, item?: any) => string;
  header?: GroupHeaderConfig;
  sticky?: boolean;
}

interface GroupHeaderConfig {
  height?: number | ((group: string, groupIndex: number) => number);
  template: (group: string, groupIndex: number) => string | HTMLElement;
}
```

## Table Types

```ts
interface TableConfig {
  columns: TableColumn[];
  rowHeight?: number;
  estimatedRowHeight?: number;
  headerHeight?: number;
  resizable?: boolean;
  minColumnWidth?: number;
  maxColumnWidth?: number;
  sort?: { key: string; direction: "asc" | "desc" };
}

interface TableColumn {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  sortable?: boolean;
  template?: (value: unknown, item: any, column: TableColumn) => string | HTMLElement;
  headerTemplate?: (column: TableColumn) => string | HTMLElement;
}
```

## VListEvents

The full event map. All events can be subscribed to via `list.on(event, handler)`:

```ts
interface VListEvents<T extends VListItem = VListItem> {
  // Interaction
  "item:click": { item: T; index: number; event: MouseEvent };
  "item:dblclick": { item: T; index: number; event: MouseEvent };
  "item:contextmenu": { item: T; index: number; event: MouseEvent };

  // Scroll
  scroll: { scrollPosition: number; direction: "up" | "down" };
  "scroll:idle": { scrollPosition: number };
  "velocity:change": { velocity: number; reliable: boolean };
  "range:change": { range: Range };
  resize: { height: number; width: number };

  // Data
  "data:change":
    | { type: "insert"; id: string | number }
    | { type: "add"; id: string | number }
    | { type: "remove"; id: string | number }
    | { type: "update"; id: string | number };

  // Selection (a11y / selection plugin)
  "selection:change": { selected: Array<string | number>; items: T[] };
  "focus:change": { id: string | number; index: number };
  "delete": { selected: Array<string | number>; items: T[] };

  // Async (data plugin)
  "load:start": { offset: number; limit: number };
  "load:end": { items: T[]; total?: number; offset?: number };

  // Transition
  "remove:end": { id: string | number };

  // Sortable
  "sort:start": { index: number };
  "sort:move": { fromIndex: number; currentIndex: number };
  "sort:end": { fromIndex: number; toIndex: number };
  "sort:cancel": { originalItems: unknown[] };

  // Table
  "column:resize": { key: string; index: number; previousWidth: number; width: number };
  "column:sort": { key: string; index: number; direction: "asc" | "desc" | null };

  // Lifecycle
  error: { error: Error; context: string; viewport?: ErrorViewportSnapshot };
  destroy: undefined;
}
```

## ErrorViewportSnapshot

Included in `error` events to help diagnose rendering issues:

```ts
interface ErrorViewportSnapshot {
  scrollPosition: number;
  containerSize: number;
  totalSize: number;
  visibleRange: Range;
  renderRange: Range;
  renderedCount: number;
}
```

## Plugin Types

See [Plugin Authoring](./exports.md) for `VListPlugin`, `PluginContext`, and `EngineState`.

## DOMStructure

The internal DOM elements, available via `ctx.dom` in plugins:

```ts
interface DOMStructure {
  readonly root: HTMLElement;
  readonly viewport: HTMLElement;
  readonly content: HTMLElement;
  readonly liveRegion: HTMLElement;
}
```

HTML structure:

```
root (.vlist)
  └─ viewport (.vlist-viewport)
       ├─ content (.vlist-items, role="listbox")
       │    └─ items (.vlist-item, role="option")
       └─ liveRegion (aria-live="polite", sr-only)
```
