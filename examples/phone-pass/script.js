// Phone pass — the touch behaviours no desktop browser can answer.
//
// FLO-87 asks for iOS Safari callouts, Android Chrome, momentum catching, pen
// input and carousel folds on touch, checked on real devices before 3.0.0.
// Those are judgements a person makes with a finger; this page's job is to make
// each one a thirty-second task and to record what actually happened, so
// "it felt wrong" arrives with numbers attached.
//
// Everything measured here is read from the rendered DOM, never from the
// library's own idea of where it is. A list can believe it is in the right
// place while the pixels say otherwise, and on this page the pixels win.

import { sortable, carousel } from "vlist";
import { createVList } from "vlist/synthetic";
import { createVList as createNativeVList } from "vlist";

const ITEM_H = 64;
const TESTS = ["longpress", "handle", "momentum", "pen", "fold", "zoom"];

const $ = (id) => document.getElementById(id);
const set = (id, text, tone) => {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.dataset.tone = tone ?? "";
};

// =============================================================================
// Data
// =============================================================================

const WORDS = ["Anchor", "Beacon", "Cinder", "Dapple", "Ember", "Fathom", "Gossamer",
  "Harbour", "Inkwell", "Juniper", "Kestrel", "Lantern", "Marrow", "Nimbus",
  "Orchard", "Pewter", "Quarry", "Rialto", "Saffron", "Thistle", "Umber",
  "Vellum", "Willow", "Yarrow"];

const rows = (n) => Array.from({ length: n }, (_, i) => ({
  id: i,
  name: `${WORDS[i % WORDS.length]} ${Math.floor(i / WORDS.length) + 1}`,
  meta: `row ${i + 1}`,
}));

const rowTemplate = (item) => `
  <div class="ppr">
    <span class="ppr__grip" aria-hidden="true">⠿</span>
    <span class="ppr__text"><b>${item.name}</b><em>${item.meta}</em></span>
  </div>`;

const slideTemplate = (item) => `
  <div class="pps" style="--h:${(item.id * 37) % 360}">
    <span>${item.name}</span>
  </div>`;

// =============================================================================
// Device line — what the result needs to be read against
// =============================================================================

function describeDevice() {
  const d = [
    `${screen.width}×${screen.height} @${devicePixelRatio}x`,
    `viewport ${innerWidth}×${innerHeight}`,
    navigator.maxTouchPoints ? `${navigator.maxTouchPoints} touch points` : "no touch reported",
  ];
  $("device").textContent = d.join(" · ");
  return { ua: navigator.userAgent, ...Object.fromEntries(d.map((x, i) => [i, x])) };
}

// =============================================================================
// 1 — long press starts a drag, and nothing else
//
// The failure this is looking for is iOS Safari's own long-press behaviour
// winning the gesture: the text selection magnifier, or the callout bar. Both
// arrive as events we can hear, so the card reports them rather than relying on
// the tester noticing a menu that appears and vanishes.
// =============================================================================

function longPress() {
  const host = $("list-longpress");
  let started = false;
  let callout = null;
  let order = null;

  const list = createNativeVList(
    { container: host, items: rows(40), item: { height: ITEM_H, template: rowTemplate } },
    [sortable()],
  );
  order = list.items.map((i) => i.id).join(",");

  host.addEventListener("pointerdown", (e) => set("lp-pointer", e.pointerType, "info"), { passive: true });
  // A callout or a selection starting means the browser took the gesture.
  for (const type of ["contextmenu", "selectstart"]) {
    host.addEventListener(type, () => {
      callout = type;
      set("lp-callout", `${type} fired`, "bad");
      mark("longpress", false, `${type} fired during the press`);
    });
  }
  list.on("sort:start", () => {
    started = true;
    set("lp-start", "yes", "good");
    if (callout === null) set("lp-callout", "none", "good");
  });
  list.on("sort:end", ({ fromIndex, toIndex }) => {
    const now = list.items.map((i) => i.id).join(",");
    const moved = now !== order;
    order = now;
    set("lp-moved", moved ? `${fromIndex} → ${toIndex}` : "no change", moved ? "good" : "warn");
    if (started && callout === null && moved) mark("longpress", true, `moved ${fromIndex}→${toIndex}, no callout`);
  });
  return list;
}

// =============================================================================
// 2 — with a handle, only the handle drags
//
// Two things have to be true and they pull against each other: the grip must
// start a drag, and the body must not. The second is the one that breaks, and
// it breaks by stealing a scroll.
// =============================================================================

