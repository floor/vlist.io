import { createMotion } from "./motion.mjs";

const $ = id => document.getElementById(id);
const axis = new URLSearchParams(location.search).get("axis") === "x" ? "x" : "y";
const vertical = axis === "y";
const viewport = $("viewport"), stage = $("stage"), scrub = $("scrub");
const total = 1_000_000, size = vertical ? 52 : 180;
document.body.classList.toggle("horizontal", !vertical);
$("axis").value = axis;
$("axis").onchange = event => { location.search = `?axis=${event.target.value}`; };
if (!vertical) $("header").textContent = "HORIZONTAL SYNTHETIC · VERTICAL NATIVE PAN";

let extent = 0, raf = 0, lastFrame = 0, lastHud = 0, dirty = true;
let blockTouches = false, dragged = false, suppressClickUntil = 0;
const pointers = new Set();
const pool = [], events = [];
const counters = { frameGaps: 0, boundaryContacts: 0, coverageFailures: 0, nativeMainScrollEvents: 0, pointerCancels: 0, multitouchCancels: 0, crossAxisScrollEvents: 0, maxVelocity: 0 };
const motion = createMotion({
  axis,
  getMax: () => Math.max(0, total * size - extent),
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  onChange: () => { dirty = true; schedule(); },
  onEvent(type, detail) {
    if (type === "boundary") counters.boundaryContacts++;
    events.push({ ms: Math.round(performance.now()), type, ...detail });
    if (events.length > 60) events.shift();
    schedule();
  },
});

function schedule() { if (!raf) raf = requestAnimationFrame(frame); }
function frame(time) {
  raf = 0;
  const moving = motion.active || motion.state === "tracking";
  if (moving && lastFrame && time - lastFrame > 32) counters.frameGaps++;
  lastFrame = moving ? time : 0;
  motion.tick(time);
  counters.maxVelocity = Math.max(counters.maxVelocity, Math.abs(motion.velocity));
  if (dirty) { render(); dirty = false; }
  if (time - lastHud > 100 || !moving) { hud(); lastHud = time; }
  if (motion.active || motion.state === "tracking") schedule();
}

