// Code Explorer — browse vlist's own source with two coordinated virtual lists.
//   • Left:  a file tree (tree plugin) of the vlist source, with Zed-style icons.
//   • Center: a vlist + search showing either the selected file's exported
//             symbols (filter) or its commit history (navigate). With no file
//             selected, History shows the full git log.
//   • Right: a controls panel demonstrating the search plugin's configuration.

import { createVList, tree, search, selection, autosize, scrollbar } from "vlist";
import { VLIST_TREE } from "../../src/data/vlist-tree.js";
import { VLIST_HISTORY } from "../../src/data/vlist-history.js";
import { getIcon, getChevron } from "../tree/icons.js";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";

// =============================================================================
// Derived data
// =============================================================================

const SYMBOL_KINDS = new Set(["function", "const", "class", "interface", "type", "enum", "re-export"]);
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const basename = (p) => p.split("/").pop();

function timeAgo(dateStr) {
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

const KW = new Set([
  "export", "function", "const", "let", "var", "interface", "type", "class",
  "enum", "extends", "implements", "readonly", "async", "abstract", "static",
  "declare", "import", "from", "new", "return", "default", "of", "in",
]);
const TYPES = new Set([
  "string", "number", "boolean", "void", "null", "undefined", "any",
  "unknown", "never", "true", "false", "Promise", "Array", "Record",
  "Set", "Map", "Partial", "Required", "Omit", "Pick",
]);
const TOKEN_RE = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b[A-Za-z_$][\w$]*\b)|(\d+(?:\.\d+)?)|([<>()[\]{};:,=|&?.]|=>|\.\.\.)/g;

function syntaxHighlight(raw) {
  let out = "";
  let last = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(raw)) !== null) {
    if (m.index > last) out += esc(raw.slice(last, m.index));
    const [tok, str, ident, num, punct] = m;
    const e = esc(tok);
    if (str) out += `<span class="syn-str">${e}</span>`;
    else if (num) out += `<span class="syn-num">${e}</span>`;
    else if (punct) out += `<span class="syn-punct">${e}</span>`;
    else if (ident && KW.has(ident)) out += `<span class="syn-kw">${e}</span>`;
    else if (ident && TYPES.has(ident)) out += `<span class="syn-type">${e}</span>`;
    else out += e;
    last = m.index + tok.length;
  }
  if (last < raw.length) out += esc(raw.slice(last));
  return out;
}

const TREE_NODES = VLIST_TREE.filter((n) => n.kind === "dir" || n.kind === "file");

// All symbols indexed by their parent file.
const ALL_SYMBOLS = VLIST_TREE.filter((n) => SYMBOL_KINDS.has(n.kind))
  .sort((a, b) => (b.exported ? 1 : 0) - (a.exported ? 1 : 0));
const symbolsByFile = new Map();
for (const n of ALL_SYMBOLS) {
  const arr = symbolsByFile.get(n.parentId) ?? [];
  arr.push(n);
  symbolsByFile.set(n.parentId, arr);
}
for (const [, arr] of symbolsByFile) {
  arr.sort((a, b) => (b.exported ? 1 : 0) - (a.exported ? 1 : 0));
}

// All file paths (for dir → files lookup).
const ALL_FILES = VLIST_TREE.filter((n) => n.kind === "file").map((n) => n.id);

// Collect symbols for a selection: null → all, file → its symbols, dir → all files under it.
function symbolsFor(nodeId) {
  if (!nodeId) return ALL_SYMBOLS;
  if (symbolsByFile.has(nodeId)) return symbolsByFile.get(nodeId);
  // Directory — collect from all files whose path starts with this dir.
  const prefix = nodeId + "/";
  const syms = [];
  for (const file of ALL_FILES) {
    if (file === nodeId || file.startsWith(prefix)) {
      const s = symbolsByFile.get(file);
      if (s) syms.push(...s);
    }
  }
  return syms;
}

// Collect commits for a selection: null → all, file → its commits, dir → commits touching any file under it.
function commitsFor(nodeId) {
  if (!nodeId) return VLIST_HISTORY;
  const prefix = nodeId + "/";
  return VLIST_HISTORY.filter((c) =>
    c.files.some((f) => f === nodeId || f.startsWith(prefix)),
  );
}

// =============================================================================
// Configurable state
// =============================================================================

let treeList = null;
let rightList = null;
let selectedFile = null;
let rightView = "symbols"; // "symbols" | "history"

// Search config (driven by control panel)
let searchEnabled = true;
let searchMode = "filter";
let searchVariant = "default";
let highlightEnabled = true;
let highlightScoped = false;
let caseSensitive = false;

// =============================================================================
// Stats
// =============================================================================

