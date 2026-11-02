import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

// Execute the actual virtual entry emitted by the example bundler, isolated
// from the build's filesystem work and from other tests' browser globals.
function fixture() {
  const build = readFileSync(join(import.meta.dir, "../../examples/build.ts"), "utf8");
  const start = build.indexOf('contents: [', build.indexOf('namespace: "vlist-example"'));
  const end = build.indexOf('].join("\\n")', start);
  const source = new Function("join", "vlistDist", `return ${build.slice(start + 10, end + 1)}`)(join, "/library").join("\n") as string;
  let sequence = 0;
  type Plugin = { name: string; serial: number; options?: { expanded?: string[] }; owner?: List };
  type List = {
    mode: string; plugins: Plugin[]; destroyed: boolean; items: { all(): object[] };
    element: { querySelectorAll(): number[] }; pings: number;
    on(event: string, handler: () => void): () => void; off(event: string, handler: () => void): void;
    emit(event: string): void; destroy(): void; refreshScrollbar(): void;
    expanded: string[]; getExpanded(): string[]; query: string; getQuery(): string; setQuery(query: string): void;
  };
  const made: List[] = [];
  const plugin = (name: string): Plugin => ({ name, serial: sequence++ });
  const make = (mode: string, config: { items: object[] }, plugins: Plugin[]): List => {
    const handlers = new Map<string, Set<() => void>>();
    const list: List = {
      mode, plugins, destroyed: false, items: { all: () => config.items },
      element: { querySelectorAll: () => [1] }, pings: 0,
      expanded: plugins.find(p => p.name === "tree")?.options?.expanded ?? [],
      getExpanded() { return list.expanded; }, query: "", getQuery() { return list.query; }, setQuery(query) { list.query = query; },
      on(event, handler) { if (!handlers.has(event)) handlers.set(event, new Set()); handlers.get(event)!.add(handler); return () => handlers.get(event)?.delete(handler); },
      off(event, handler) { handlers.get(event)?.delete(handler); },
      emit(event) { for (const handler of handlers.get(event) ?? []) handler(); },
      destroy() { list.destroyed = true; for (const p of plugins) if (p.owner) p.owner.pings = -1; },
      refreshScrollbar() { list.pings++; },
    };
    for (const p of plugins) p.owner = list;
    made.push(list);
    return list;
  };
  const native = {
    createVList: (config: { items: object[] }, plugins: Plugin[]) => make("native", config, plugins),
    rebuild: async (previous: List, create: (snapshot: Plugin) => List) => {
      const next = create(plugin("snapshots"));
      previous.destroy();
      return next;
    },
    ...Object.fromEntries(["scrollbar", "grid", "a11y", "selection", "page", "snapshots", "transition", "autosize", "masonry", "data", "groups", "table", "sortable", "tree", "search", "carousel"].map(name => [name, (options?: { expanded?: string[] }) => ({ ...plugin(name), options })])),
  };
  const scope = {
    Native: native, createSynthetic: (config: { items: object[] }, plugins: Plugin[]) => make("synthetic", config, plugins),
    URLSearchParams, location: { search: "?mode=native" }, document: { cookie: "" },
  };
  const code = source.replace(/^import .*;$/gm, "").replace(/^export \* .*;$/gm, "").replace(/^export /gm, "");
  const api = runInNewContext(`${code}\n({createVList, tree:typeof tree==='function'?tree:Native.tree, selection:typeof selection==='function'?selection:Native.selection, switchMode:globalThis.__vlistSetScrollMode})`, scope) as {
    createVList(config: { items: object[] }, plugins: Plugin[]): List;
    tree(): Plugin; selection(): Plugin; switchMode(mode: string): Promise<boolean>;
  };
  return { api, made };
}

test("mode switching gives each list its own plugin instances", async () => {
  const { api, made } = fixture();
  const list = api.createVList({ items: [{ id: 1 }] }, [api.tree(), api.selection()]);
  await api.switchMode("synthetic");
  const replacement = made.at(-1)!;
  expect(replacement.plugins.find(p => p.name === "tree")).not.toBe(made[0]!.plugins[0]);
  expect(replacement.pings).toBeGreaterThan(0);
  expect(list.mode).toBe("synthetic");
});

test("a page with two lists switches both, preserving their proxies and listeners", async () => {
  const { api, made } = fixture();
  const left = api.createVList({ items: [{ id: "left" }] }, [api.tree()]);
  const right = api.createVList({ items: [{ id: "right" }] }, [api.selection()]);
  let leftEvents = 0;
  const listener = () => leftEvents++;
  left.on("change", listener);
  await api.switchMode("synthetic");
  expect(made).toHaveLength(4);
  expect(left.mode).toBe("synthetic");
  expect(right.mode).toBe("synthetic");
  left.emit("change");
  expect(leftEvents).toBe(1);
  left.off("change", listener);
  await api.switchMode("native");
  left.emit("change");
  expect(leftEvents).toBe(1);
  expect(left.mode).toBe("native");
  expect(right.mode).toBe("native");
});

test("destroying one list does not unregister another list on the page", async () => {
  const { api, made } = fixture();
  const left = api.createVList({ items: [{ id: "left" }] }, [api.tree()]);
  const right = api.createVList({ items: [{ id: "right" }] }, [api.selection()]);
  right.destroy();
  await api.switchMode("synthetic");
  expect(made).toHaveLength(3);
  expect(left.mode).toBe("synthetic");
  expect(right.destroyed).toBe(true);
});


test("the subscription disposer follows its list through a mode switch", async () => {
  const { api } = fixture();
  const list = api.createVList({ items: [{ id: 1 }] }, [api.selection()]);
  let events = 0;
  const dispose = list.on("change", () => events++);
  await api.switchMode("synthetic");
  list.emit("change");
  expect(events).toBe(1);
  dispose();
  list.emit("change");
  expect(events).toBe(1);
});


test("tree expansion and the search query survive fresh plugin creation", async () => {
  const { api, made } = fixture();
  const list = api.createVList({ items: [{ id: "src" }] }, [api.tree()]);
  list.expanded = ["src", "src/core"];
  list.setQuery("create");
  await api.switchMode("synthetic");
  expect(list.getExpanded()).toEqual(["src", "src/core"]);
  expect(made.at(-1)!.plugins.find(p => p.name === "tree")!.options!.expanded).toEqual(["src", "src/core"]);
  expect(list.getQuery()).toBe("create");
});
