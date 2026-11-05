// Auto search for the Code Explorer.
// Uses the public list methods openSearch is folded into setQuery, plus
// closeSearch and the search:open / search:close events. The bar stays
// mounted (position top or bottom) and this module only toggles a class.

export const AUTO_HIDDEN_CLASS = "cx-search--hidden";

const CHAR = /[\p{L}\p{N}]/u;

export function isEditableTarget(target) {
  if (target == null || typeof target !== "object") return false;
  if (target.isContentEditable === true) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

// One printable letter or number. Ctrl/Cmd never open the bar.
// Alt alone is allowed: on a Mac, Option replaces `key` (measured in Chrome
// 156, Swiss French: Option+E is "€", altKey true). "€" fails CHAR, so it
// does not open. Ctrl+Alt is allowed so an AltGr letter still can.
export function isAutoKey(event) {
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return false;
  if (event.metaKey || (event.ctrlKey && !event.altKey)) return false;
  if (typeof event.key !== "string" || event.key.length !== 1 || !CHAR.test(event.key)) return false;
  return !isEditableTarget(event.target);
}

export function bindAutoSearch(list, container) {
  const bar = () => container.querySelector(".vlist-search");
  const input = () => container.querySelector(".vlist-search__input");
  const hide = () => bar()?.classList.add(AUTO_HIDDEN_CLASS);
  const show = () => bar()?.classList.remove(AUTO_HIDDEN_CLASS);

  hide();

  let returnFocus = null;

  const remember = () => {
    const active = container.ownerDocument?.activeElement ?? null;
    if (active != null && active !== input()) returnFocus = active;
  };

  const restore = () => {
    const target = returnFocus;
    returnFocus = null;
    if (target != null && target.isConnected !== false && typeof target.focus === "function") {
      target.focus({ preventScroll: true });
      return;
    }
    const viewport = container.querySelector(".vlist-viewport");
    viewport?.focus?.({ preventScroll: true });
  };

  const offOpen = list.on("search:open", () => show());
  const offClose = list.on("search:close", () => {
    hide();
    restore();
  });

  // Capture runs before the list's own keydown on `.vlist` (create.ts),
  // so the node that had focus is recorded before openSearch moves it.
  const onKeydownCapture = () => remember();

  const onKeydown = (event) => {
    const el = bar();
    if (!el || !el.classList.contains(AUTO_HIDDEN_CLASS) || !isAutoKey(event)) return;
    event.preventDefault();
    list.setQuery(event.key);
    const field = input();
    if (field && typeof field.setSelectionRange === "function") {
      const end = field.value.length;
      field.setSelectionRange(end, end);
    }
  };

  // Capture beats the clear button's own click, which only empties the
  // query and then focuses the input (searchbar.ts onClearClick).
  const onClearClick = (event) => {
    const target = event.target;
    const clear = typeof target?.closest === "function"
      ? target.closest(".vlist-search__clear-button")
      : null;
    if (!clear || !bar()?.contains(clear)) return;
    event.preventDefault();
    event.stopPropagation();
    list.closeSearch();
  };

  container.addEventListener("keydown", onKeydownCapture, true);
  container.addEventListener("keydown", onKeydown);
  container.addEventListener("click", onClearClick, true);

  return () => {
    offOpen?.();
    offClose?.();
    container.removeEventListener("keydown", onKeydownCapture, true);
    container.removeEventListener("keydown", onKeydown);
    container.removeEventListener("click", onClearClick, true);
  };
}
