import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

interface FileEntry {
  id?: string;
  name: string;
  type: "directory" | "file";
  size: number | null;
  modified: string;
  extension: string | null;
}

interface MockPlugin {
  name: string;
  options?: Record<string, unknown>;
}

interface MockList {
  config: { items: FileEntry[] };
  plugins: MockPlugin[];
  destroyed: boolean;
  selected: Array<string | number>;
  on(event: string, handler: (payload: unknown) => void): () => void;
  emit(event: string, payload: unknown): void;
  select(...ids: Array<string | number>): void;
  clearSelection(): void;
  getSelected(): Array<string | number>;
  getSelectedItems(): FileEntry[];
  setItems(next: FileEntry[]): void;
  setSort(key: string | null, direction: string): void;
  destroy(): void;
  clickItem(id: string): void;
  doubleClickItem(id: string): void;
}

const FIXTURE_DIRS: Record<string, FileEntry[]> = {
  vlist: [
    {
      name: "briefs",
      type: "directory",
      size: null,
      modified: "2026-11-04T12:00:00.000Z",
      extension: null,
    },
    {
      name: "src",
      type: "directory",
      size: null,
      modified: "2026-11-04T11:00:00.000Z",
      extension: null,
    },
    {
      name: "package.json",
      type: "file",
      size: 2048,
      modified: "2026-11-04T10:00:00.000Z",
      extension: "json",
    },
    {
      name: "README.md",
      type: "file",
      size: 4096,
      modified: "2026-11-03T09:00:00.000Z",
      extension: "md",
    },
  ],
  "vlist/briefs": [
    {
      name: "plan.md",
      type: "file",
      size: 1024,
      modified: "2026-11-04T12:30:00.000Z",
      extension: "md",
    },
  ],
};