export const stats = createStats({
  getScrollPosition: () => rightList?.getScrollPosition() ?? 0,
  getTotal: () => rightList?.total ?? 0,
  getItemSize: () => (rightView === "history" ? 56 : 52),
  getContainerSize: () => document.querySelector("#symbol-container")?.clientHeight ?? 0,
});
const updateInfo = createInfoUpdater(stats);

// =============================================================================
// Left pane — file tree
// =============================================================================

const renderTreeNode = (item, _index, state) => {
  const t = state.tree ?? {};
  const isFolder = item.kind === "dir";
  const count = isFolder ? 0 : symbolsFor(item.id).length;
  const meta = count ? `<span class="tree-node__meta">${count}</span>` : "";
  return `
    <div class="tree-node tree-node--${item.kind}">
      <span class="tree-node__icon">${getIcon(item.name, isFolder, t.expanded)}</span>
      <span class="tree-node__label">${esc(item.name)}</span>
      ${meta}
    </div>
  `;
};

function buildTree() {
  treeList = createVList(
    {
      container: "#tree-container",
      ariaLabel: "vlist source files",
      item: { height: 30, template: renderTreeNode },
      items: TREE_NODES,
    },
    [
      tree({
        parentId: "parentId",
        label: "name",
        indent: 18,
        expanded: ["src"],
        expandOnClick: true,
        connectorLines: true,
      }),
      selection({ mode: "single", followFocus: true, focusOnClick: true }),
      scrollbar({ autoHide: false, padding: 0 }),
    ],
  );

  const onTreeSelect = (id) => {
    if (id !== selectedFile) {
      selectedFile = id;
      buildRight();
    }
  };

  treeList.on("selection:change", ({ items }) => {
    if (items[0]) onTreeSelect(items[0].id);
  });
  treeList.on("tree:expand", ({ id }) => { treeList.select(id); onTreeSelect(id); });
  treeList.on("tree:collapse", ({ id }) => { treeList.select(id); onTreeSelect(id); });
}

// =============================================================================
// Right pane — symbols (filter) | history (navigate)
// =============================================================================

const renderSymbol = (item) => `
  <div class="sym sym--${item.kind}${item.exported ? "" : " sym--internal"}">
    <div class="sym__row">
      <span class="sym__kind">${item.kind}</span>
      <span class="sym__name">${esc(item.name)}</span>
    </div>
    ${item.signature ? `<pre class="sym__sig">${syntaxHighlight(item.signature)}</pre>` : ""}
  </div>
`;

const renderCommit = (item) => `
  <div class="commit commit--${item.type}">
    <span class="commit__type">${item.type}</span>
    <div class="commit__body">
      <div class="commit__subject">${esc(item.subject)}</div>
      <div class="commit__meta">
        <code>${item.shortHash}</code> · ${esc(item.author)} · <span class="commit__ago">${timeAgo(item.date)}</span>
      </div>
    </div>
  </div>
`;

function showEmpty(message) {
  const c = document.getElementById("symbol-container");
  if (rightList) {
    rightList.destroy();
    rightList = null;
  }
  c.innerHTML = `<div class="explorer-empty">${esc(message)}</div>`;
  updateInfo();
  updateMatchInfo(0, 0);
}

function resolveHighlight() {
  if (!highlightEnabled) return false;
  if (!highlightScoped) return true;
  return rightView === "symbols"
    ? { within: ".sym__name" }
    : { within: ".commit__subject" };
}

function buildRight() {
  updateContext();
  const prevQuery = rightList?.getQuery?.() ?? "";
  if (rightList) {
    rightList.destroy();
    rightList = null;
  }
  const c = document.getElementById("symbol-container");
  c.innerHTML = "";

  const isSymbols = rightView === "symbols";
  const items = isSymbols ? symbolsFor(selectedFile) : commitsFor(selectedFile);

  if (isSymbols && !items.length) {
    return showEmpty(selectedFile ? `No exported symbols in ${basename(selectedFile)}` : "No symbols found");
  }
  if (!isSymbols && !items.length) {
    return showEmpty(selectedFile ? `No commits touched ${basename(selectedFile)}` : "No commits");
  }

  const label = selectedFile ? basename(selectedFile) : "vlist";
  const mode = searchMode;
  const placeholderText = isSymbols
    ? `${searchMode === "filter" ? "Filter" : "Find"} symbols in ${label}…`
    : `Search ${selectedFile ? "history of " + label : "all commits"}…`;

  const plugins = [];
  if (searchEnabled) {
    plugins.push(
      search({
        mode,
        text: { placeholder: placeholderText },
        field: isSymbols
          ? "name"
          : (c) => `${c.subject} ${c.author} ${c.shortHash}`,
        highlight: resolveHighlight(),
        caseSensitive,
        variant: searchVariant,
      }),
    );
  }
  plugins.push(autosize());
  plugins.push(scrollbar({ autoHide: false, padding: 0 }));
  plugins.push(selection({ mode: "single" }));

  rightList = createVList(
    {
      container: "#symbol-container",
      ariaLabel: isSymbols ? `Symbols in ${label}` : `${selectedFile ? "History of " + label : "All commits"}`,
      item: { height: isSymbols ? 52 : 56, template: isSymbols ? renderSymbol : renderCommit },
      items,
    },
    plugins,
  );

  wireRight(items.length);
  reflectControls();

  if (prevQuery && searchEnabled) {
    rightList.setQuery?.(prevQuery);
  }
}

