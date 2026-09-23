// Shared native / synthetic scroll mode selector for the examples.
// vlist 3.0: `vlist` scrolls natively; `vlist/synthetic` owns wheel, touch and
// keyboard input. The mode lives in the URL (?mode=) so a reload keeps it.

import { createVList as createNativeVList, scrollbar } from "vlist";
import { createVList as createSyntheticVList } from "vlist/synthetic";

export const SCROLL_MODES = ["native", "synthetic"];
export const SCROLL_MODE_COOKIE = "vlist-scroll-mode";

const readCookieMode = () => {
  const match = document.cookie.match(/(?:^|; )vlist-scroll-mode=([^;]*)/);
  const value = match ? decodeURIComponent(match[1]) : "";
  return SCROLL_MODES.includes(value) ? value : null;
};

/** ?mode= wins, then the session cookie, then `fallback`. */
export const getScrollMode = (fallback = "native") => {
  const value = new URLSearchParams(location.search).get("mode");
  if (SCROLL_MODES.includes(value)) return value;
  return readCookieMode() ?? fallback;
};

/** Session cookie. It dies when the browser closes. */
export const rememberScrollMode = (mode) => {
  if (!SCROLL_MODES.includes(mode)) return;
  document.cookie = `${SCROLL_MODE_COOKIE}=${mode}; path=/; samesite=lax`;
};

/** The createVList factory for a mode. */
export const factoryFor = (mode) =>
  mode === "synthetic" ? createSyntheticVList : createNativeVList;

/**
 * The list for the shared shell switch. Synthetic has no browser scrollbar,
 * so one is added unless the example already passed one.
 */
export const createVList = (config, plugins = []) => {
  const mode = getScrollMode("native");
  const list = Array.isArray(plugins) ? plugins : [];
  const next = mode === "synthetic" && !list.some((plugin) => plugin?.name === "scrollbar")
    ? [...list, scrollbar({ autoHide: true })]
    : list;
  return factoryFor(mode)(config, next);
};

/**
 * Wire a segmented control whose buttons carry data-mode="native" or "synthetic".
 * Keeps ?mode= in sync and calls onChange(mode) when the user picks the other mode.
 */
export function bindScrollModeSelector(element, initialMode, onChange) {
  let current = initialMode;
  const sync = () => {
    element.querySelectorAll("[data-mode]").forEach((button) => {
      button.classList.toggle(
        "ui-segmented__btn--active",
        button.dataset.mode === current,
      );
    });
  };
  const writeUrl = () => {
    const url = new URL(location.href);
    url.searchParams.set("mode", current);
    history.replaceState(null, "", url);
  };
  sync();
  element.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button || button.disabled || button.dataset.mode === current) return;
    current = button.dataset.mode;
    rememberScrollMode(current);
    writeUrl();
    sync();
    onChange(current);
  });
  return {
    /** Move the switch without treating it as a click. `notify` still runs onChange. */
    setMode(mode, notify = false) {
      if (!SCROLL_MODES.includes(mode) || mode === current) return;
      current = mode;
      rememberScrollMode(current);
      writeUrl();
      sync();
      if (notify) onChange(current);
    },
  };
}