function handle() {
  const host = $("list-handle");
  let gripDragged = false;
  let bodyScrolled = false;
  let bodyDragged = false;
  let downOnGrip = false;
  let scrollAtDown = 0;

  const list = createNativeVList(
    { container: host, items: rows(40), item: { height: ITEM_H, template: rowTemplate } },
    [sortable({ handle: ".ppr__grip" })],
  );

  host.addEventListener("pointerdown", (e) => {
    downOnGrip = !!e.target.closest(".ppr__grip");
    scrollAtDown = list.getScrollPosition();
  }, { passive: true });

  host.addEventListener("pointerup", () => {
    if (downOnGrip) return;
    if (Math.abs(list.getScrollPosition() - scrollAtDown) > 8) {
      bodyScrolled = true;
      set("hd-body", "yes", "good");
    }
    settle();
  }, { passive: true });

  list.on("sort:start", () => {
    if (downOnGrip) { gripDragged = true; set("hd-grip", "yes", "good"); }
    else { bodyDragged = true; set("hd-leak", "YES — the body started a drag", "bad"); }
    settle();
  });

  const settle = () => {
    if (bodyDragged) return mark("handle", false, "dragging the body started a sort");
    if (!bodyDragged) set("hd-leak", "no", "good");
    if (gripDragged && bodyScrolled) mark("handle", true, "grip drags, body scrolls");
  };
  return list;
}

// =============================================================================
// 3 — catching a list in mid-flight
//
// "Momentum catching" means a finger landing on a coasting list stops it where
// it is. The measurement is the distance it travelled in the 250 ms after the
// finger landed: a list that caught properly moves almost nothing, and one that
// ignored the touch keeps going for hundreds of pixels.
// =============================================================================

function momentum() {
  const host = $("list-momentum");
  let velocity = 0;
  let catches = 0;
  let worst = 0;

  const list = createVList(
    { container: host, items: rows(400), item: { height: ITEM_H, template: rowTemplate } },
    [],
  );
  list.on("velocity:change", ({ velocity: v }) => { velocity = Math.abs(v); });

  host.addEventListener("pointerdown", () => {
    const speed = velocity;
    if (speed < 200) return;               // not coasting; nothing to catch
    const before = list.getScrollPosition();
    set("mo-speed", `${Math.round(speed)} px/s`, "info");
    setTimeout(() => {
      const drift = Math.abs(list.getScrollPosition() - before);
      catches += 1;
      worst = Math.max(worst, drift);
      set("mo-count", String(catches));
      set("mo-drift", `${Math.round(drift)} px`, drift <= 24 ? "good" : "bad");
      if (catches >= 2) {
        mark("momentum", worst <= 24, `worst slide after catch ${Math.round(worst)} px over ${catches} catches`);
      }
    }, 250);
  }, { passive: true });

  return list;
}

// =============================================================================
// 4 — a stylus behaves like a finger
// =============================================================================

function pen() {
  const host = $("list-pen");
  const seen = new Set();

  const list = createNativeVList(
    { container: host, items: rows(40), item: { height: ITEM_H, template: rowTemplate } },
    [sortable()],
  );
  host.addEventListener("pointerdown", (e) => {
    seen.add(e.pointerType);
    set("pe-types", [...seen].join(", "), seen.has("pen") ? "good" : "info");
  }, { passive: true });
  list.on("sort:start", () => {
    set("pe-start", "yes", "good");
    if (seen.has("pen")) mark("pen", true, `drag started with pointerType ${[...seen].join("/")}`);
  });
  return list;
}

// =============================================================================
// 5 — the carousel never shows its seam
//
// A wrap is invisible when the pixels keep moving smoothly across it. So this
// samples the first rendered slide's position on the screen, every frame, while
// a finger is down, and keeps the largest step between consecutive frames. A
// visible wrap is a single enormous step in an otherwise even sequence.
//
// Sampling only runs while touching, so an idle page costs nothing.
// =============================================================================

function fold() {
  const host = $("list-fold");
  let folds = 0;
  let frames = 0;
  let biggest = 0;
  let sampling = false;
  let last = null;

  const list = createVList(
    {
      container: host,
      orientation: "horizontal",
      items: rows(12),
      item: { height: 160, width: 140, template: slideTemplate },
    },
    [carousel({ snap: false, gap: 8 })],
  );

  list.on("carousel:change", () => { folds += 1; set("fo-folds", String(folds)); });

  const sample = () => {
    if (!sampling) return;
    const first = host.querySelector(".pps");
    if (first) {
      const x = first.getBoundingClientRect().left;
      if (last !== null) {
        const step = Math.abs(x - last);
        // A step larger than one slide is the seam showing. Normal motion is a
        // few pixels a frame; a wrap that leaks is hundreds.
        if (step > biggest) {
          biggest = step;
          set("fo-jump", `${Math.round(biggest)} px`, biggest > 140 ? "bad" : "good");
        }
      }
      last = x;
      frames += 1;
      if (frames % 10 === 0) set("fo-frames", String(frames));
    }
    requestAnimationFrame(sample);
  };

  host.addEventListener("pointerdown", () => {
    if (sampling) return;
    sampling = true; last = null;
    requestAnimationFrame(sample);
  }, { passive: true });

  host.addEventListener("pointerup", () => {
    // Keep sampling through the inertia that follows the finger.
    setTimeout(() => {
      sampling = false;
      set("fo-frames", String(frames));
      if (frames > 120) {
        mark("fold", biggest <= 140, `${folds} wraps, biggest frame step ${Math.round(biggest)} px over ${frames} frames`);
      }
    }, 1200);
  }, { passive: true });

  return list;
}

