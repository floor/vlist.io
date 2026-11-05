import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTO_HIDDEN_CLASS, bindAutoSearch, isAutoKey } from "../../examples/code-explorer/auto.js";

const root = join(import.meta.dir, "../..");

function key(partial: Record<string, unknown>) {
  return {
    key: "a",
    defaultPrevented: false,
    isComposing: false,
    keyCode: 0,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    target: { tagName: "DIV", isContentEditable: false },
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.stopped = true;
    },
    stopped: false,
    ...partial,
  };
}

function makeDom() {
  const listeners: Record<string, Array<{ fn: (event: unknown) => void; capture: boolean }>> = {};
  const classes = new Set<string>();
  const input = {
    tagName: "INPUT",
    className: "vlist-search__input",
    value: "",
    selection: null as [number, number] | null,
    focused: false,
    isConnected: true,
    setSelectionRange(start: number, end: number) {
      input.selection = [start, end];
    },
    focus() {
      input.focused = true;
    },
  };
  const viewport = {
    className: "vlist-viewport",
    focused: false,
    isConnected: true,
    focus() {
      viewport.focused = true;
    },
  };
  const clear = {
    className: "vlist-search__clear-button",
    closest(sel: string) {
      return sel === ".vlist-search__clear-button" ? clear : null;
    },
  };
  const bar = {
    className: "vlist-search vlist-search--bar",
    classList: {
      add(cls: string) {
        classes.add(cls);
      },
      remove(cls: string) {
        classes.delete(cls);
      },
      contains(cls: string) {
        return classes.has(cls);
      },
    },
    contains(node: unknown) {
      return node === clear || node === input || node === bar;
    },
  };
  const active = { current: viewport as unknown };
  const container = {
    ownerDocument: {
      get activeElement() {
        return active.current;
      },
    },
    querySelector(sel: string) {
      if (sel === ".vlist-search") return bar;
      if (sel === ".vlist-search__input") return input;
      if (sel === ".vlist-viewport") return viewport;
      return null;
    },
    addEventListener(type: string, fn: (event: unknown) => void, capture = false) {
      const bucket = `${type}:${capture ? "c" : "b"}`;
      if (!listeners[bucket]) listeners[bucket] = [];
      listeners[bucket].push({ fn, capture });
    },
    removeEventListener(type: string, fn: (event: unknown) => void, capture = false) {
      const bucket = `${type}:${capture ? "c" : "b"}`;
      listeners[bucket] = (listeners[bucket] ?? []).filter((entry) => entry.fn !== fn);
    },
    dispatch(type: string, event: ReturnType<typeof key>) {
      for (const entry of listeners[`${type}:c`] ?? []) entry.fn(event);
      if (event.stopped) return;
      for (const entry of listeners[`${type}:b`] ?? []) entry.fn(event);
    },
  };

  const handlers = new Map<string, Set<(payload?: unknown) => void>>();
  const calls: string[] = [];
  const list = {
    calls,
    on(event: string, handler: (payload?: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
      return () => handlers.get(event)?.delete(handler);
    },
    emit(event: string) {
      for (const handler of handlers.get(event) ?? []) handler();
    },
    setQuery(q: string) {
      calls.push(`setQuery:${q}`);
      input.value = q;
      list.emit("search:open");
    },
    closeSearch() {
      calls.push("closeSearch");
      input.value = "";
      list.emit("search:close");
    },
  };

  return { container, bar, input, viewport, clear, active, list, classes };
}

describe("code explorer auto", () => {
  test("a letter, é, and ж open; modifiers, fields, and IME do not", () => {
    expect(isAutoKey(key({ key: "a" }))).toBe(true);
    expect(isAutoKey(key({ key: "é" }))).toBe(true);
    expect(isAutoKey(key({ key: "ж" }))).toBe(true);
    expect(isAutoKey(key({ key: "7" }))).toBe(true);
    expect(isAutoKey(key({ key: "€", altKey: true }))).toBe(false);
    expect(isAutoKey(key({ key: "æ", altKey: true }))).toBe(true);
    expect(isAutoKey(key({ key: "é", altKey: true, ctrlKey: true }))).toBe(true);
    expect(isAutoKey(key({ key: "e", ctrlKey: true }))).toBe(false);
    expect(isAutoKey(key({ key: "e", metaKey: true }))).toBe(false);
    expect(isAutoKey(key({ key: "ArrowDown" }))).toBe(false);
    expect(isAutoKey(key({ key: " " }))).toBe(false);
    expect(isAutoKey(key({ key: "Escape" }))).toBe(false);
    expect(isAutoKey(key({ isComposing: true }))).toBe(false);
    expect(isAutoKey(key({ keyCode: 229 }))).toBe(false);
    expect(isAutoKey(key({ defaultPrevented: true }))).toBe(false);
    expect(isAutoKey(key({ target: { tagName: "INPUT" } }))).toBe(false);
    expect(isAutoKey(key({ target: { tagName: "TEXTAREA" } }))).toBe(false);
    expect(isAutoKey(key({ target: { tagName: "DIV", isContentEditable: true } }))).toBe(false);
  });

  test("a hidden bar opens on é, the X closes it, and focus returns", () => {
    const dom = makeDom();
    const unbind = bindAutoSearch(dom.list, dom.container);
    expect(dom.classes.has(AUTO_HIDDEN_CLASS)).toBe(true);

    const open = key({ key: "é" });
    dom.container.dispatch("keydown", open);
    expect(open.defaultPrevented).toBe(true);
    expect(dom.list.calls).toEqual(["setQuery:é"]);
    expect(dom.classes.has(AUTO_HIDDEN_CLASS)).toBe(false);
    expect(dom.input.selection).toEqual([1, 1]);

    const again = key({ key: "x" });
    dom.container.dispatch("keydown", again);
    expect(dom.list.calls).toEqual(["setQuery:é"]);

    let bubbleRan = false;
    const click = key({
      target: dom.clear,
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    dom.container.addEventListener("click", () => {
      bubbleRan = true;
    });
    dom.container.dispatch("click", click);
    expect(click.stopped).toBe(true);
    expect(click.defaultPrevented).toBe(true);
    expect(bubbleRan).toBe(false);
    expect(dom.list.calls).toEqual(["setQuery:é", "closeSearch"]);
    expect(dom.classes.has(AUTO_HIDDEN_CLASS)).toBe(true);
    expect(dom.viewport.focused).toBe(true);

    unbind();
    const after = key({ key: "a" });
    dom.container.dispatch("keydown", after);
    expect(dom.list.calls).toEqual(["setQuery:é", "closeSearch"]);
  });

  test("the example wires Auto through the public search API", () => {
    const script = readFileSync(join(root, "examples/code-explorer/script.js"), "utf8");
    const html = readFileSync(join(root, "examples/code-explorer/content.html"), "utf8");
    const css = readFileSync(join(root, "examples/code-explorer/styles.css"), "utf8");
    expect(script.includes("searchReveal")).toBe(false);
    expect(script.includes('bindAutoSearch(rightList, c)')).toBe(true);
    expect(script.includes('clear: "Close search"')).toBe(true);
    expect(script.includes('searchBar === "hidden" ? "none"')).toBe(true);
    expect(html.includes('<option value="auto">Auto</option>')).toBe(true);
    expect(css.includes(".explorer-list .vlist-search.cx-search--hidden")).toBe(true);
    expect(css.includes("display: none")).toBe(true);
  });
});
