// File type icons — Zed editor SVGs (zed-industries/zed, GPL-3.0)
// Adapted to use currentColor for theming.

const svg = (paths, color) =>
  `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="color:${color}">${paths}</svg>`;

const PATHS = {
  folder: '<path d="M8.26 3.97c.09.2.22.5.31.72.08.19.26.31.46.31H12.5a.5.5 0 01.5.5v6.63a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5V3.87a.5.5 0 01.5-.5h3.84c.4 0 .75.24.92.6Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  folder_open: '<path d="M4.43 7.25A.49.49 0 014.91 6.75h8.62a.49.49 0 01.47.5c-.04 1.44-.25 5.5-1.43 5.5H3.38c1.18 0 1.01-4.06 1.05-5.5Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M5.2 12.63H3.67a.5.5 0 01-.48-.42L1.94 3.94a.5.5 0 01.48-.58h3.36c.33 0 .63.17.81.45l.35.55h2.98a.5.5 0 01.5.47l.24 1.46" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>',
  ts: '<path fill-rule="evenodd" clip-rule="evenodd" d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H4Zm7.51 6.67c-.02-.22-.11-.39-.28-.5-.16-.12-.39-.18-.67-.18-.19 0-.35.03-.48.08-.13.05-.23.13-.3.22a.46.46 0 00-.1.32c0 .1.02.19.06.26.05.07.11.14.19.19.09.05.18.1.29.14.1.04.22.07.34.1l.5.12c.24.05.46.13.66.22.2.09.38.2.53.33.15.13.26.29.34.47.08.18.13.38.13.61 0 .34-.09.63-.26.88-.17.25-.41.44-.73.58-.32.13-.7.2-1.16.2-.44 0-.83-.07-1.16-.21-.33-.14-.59-.34-.78-.61-.18-.27-.28-.6-.29-1h1.14c.01.19.06.34.16.47.1.12.22.21.38.28.16.06.34.09.55.09.2 0 .37-.03.52-.09.15-.06.26-.14.34-.24.08-.1.12-.22.12-.36 0-.12-.04-.23-.11-.31-.07-.09-.18-.16-.32-.22-.14-.06-.31-.11-.51-.16l-.6-.15c-.47-.11-.84-.3-1.11-.54-.27-.24-.41-.57-.41-.98 0-.34.09-.63.27-.88.18-.25.43-.45.75-.59.32-.14.68-.21 1.08-.21.41 0 .77.07 1.08.21.31.14.55.34.72.59.17.25.26.54.27.87h-1.13ZM3.2 8.04V7.08h4.55v.96H6.06v4.58H4.9V8.04H3.2Z" fill="currentColor"/>',
  js: '<path fill-rule="evenodd" clip-rule="evenodd" d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H4Zm3.27 4.81H6.05v4.07c0 .19-.03.34-.08.47a.57.57 0 01-.24.3.67.67 0 01-.39.1.62.62 0 01-.38-.09.63.63 0 01-.25-.25c-.06-.11-.09-.24-.09-.4H3.39c0 .39.08.71.25.97.17.25.4.44.68.57.29.12.61.19.96.19.4 0 .74-.08 1.04-.22.3-.15.53-.37.7-.65.17-.28.25-.6.25-.98V6.81ZM11.17 7.95c.17.13.27.31.29.53h1.18c-.01-.35-.1-.66-.28-.92a2 2 0 00-.76-.62c-.32-.15-.7-.22-1.13-.22-.43 0-.81.07-1.14.22-.34.15-.6.35-.79.62a1.4 1.4 0 00-.28.93c0 .43.14.77.42 1.03.29.25.67.44 1.17.56l.64.16c.21.05.39.11.54.17.15.06.26.14.34.23.08.09.12.2.12.33 0 .14-.04.27-.13.37-.09.11-.21.19-.35.25-.15.06-.33.09-.54.09-.21 0-.4-.03-.57-.1-.17-.07-.3-.16-.4-.29-.1-.13-.16-.3-.17-.49h-1.2c.01.42.11.78.31 1.06.2.28.47.5.82.64.35.15.76.22 1.23.22.48 0 .88-.07 1.22-.21.34-.15.6-.35.78-.61.18-.26.27-.57.27-.93 0-.24-.05-.46-.13-.65a1.7 1.7 0 00-.36-.47 2.5 2.5 0 00-.55-.34c-.21-.1-.45-.17-.7-.23l-.52-.13a2 2 0 01-.36-.1 1 1 0 01-.3-.15.4.4 0 01-.2-.27c0-.13.04-.24.11-.34.07-.1.18-.17.32-.23.14-.06.31-.09.51-.09.3 0 .53.06.7.19Z" fill="currentColor"/>',
  css: '<path fill-rule="evenodd" clip-rule="evenodd" d="M12.58 2H2.5v10.08A2 2 0 004.42 14h8.16a2 2 0 002-1.92V3.92A2 2 0 0012.58 2ZM3.36 11.63c-.01 1.04.6 1.6 1.61 1.6 1.1.01 1.74-.75 1.66-1.84H5.48c.01.21-.01.51-.12.64a.45.45 0 01-.35.17c-.33-.01-.5-.25-.5-.73V9.2c0-.25.04-.44.11-.57.12-.24.56-.27.73-.04.13.13.14.46.13.68h1.15c.03-.56-.1-1.16-.43-1.46-.54-.57-1.83-.54-2.38-.01-.31.27-.46.67-.46 1.2v2.63Zm3.68-.24c-.03 1.07.47 1.86 1.58 1.85 1.54.06 1.97-1.64 1.34-2.76-.21-.37-.79-.67-1.25-.85-.35-.16-.5-.32-.5-.71 0-.36.15-.55.46-.55.17 0 .29.06.35.17.09.13.11.5.1.73h1.05c.02-.55-.1-1.15-.41-1.45-.49-.59-1.76-.56-2.24.02-.5.47-.54 1.62-.18 2.14.16.24.42.44.78.61l.17.08c.26.12.59.27.7.44.19.22.17.79.03.98a.45.45 0 01-.36.16c-.38.03-.54-.39-.51-.86H7.04Zm3.51 0c-.03 1.07.47 1.86 1.58 1.85 1.54.06 1.97-1.64 1.34-2.76-.21-.37-.79-.67-1.25-.85-.35-.16-.5-.32-.5-.71 0-.36.15-.55.46-.55.17 0 .29.06.35.17.09.13.11.5.1.73h1.05c.02-.55-.1-1.15-.41-1.45-.49-.59-1.76-.56-2.24.02-.5.47-.54 1.62-.18 2.14.16.24.42.44.78.61l.17.08c.26.12.59.27.7.44.19.22.17.79.03.98a.45.45 0 01-.36.16c-.38.03-.54-.39-.51-.86h-1.09Z" fill="currentColor"/>',
  toml: '<path d="M6 6h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M8 6v5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M5 3H3.5a.5.5 0 00-.5.5v9a.5.5 0 00.5.5H5M11 3h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5H11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  md: '<path d="M13 11V11.84c0 .1-.03.21-.1.29l-.75 1.04a.5.5 0 01-.4.2H4.25a.5.5 0 01-.4-.2l-.76-1.04A.5.5 0 013 11.84V3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M3 13v-2l5 1h5v1H3Z" fill="currentColor"/><path d="M6.63 3.04A2 2 0 018 4.94v6.79c0 .36-.37.6-.7.45l-3.5-1.56A.5.5 0 013.5 10.18V2.69c0-.34.33-.58.66-.47l2.47.83Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 3A1.5 1.5 0 008 4.5V13c0-.8 3.24-.96 4.5-1a.5.5 0 00.5-.5v-8a.5.5 0 00-.5-.5H9.5Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>',
  json: '<path d="M3.16 10.25l.84.13c.62.1 1.06.66 1.01 1.3l-.06.86a.5.5 0 00.28.48l.62.3a.5.5 0 00.53-.1l.62-.59a1.15 1.15 0 011.62 0l.62.59a.5.5 0 00.53.1l.62-.31a.5.5 0 00.27-.48l-.06-.86c-.05-.64.39-1.2 1.01-1.3l.84-.13a.5.5 0 00.17-.47l-.15-.68a.5.5 0 00-.28-.35l-.7-.49a1.15 1.15 0 01-.47-1.32l.42-.75a.5.5 0 00-.05-.69l-.43-.55a.5.5 0 00-.64-.08l-.81.25c-.6.19-1.23-.12-1.46-.71l-.31-.8a.5.5 0 00-.44-.39l-.68 0a.5.5 0 00-.47.39l-.3.79c-.23.6-.86.91-1.46.72l-.84-.26a.5.5 0 00-.65.08l-.42.55a.5.5 0 00-.05.69l.43.75a1.15 1.15 0 01-.47 1.32l-.69.48a.5.5 0 00-.28.35l-.15.69a.5.5 0 00.17.47Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.41 6.84a2 2 0 10-2.83 2.83 2 2 0 002.83-2.83Z" fill="currentColor"/>',
  lock: '<path d="M5 5a2 2 0 012-2h2a2 2 0 012 2v1H5V5Z" stroke="currentColor" stroke-width="1.2"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3.25 6.5c0-.69.56-1.25 1.25-1.25h7c.69 0 1.25.56 1.25 1.25v6c0 .69-.56 1.25-1.25 1.25h-7c-.69 0-1.25-.56-1.25-1.25v-6Zm5.5 3.16A1 1 0 008 8a1 1 0 00-.75 1.66V11a.75.75 0 001.5 0V9.66Z" fill="currentColor"/>',
  git: '<path d="M5 13a2 2 0 100-4 2 2 0 000 4Z" stroke="currentColor" stroke-width="1.2"/><path d="M11 7a2 2 0 100-4 2 2 0 000 4Z" fill="currentColor" stroke="currentColor" stroke-width="1.2"/><path d="M4.63 3.63v4.75" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M11 7a4 4 0 01-4 4" stroke="currentColor" stroke-width="1.2"/>',
  html: '<path d="M6 3L3 8l3 5M10 3l3 5-3 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>',
  file: '<path d="M3 5h8M3 8h10M3 11h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  chevron_right: '<path d="M6.64 4.64l3.25 3.36-3.25 3.37" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>',
  chevron_down: '<path d="M4.63 6.66l3.36 3.24 3.37-3.24" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>',
};