// =============================================================================
// 6 — dragging while the page is zoomed
//
// Reported from an iPhone: pinch-zoom the page, drag a row, and the row is not
// where the finger is. The sortable ghost is `position: fixed` placed at the
// pointer's client coordinates, and a pinch-zoom splits the viewport in two —
// a layout viewport that fixed positioning resolves against, and a visual
// viewport that the finger is in. When those two are panned apart, anything
// that assumes they are the same lands wrong by exactly that distance.
//
// Chrome's page-scale emulation does not reproduce it, so this measures it on
// the device instead: the gap between the finger and the row it is dragging,
// against the visual viewport's own offset. If the two agree, the cause is
// established rather than guessed.
// =============================================================================

function zoom() {
  const host = $("list-zoom");
  let dragging = false;
  let worstGap = 0;
  let worstOffset = 0;
  let explained = null;

  const list = createNativeVList(
    { container: host, items: rows(40), item: { height: ITEM_H, template: rowTemplate } },
    [sortable()],
  );

  const vv = () => window.visualViewport;

  const report = () => {
    const v = vv();
    set("zo-scale", v ? `${v.scale.toFixed(2)}×` : "not reported", v && v.scale > 1.05 ? "info" : "");
    set("zo-offset", v ? `${Math.round(v.offsetLeft)}, ${Math.round(v.offsetTop)} px` : "—");
  };
  report();
  vv()?.addEventListener("resize", report);
  vv()?.addEventListener("scroll", report);

  list.on("sort:start", () => { dragging = true; worstGap = 0; worstOffset = 0; sample(); });
  list.on("sort:end", () => { dragging = false; settle(); });
  list.on("sort:cancel", () => { dragging = false; settle(); });

  let fingerX = 0, fingerY = 0;
  host.addEventListener("pointermove", (e) => { fingerX = e.clientX; fingerY = e.clientY; }, { passive: true });

  function sample() {
    if (!dragging) return;
    const ghost = document.querySelector(".vlist-sort-ghost");
    const v = vv();
    if (ghost && fingerY) {
      const r = ghost.getBoundingClientRect();
      // The finger should be inside the row it is dragging. Measure how far
      // outside it is, on each axis, and keep the worst.
      const dy = fingerY < r.top ? r.top - fingerY : fingerY > r.bottom ? fingerY - r.bottom : 0;
      const dx = fingerX < r.left ? r.left - fingerX : fingerX > r.right ? fingerX - r.right : 0;
      const gap = Math.max(dx, dy);
      if (gap > worstGap) {
        worstGap = gap;
        worstOffset = v ? Math.max(Math.abs(v.offsetLeft), Math.abs(v.offsetTop)) : 0;
        set("zo-gap", `${Math.round(worstGap)} px`, worstGap > 8 ? "bad" : "good");
        // Within a few pixels of the visual viewport's own offset is the
        // signature of the layout/visual viewport split, rather than some
        // unrelated drift.
        explained = worstOffset > 4 && Math.abs(worstGap - worstOffset) <= Math.max(6, worstOffset * 0.25);
        set("zo-explains", worstGap <= 8 ? "no gap to explain"
          : explained ? `yes — offset is ${Math.round(worstOffset)} px`
          : `no — offset is only ${Math.round(worstOffset)} px`,
          worstGap <= 8 ? "good" : explained ? "bad" : "warn");
      }
    }
    requestAnimationFrame(sample);
  }

  function settle() {
    if (worstGap === 0) return;
    const zoomed = (vv()?.scale ?? 1) > 1.05;
    mark("zoom", worstGap <= 8,
      `${zoomed ? "zoomed" : "unzoomed"} ${(vv()?.scale ?? 1).toFixed(2)}×, worst finger-to-row gap ${Math.round(worstGap)} px` +
      (explained === true ? ", matching the visual viewport offset" : explained === false ? ", not explained by the viewport offset" : ""));
  }

  return list;
}

