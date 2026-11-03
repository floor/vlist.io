// The scroll mode the page's switch selected: `scroll.mode` is "auto" (the
// default: native, synthetic past the browser's size limit), "native" or
// "synthetic" (vlist owns wheel, touch and keys). The switch keeps it in the
// URL (?mode=) and a session cookie; createVList from "vlist" applies it.

export const SCROLL_MODES = ["auto", "native", "synthetic"];

const readCookieMode = () => {
  const match = document.cookie.match(/(?:^|; )vlist-scroll-mode=([^;]*)/);
  const value = match ? decodeURIComponent(match[1]) : "";
  return SCROLL_MODES.includes(value) ? value : null;
};

/** ?mode= wins, then the session cookie, then `fallback`. */
export const getScrollMode = (fallback = "auto") => {
  const value = new URLSearchParams(location.search).get("mode");
  if (SCROLL_MODES.includes(value)) return value;
  return readCookieMode() ?? fallback;
};