const COLORS = {
  folder: "#8b8b8b",
  folder_open: "#8b8b8b",
  ts: "#3178c6",
  js: "#f0db4f",
  jsx: "#61dafb",
  tsx: "#3178c6",
  css: "#a76ddb",
  html: "#e34c26",
  json: "#8b8b8b",
  md: "#519aba",
  toml: "#8b8b8b",
  lock: "#8b8b8b",
  git: "#e84d31",
  cjs: "#f0db4f",
  mjs: "#f0db4f",
  yaml: "#8b8b8b",
  yml: "#8b8b8b",
  sh: "#8b8b8b",
  default: "#8b8b8b",
};

const EXT_TO_ICON = {
  ts: "ts", tsx: "ts", js: "js", jsx: "js", cjs: "js", mjs: "js",
  css: "css", html: "html", json: "json", md: "md",
  toml: "toml", yaml: "toml", yml: "toml",
  lock: "lock", sh: "file",
};

export function getIcon(name, isFolder, expanded) {
  if (isFolder) {
    const key = expanded ? "folder_open" : "folder";
    return svg(PATHS[key], COLORS[key]);
  }
  const ext = name.split(".").pop()?.toLowerCase();
  if (name === ".gitignore" || name === ".npmignore") return svg(PATHS.git, COLORS.git);
  const iconKey = EXT_TO_ICON[ext] || "file";
  return svg(PATHS[iconKey], COLORS[ext] || COLORS.default);
}

export function getChevron(hasChildren, expanded) {
  if (!hasChildren) return '<span class="tree-node__chevron tree-node__chevron--leaf"></span>';
  const key = expanded ? "chevron_down" : "chevron_right";
  return `<span class="tree-node__chevron${expanded ? " tree-node__chevron--expanded" : ""}">${svg(PATHS[key], "#8b8b8b")}</span>`;
}
