// Shared native / synthetic scroll mode selector for the examples.
// vlist 3.0: `vlist` scrolls natively; `vlist/synthetic` owns wheel, touch and
// keyboard input. The mode lives in the URL (?mode=) so a reload keeps it.

import { createVList as createNativeVList } from "vlist";
import { createVList as createSyntheticVList } from "vlist/synthetic";

export const SCROLL_MODES = ["native", "synthetic"];

/** The mode from ?mode=, or `fallback` when absent or unknown. */
export const getScrollMode = (fallback = "native") => {
  const value = new URLSearchParams(location.search).get("mode");
  return SCROLL_MODES.includes(value) ? value : fallback;
};

/** The createVList factory for a mode. */
export const factoryFor = (mode) =>
  mode === "synthetic" ? createSyntheticVList : createNativeVList;

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
    writeUrl();
    sync();
    onChange(current);
  });
  return {
    /** Move the switch without treating it as a click. `notify` still runs onChange. */
    setMode(mode, notify = false) {
      if (!SCROLL_MODES.includes(mode) || mode === current) return;
      current = mode;
      writeUrl();
      sync();
      if (notify) onChange(current);
    },
  };
}