function wireRight(total) {
  rightList.on("scroll", updateInfo);
  rightList.on("range:change", updateInfo);
  rightList.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });
  if (searchEnabled) {
    rightList.on("search:change", ({ matches, total: t }) => {
      updateMatchInfo(matches, t);
      updateInfo();
    });
    rightList.on("search:match", ({ matchIndex, matches }) => {
      updateMatchInfo(matches, rightList?.total ?? 0, matchIndex);
    });
  }
  updateInfo();
  updateMatchInfo(0, total);
}

// =============================================================================
// Toolbar
// =============================================================================

function updateContext() {
  const el = document.getElementById("cx-context");
  if (!el) return;
  el.innerHTML = selectedFile
    ? `<code>${esc(selectedFile)}</code>`
    : `<span class="explorer-context-all">All files</span>`;
}

function setActiveView(view) {
  document
    .getElementById("cx-view-toggle")
    ?.querySelectorAll("button")
    .forEach((b) => b.classList.toggle("ui-segmented__btn--active", b.dataset.value === view));
}

function updateMatchInfo(matches, total, currentIndex) {
  const el = document.getElementById("info-matches");
  if (!el) return;
  if (!searchEnabled) {
    el.textContent = "off";
    return;
  }
  if (rightView === "history" && matches > 0 && currentIndex != null) {
    el.textContent = `${currentIndex + 1} / ${matches}`;
  } else {
    el.textContent = `${matches} / ${total}`;
  }
}

function reflectControls() {
  const off = !searchEnabled;
  const isHistory = rightView === "history";
  for (const id of ["cx-mode-section", "cx-style-section", "cx-highlight-section", "cx-options-section"]) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("ui-section--disabled", off);
  }
  const activeMode = searchMode;
  document.getElementById("cx-mode-toggle")
    ?.querySelectorAll("button")
    .forEach((b) => b.classList.toggle("ui-segmented__btn--active", b.dataset.value === activeMode));
}

// =============================================================================
// Boot + controls (all ids prefixed cx- to avoid shell collision)
// =============================================================================

buildTree();
buildRight();

// View toggle: Symbols | History — clear the query when switching views
// since the data is entirely different.
document.getElementById("cx-view-toggle")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-value]");
  if (!btn || btn.dataset.value === rightView) return;
  if (rightList?.getQuery?.()) rightList.setQuery?.("");
  rightView = btn.dataset.value;
  setActiveView(rightView);
  buildRight();
});

// Tree expand / collapse
let treeExpanded = false;
const treeToggle = document.getElementById("cx-tree-toggle");
treeToggle?.addEventListener("click", () => {
  treeExpanded = !treeExpanded;
  if (treeExpanded) treeList?.expandAll?.();
  else treeList?.collapseAll?.();
  treeToggle.textContent = treeExpanded ? "Collapse all" : "Expand all";
});

// Search enable
document.getElementById("cx-search-toggle")?.addEventListener("change", (e) => {
  searchEnabled = e.target.checked;
  buildRight();
});

// Mode: filter / navigate
wireSegment("cx-mode-toggle", (v) => { searchMode = v; buildRight(); });

// Bar style: default / md3
wireSegment("cx-style-toggle", (v) => { searchVariant = v; buildRight(); });

// Highlight enable
document.getElementById("cx-highlight-toggle")?.addEventListener("change", (e) => {
  highlightEnabled = e.target.checked;
  buildRight();
});

// Highlight scope: name only / whole row
wireSegment("cx-scope-toggle", (v) => { highlightScoped = v === "scoped"; buildRight(); });

// Case sensitive
document.getElementById("cx-case-toggle")?.addEventListener("change", (e) => {
  caseSensitive = e.target.checked;
  buildRight();
});

function wireSegment(id, setter) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-value]");
    if (!btn) return;
    el.querySelectorAll("button").forEach((b) =>
      b.classList.toggle("ui-segmented__btn--active", b === btn),
    );
    setter(btn.dataset.value);
  });
}