async function setupFileBrowser() {
  const scriptPath = join(
    import.meta.dir,
    "../../examples/file-browser/vanilla/script.js",
  );
  const rawSource = readFileSync(scriptPath, "utf8");
  const source = rawSource.replace(/^import\s+.*from\s+["']vlist["'];?\s*$/gm, "");

  const elements = new Map<
    string,
    {
      id: string;
      innerHTML: string;
      textContent: string;
      disabled: boolean;
      clientWidth: number;
      value: string;
      classes: Set<string>;
      classList: {
        add(cls: string): void;
        remove(cls: string): void;
        contains(cls: string): boolean;
      };
      listeners: Map<string, Array<(event: unknown) => void>>;
      addEventListener(type: string, fn: (event: unknown) => void): void;
      dispatch(type: string, event?: unknown): void;
    }
  >();

  const getElement = (id: string) => {
    let el = elements.get(id);
    if (!el) {
      const classes = new Set<string>();
      const listeners = new Map<string, Array<(event: unknown) => void>>();
      el = {
        id,
        innerHTML: "",
        textContent: "",
        disabled: false,
        clientWidth: 780,
        value: "none",
        classes,
        classList: {
          add: (cls: string) => {
            classes.add(cls);
          },
          remove: (cls: string) => {
            classes.delete(cls);
          },
          contains: (cls: string) => classes.has(cls),
        },
        listeners,
        addEventListener(type: string, fn: (event: unknown) => void) {
          if (!listeners.has(type)) listeners.set(type, []);
          listeners.get(type)!.push(fn);
        },
        dispatch(type: string, event: unknown = {}) {
          for (const fn of listeners.get(type) ?? []) {
            fn(event);
          }
        },
      };
      elements.set(id, el);
    }
    return el;
  };

  for (const id of [
    "breadcrumb",
    "info-items",
    "info-path",
    "file-detail",
    "sort-detail",
    "browser-container",
    "btn-back",
    "btn-forward",
    "btn-view-grid",
    "btn-view-list",
    "arrange-by-select",
    "btn-nav-back",
    "btn-nav-forward",
  ]) {
    getElement(id);
  }

  const createdLists: MockList[] = [];

  const pluginFactory =
    (name: string) =>
    (options?: Record<string, unknown>): MockPlugin => ({
      name,
      options,
    });

  const createVList = (
    config: { items: FileEntry[] },
    plugins: MockPlugin[],
  ): MockList => {
    const handlers = new Map<string, Set<(payload: unknown) => void>>();
    const selPlugin = plugins.find((p) => p.name === "selection");
    const initial = (selPlugin?.options?.initial as Array<string | number> | undefined) ?? [];

    const mockList: MockList = {
      config: { ...config, items: [...config.items] },
      plugins,
      destroyed: false,
      selected: [...initial],
      on(event, handler) {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event)!.add(handler);
        return () => handlers.get(event)?.delete(handler);
      },
      emit(event, payload) {
        for (const handler of handlers.get(event) ?? []) {
          handler(payload);
        }
      },
      select(...ids) {
        mockList.selected = ids.length > 0 ? [ids[0]!] : [];
        mockList.emit("selection:change", {
          selected: [...mockList.selected],
          items: mockList.getSelectedItems(),
        });
      },
      clearSelection() {
        mockList.selected = [];
        mockList.emit("selection:change", {
          selected: [],
          items: [],
        });
      },
      getSelected() {
        return [...mockList.selected];
      },
      getSelectedItems() {
        return mockList.config.items.filter(
          (item) => item.id !== undefined && mockList.selected.includes(item.id),
        );
      },
      setItems(next) {
        mockList.config.items = [...next];
      },
      setSort() {},
      destroy() {
        mockList.destroyed = true;
      },
      clickItem(id: string) {
        const index = mockList.config.items.findIndex((item) => item.id === id);
        const item = mockList.config.items[index];
        if (!item) throw new Error(`Item not found: ${id}`);
        mockList.select(id);
        mockList.emit("item:click", { item, index });
      },
      doubleClickItem(id: string) {
        const index = mockList.config.items.findIndex((item) => item.id === id);
        const item = mockList.config.items[index];
        if (!item) throw new Error(`Item not found: ${id}`);
        mockList.emit("item:dblclick", { item, index });
      },
    };

    createdLists.push(mockList);
    return mockList;
  };

  const scope = {
    createVList,
    grid: pluginFactory("grid"),
    groups: pluginFactory("groups"),
    table: pluginFactory("table"),
    selection: pluginFactory("selection"),
    scrollbar: pluginFactory("scrollbar"),
    document: {
      getElementById: (id: string) => getElement(id),
      querySelector: () => null,
    },
    fetch: async (url: string) => {
      const parsed = new URL(url, "https://vlist.io");
      const path = parsed.searchParams.get("path") ?? "";
      return {
        ok: true,
        status: 200,
        json: async () => ({
          path,
          items: FIXTURE_DIRS[path] ?? [],
        }),
      };
    },
    console,
    encodeURIComponent,
    Math,
    Date,
    String,
    Map,
    Set,
    Array,
    Object,
  };

  await runInNewContext(source, scope);

  return {
    getElement,
    createdLists,
    currentList: () => createdLists.at(-1)!,
  };
}

describe("file-browser example selection persistence", () => {
  test("grid view keeps the selected item highlighted across Group by changes", async () => {
    const { getElement, currentList } = await setupFileBrowser();

    // Switch to Grid view
    getElement("btn-view-grid").dispatch("click");
    expect(currentList().plugins.some((p) => p.name === "grid")).toBe(true);

    // Click 'briefs' in Grid view
    currentList().clickItem("briefs");
    expect(currentList().getSelected()).toEqual(["briefs"]);
    expect(getElement("file-detail").innerHTML).toContain("briefs");

    // Change Group by: None -> Kind
    const arrangeSelect = getElement("arrange-by-select");
    arrangeSelect.value = "kind";
    arrangeSelect.dispatch("change", { target: arrangeSelect });

    expect(currentList().plugins.some((p) => p.name === "grid")).toBe(true);
    expect(currentList().plugins.some((p) => p.name === "groups")).toBe(true);
    expect(currentList().getSelected()).toEqual(["briefs"]);
    expect(getElement("file-detail").innerHTML).toContain("briefs");

    // Change Group by: Kind -> Name -> None
    arrangeSelect.value = "name";
    arrangeSelect.dispatch("change", { target: arrangeSelect });
    expect(currentList().getSelected()).toEqual(["briefs"]);
    expect(getElement("file-detail").innerHTML).toContain("briefs");

    arrangeSelect.value = "none";
    arrangeSelect.dispatch("change", { target: arrangeSelect });
    expect(currentList().plugins.some((p) => p.name === "groups")).toBe(false);
    expect(currentList().getSelected()).toEqual(["briefs"]);
    expect(getElement("file-detail").innerHTML).toContain("briefs");
  });

  test("list view keeps the selected item highlighted across Group by changes and view switches", async () => {
    const { getElement, currentList } = await setupFileBrowser();

    // Select 'briefs' in List view
    expect(currentList().plugins.some((p) => p.name === "table")).toBe(true);
    currentList().clickItem("briefs");
    expect(currentList().getSelected()).toEqual(["briefs"]);
    expect(getElement("file-detail").innerHTML).toContain("briefs");

    // Change Group by: None -> Kind in List view
    const arrangeSelect = getElement("arrange-by-select");
    arrangeSelect.value = "kind";
    arrangeSelect.dispatch("change", { target: arrangeSelect });

    expect(currentList().plugins.some((p) => p.name === "table")).toBe(true);
    expect(currentList().plugins.some((p) => p.name === "groups")).toBe(true);
    expect(currentList().getSelected()).toEqual(["briefs"]);
    expect(getElement("file-detail").innerHTML).toContain("briefs");

    // Switch to Grid view and back to List view — selection stays highlighted
    getElement("btn-view-grid").dispatch("click");
    expect(currentList().plugins.some((p) => p.name === "grid")).toBe(true);
    expect(currentList().getSelected()).toEqual(["briefs"]);
    expect(getElement("file-detail").innerHTML).toContain("briefs");

    getElement("btn-view-list").dispatch("click");
    expect(currentList().plugins.some((p) => p.name === "table")).toBe(true);
    expect(currentList().getSelected()).toEqual(["briefs"]);
    expect(getElement("file-detail").innerHTML).toContain("briefs");

    // Navigating into a folder clears selection and resets Selected File panel
    currentList().doubleClickItem("briefs");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(currentList().getSelected()).toEqual([]);
    expect(getElement("file-detail").innerHTML).toContain(
      "Click a row to see details",
    );
  });
});