// =============================================================================
// Verdicts
//
// Every card can be answered by hand. The automatic marks are a starting point
// and a record, not the verdict: a person's eye on a real screen outranks them,
// which is the entire reason this page exists rather than another test suite.
// =============================================================================

const results = {};

function mark(test, pass, detail) {
  if (results[test]?.byHand) return;      // never overwrite a human answer
  results[test] = { pass, detail, byHand: false };
  paint(test);
  summarise();
}

function answer(test, pass) {
  results[test] = { pass, detail: results[test]?.detail ?? "answered by hand", byHand: true };
  paint(test);
  summarise();
}

function paint(test) {
  const box = document.querySelector(`.pp__verdict[data-for="${test}"]`);
  if (!box) return;
  const r = results[test];
  box.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("is-on", r && b.dataset.pass === String(r.pass));
  });
  const note = box.querySelector(".pp__auto");
  if (note) {
    note.textContent = r ? (r.byHand ? "your answer" : `measured: ${r.detail}`) : "";
    note.dataset.tone = r ? (r.pass ? "good" : "bad") : "";
  }
  document.querySelector(`[data-test="${test}"]`)?.setAttribute("data-state", r ? (r.pass ? "pass" : "fail") : "");
}

function summarise() {
  const lines = [
    "vlist phone pass — FLO-87",
    new Date().toISOString(),
    navigator.userAgent,
    $("device").textContent,
    "",
  ];
  for (const t of TESTS) {
    const r = results[t];
    const label = { longpress: "1 long press drag", handle: "2 handle only", momentum: "3 momentum catch", pen: "4 stylus", fold: "5 carousel wrap", zoom: "6 drag while zoomed" }[t];
    lines.push(r ? `${r.pass ? "PASS" : "FAIL"}  ${label} — ${r.detail}` : `----  ${label} — not run`);
  }
  const done = TESTS.filter((t) => results[t]);
  lines.push("", `${done.filter((t) => results[t].pass).length} of ${done.length} answered passed.`);
  $("summary").textContent = lines.join("\n");
}

function buildVerdicts() {
  document.querySelectorAll(".pp__verdict").forEach((box) => {
    const test = box.dataset.for;
    box.innerHTML = `
      <button type="button" data-pass="true">Passed</button>
      <button type="button" data-pass="false">Failed</button>
      <span class="pp__auto"></span>`;
    box.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) answer(test, b.dataset.pass === "true");
    });
  });
}

// =============================================================================
// Boot
// =============================================================================

describeDevice();
buildVerdicts();
summarise();

longPress();
handle();
momentum();
pen();
fold();
zoom();

/**
 * Copy the summary.
 *
 * `navigator.clipboard` is unavailable on a plain http:// origin, which is what
 * a LAN address is — and this page is meant to be opened from a phone over the
 * network. The first version called it, let it throw, and only selected the
 * text as a fallback while still looking like it had worked. Someone then
 * pasted whatever was already on their clipboard and sent that instead, which
 * is a worse failure than not copying at all.
 *
 * So: try the modern API only where it can work, fall back to execCommand,
 * which does work on an insecure origin, and never claim success that did not
 * happen.
 */
async function copySummary(text) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through — a permission prompt was refused, or the page lost focus
    }
  }

  const scratch = document.createElement("textarea");
  scratch.value = text;
  scratch.setAttribute("readonly", "");
  // Off-screen but focusable, and no zoom on iOS from a 16px font.
  scratch.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px";
  document.body.appendChild(scratch);
  scratch.select();
  scratch.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  scratch.remove();
  return ok;
}

$("copy").addEventListener("click", async () => {
  const button = $("copy");
  const text = $("summary").textContent;
  const copied = await copySummary(text);

  if (copied) {
    button.textContent = "Copied";
    button.dataset.state = "ok";
  } else {
    // Select the summary itself so a long press can copy it, and say plainly
    // that nothing is on the clipboard yet.
    const range = document.createRange();
    range.selectNodeContents($("summary"));
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    button.textContent = "Could not copy — it is selected, copy it by hand";
    button.dataset.state = "manual";
  }

  setTimeout(() => {
    button.textContent = "Copy result";
    button.dataset.state = "";
  }, 4000);
});

// Say up front when the clipboard button cannot work, rather than at the moment
// someone needs it to.
if (!window.isSecureContext) {
  const note = document.createElement("p");
  note.className = "pp__note";
  note.textContent =
    "This page is on a plain http address, so the browser does not allow one-tap copying. " +
    "The button will select the text for you and you can copy it by hand.";
  $("copy").insertAdjacentElement("beforebegin", note);
}
