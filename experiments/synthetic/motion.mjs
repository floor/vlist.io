/** Standalone RFC-013 experiment. No production vlist imports or DOM dependencies. */
export function createMotion({ getMax, onChange = () => {}, onEvent = () => {}, axis = "y", reducedMotion = false }) {
  let position = 0;
  let state = "idle";
  let pointer = null;
  let startMain = 0, startCross = 0, lastMain = 0, lastTime = 0;
  let velocity = 0, frameTime = 0;
  let animationStart = 0, animationFrom = 0, animationTo = 0;
  const friction = 0.006;
  const clamp = value => Math.max(0, Math.min(getMax(), value));
  const main = (x, y) => axis === "y" ? y : x;
  const cross = (x, y) => axis === "y" ? x : y;
  function transition(next, reason) {
    if (state !== next) onEvent("state", { from: state, to: next, reason });
    state = next;
  }
  function commit(value) {
    const next = clamp(value);
    if (next !== position) { position = next; onChange(position); }
    return next !== value;
  }
  function cancel(reason = "cancel") {
    velocity = 0;
    transition(pointer === null ? "idle" : "cancelled", reason);
    onEvent("cancel", { reason });
  }
  function jump(value, reason = "programmatic") {
    cancel(reason);
    commit(value);
  }
  return {
    get position() { return position; },
    get state() { return state; },
    get velocity() { return velocity; },
    get active() { return state === "inertia" || state === "animating"; },
    begin(id, x, y, time) {
      if (pointer !== null) { cancel("multitouch"); return; }
      cancel("new-touch");
      pointer = id;
      startMain = lastMain = main(x, y);
      startCross = cross(x, y);
      lastTime = time;
      transition("axis-pending", "pointerdown");
    },
    move(id, x, y, time) {
      if (id !== pointer || (state !== "axis-pending" && state !== "tracking")) return false;
      const current = main(x, y);
      if (state === "axis-pending") {
        const along = Math.abs(current - startMain);
        const across = Math.abs(cross(x, y) - startCross);
        if (Math.max(along, across) < 6) return false;
        if (across > along * 1.2) { cancel("cross-axis"); return false; }
        if (along < across * 1.2) return false;
        transition("tracking", "axis-lock");
      }
      const delta = lastMain - current;
      const dt = time - lastTime;
      if (dt > 0) {
        const sample = Math.max(-3, Math.min(3, delta / dt));
        velocity = dt > 80 ? 0 : sample * velocity < 0 ? sample : 0.65 * sample + 0.35 * velocity;
      }
      lastMain = current;
      lastTime = time;
      if (commit(position + delta)) { velocity = 0; onEvent("boundary", { source: "touch" }); }
      return true;
    },
    end(id, time) {
      if (id !== pointer) return;
      pointer = null;
      if (state === "tracking" && !reducedMotion && time - lastTime <= 80 && Math.abs(velocity) >= 0.02) {
        frameTime = time;
        transition("inertia", "release");
      } else { velocity = 0; transition("idle", "release"); }
    },
    cancel,
    reset(reason = "reset") { pointer = null; cancel(reason); },
    jump,
    by(delta, reason = "wheel") {
      cancel(reason);
      const previous = position;
      commit(position + delta);
      return position !== previous;
    },
    smooth(value, time) {
      cancel("smooth-navigation");
      if (pointer !== null || reducedMotion) { commit(value); return; }
      animationFrom = position;
      animationTo = clamp(value);
      animationStart = frameTime = time;
      transition("animating", "smooth-navigation");
    },
    resize() { cancel("resize"); commit(position); },
    tick(time) {
      if (state !== "inertia" && state !== "animating") return;
      const dt = time - frameTime;
      if (dt <= 0) return;
      frameTime = time;
      if (dt > 100) { cancel("frame-pause"); return; }
      if (state === "animating") {
        const progress = Math.min(1, (time - animationStart) / 400);
        commit(animationFrom + (animationTo - animationFrom) * (1 - (1 - progress) ** 3));
        if (progress === 1) transition("idle", "animation-end");
        return;
      }
      const decay = Math.exp(-friction * dt);
      const hit = commit(position + velocity * (1 - decay) / friction);
      velocity *= decay;
      if (hit) onEvent("boundary", { source: "inertia" });
      if (hit || Math.abs(velocity) < 0.02) { velocity = 0; transition("idle", hit ? "boundary" : "settled"); }
    },
  };
}