function render() {
  const position = motion.position;
  const visibleStart = Math.floor(position / size);
  const visibleEnd = Math.min(total - 1, Math.ceil((position + extent) / size) - 1);
  const start = Math.max(0, visibleStart - 3);
  const end = Math.min(total - 1, visibleEnd + 3);
  const count = end - start + 1;
  while (pool.length < count) {
    const el = document.createElement("div");
    el.innerHTML = '<strong></strong><span>Native cross-axis overflow →</span><a href="#page-tail">Test link</a><span>Far column · keep panning</span>';
    el.className = "row";
    stage.append(el); pool.push(el);
  }
  for (let slot = 0; slot < pool.length; slot++) {
    const el = pool[slot];
    el.hidden = slot >= count;
    // .row has explicit display rules, so enforce hidden for spare pool entries.
    el.style.display = slot >= count ? "none" : "";
    if (slot >= count) continue;
    const index = start + slot;
    el.dataset.index = index;
    el.classList.toggle("odd", index % 2 === 1);
    el.firstElementChild.textContent = `Row ${index.toLocaleString()}`;
    el.style.transform = `translate${axis.toUpperCase()}(${index * size - position}px)`;
  }
  if (start * size > position + 0.5 || (end + 1) * size < position + extent - 0.5) counters.coverageFailures++;
  scrub.value = String(position / Math.max(1, total * size - extent) * 1_000_000);
  scrub.setAttribute("aria-valuetext", `Row ${visibleStart + 1} of ${total}`);
  $("nodes").textContent = `${count} / ${visibleEnd - visibleStart + 1}`;
}
function hud() {
  $("state").textContent = motion.state;
  $("logical").textContent = Math.round(motion.position).toLocaleString();
  $("native").textContent = vertical ? viewport.scrollTop : viewport.scrollLeft;
  $("gaps").textContent = counters.frameGaps;
  $("edges").textContent = counters.boundaryContacts;
  $("blanks").textContent = counters.coverageFailures;
  $("native-events").textContent = counters.nativeMainScrollEvents;
  $("events").textContent = events.map(e => `${e.ms}ms ${e.type} ${e.reason ?? e.source ?? ""} ${e.from ?? ""} → ${e.to ?? ""}`).join("\n");
}
const interactive = target => target.closest("a,button,input,select,textarea,[contenteditable]:not([contenteditable='false']),[data-native-input]");
const isTouch = event => event.pointerType === "touch" || event.pointerType === "pen";
window.addEventListener("pointerdown", event => {
  if (!isTouch(event)) return;
  pointers.add(event.pointerId);
  if (pointers.size > 1) {
    blockTouches = true; counters.multitouchCancels++;
    motion.cancel("multitouch"); return;
  }
  if (!viewport.contains(event.target) || interactive(event.target)) return;
  dragged = false;
  motion.begin(event.pointerId, event.clientX, event.clientY, performance.now());
});
window.addEventListener("pointermove", event => {
  if (!isTouch(event) || blockTouches) return;
  if (motion.move(event.pointerId, event.clientX, event.clientY, performance.now())) {
    dragged = true;
    if (!viewport.hasPointerCapture(event.pointerId)) viewport.setPointerCapture(event.pointerId);
    // touch-action defines browser pan/zoom policy; this only suppresses other defaults.
    if (event.cancelable) event.preventDefault();
  }
}, { passive: false });
function endPointer(event) {
  if (!isTouch(event)) return;
  const cancelled = event.type === "pointercancel";
  if (cancelled) { counters.pointerCancels++; motion.cancel("pointercancel"); }
  if (dragged) suppressClickUntil = performance.now() + 500;
  motion.end(event.pointerId, performance.now());
  pointers.delete(event.pointerId);
  if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  if (!pointers.size) {
    if (blockTouches || cancelled) motion.reset("all-pointers-ended");
    blockTouches = false;
    dragged = false;
  }
  schedule();
}
window.addEventListener("pointerup", endPointer);
window.addEventListener("pointercancel", endPointer);
viewport.addEventListener("click", event => {
  if (event.detail !== 0 && performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
}, true);
viewport.addEventListener("wheel", event => {
  if (event.ctrlKey || interactive(event.target)) return;
  const main = vertical ? event.deltaY : event.deltaX;
  const cross = vertical ? event.deltaX : event.deltaY;
  if (Math.abs(cross) > Math.abs(main)) return;
  const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? extent : 1;
  if (motion.by(main * factor, "wheel")) event.preventDefault();
}, { passive: false });
viewport.addEventListener("keydown", event => {
  if (event.target !== viewport || event.ctrlKey || event.metaKey || event.altKey) return;
  const forward = vertical ? "ArrowDown" : "ArrowRight";
  const back = vertical ? "ArrowUp" : "ArrowLeft";
  let target;
  if (event.key === forward) target = motion.position + size;
  if (event.key === back) target = motion.position - size;
  if (event.key === "PageDown") target = motion.position + extent;
  if (event.key === "PageUp") target = motion.position - extent;
  if (event.key === "Home") target = 0;
  if (event.key === "End") target = total * size;
  if (event.key === " ") target = motion.position + (event.shiftKey ? -extent : extent);
  if (target !== undefined) { event.preventDefault(); motion.jump(target, "keyboard"); }
});
viewport.addEventListener("scroll", () => {
  if (Math.abs(vertical ? viewport.scrollTop : viewport.scrollLeft) > 0.5) counters.nativeMainScrollEvents++;
  counters.crossAxisScrollEvents++;
  if (vertical) $("header").style.transform = `translateX(${-viewport.scrollLeft}px)`;
  schedule();
});
scrub.addEventListener("pointerdown", () => motion.cancel("slider-start"));
scrub.addEventListener("input", () => motion.jump(Number(scrub.value) / 1_000_000 * (total * size - extent), "slider"));
$("first").onclick = () => motion.jump(0);
$("middle").onclick = () => motion.jump(total * size / 2);
$("last").onclick = () => motion.jump(total * size);
$("smooth").onclick = () => motion.smooth(motion.position + size * 100, performance.now());
$("resize").onclick = () => { viewport.style.height = viewport.clientHeight > 280 ? "240px" : "360px"; };
new ResizeObserver(() => {
  extent = vertical ? viewport.clientHeight : viewport.clientWidth;
  motion.resize(); dirty = true; schedule();
}).observe(viewport);
function resetInput(reason) { pointers.clear(); blockTouches = false; dragged = false; motion.reset(reason); }
window.addEventListener("blur", () => resetInput("blur"));
document.addEventListener("visibilitychange", () => { if (document.hidden) resetInput("hidden"); });
$("reset").onclick = () => { for (const key in counters) counters[key] = 0; events.length = 0; schedule(); };
function snapshot() {
  return {
    schema: 1, revision: "floor-synthetic-2026-09-10", url: location.href, candidate: "B-standalone-synthetic", timestamp: new Date().toISOString(),
    physicalDeviceSignoff: "pending", notes: $("notes").value, userAgent: navigator.userAgent,
    axis, touchAction: getComputedStyle(viewport).touchAction, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    viewport: { width: viewport.clientWidth, height: viewport.clientHeight, devicePixelRatio },
    state: motion.state, logical: motion.position, max: total * size - extent,
    nativeMainOffset: vertical ? viewport.scrollTop : viewport.scrollLeft,
    mainScrollExtent: vertical ? viewport.scrollHeight : viewport.scrollWidth,
    nodes: pool.filter(el => !el.hidden).length, counters: { ...counters }, events: [...events],
  };
}
$("export").onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = `rfc-013-synthetic-${axis}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
// Read-only browser-harness seam. Navigation exercises the actual controls/events.
window.__rfc013 = { snapshot };
schedule();
