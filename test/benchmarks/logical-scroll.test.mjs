import { test, expect } from 'bun:test';
import { measureScrollRun } from '../../benchmarks/engine/scroll.js';

test('logical driver uses virtual bounds, measures setter work and never writes native offset', async () => {
  const original = { performance: globalThis.performance, raf: globalThis.requestAnimationFrame,
    caf: globalThis.cancelAnimationFrame, timer: globalThis.setTimeout };
  let now = 0, id = 0, position = 0, writes = 0;
  const frames = new Map(), timers = [];
  globalThis.performance = { now: () => now };
  globalThis.requestAnimationFrame = fn => { frames.set(++id, fn); return id; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  globalThis.setTimeout = fn => { timers.push(fn); return ++id; };
  const viewport = { scrollHeight: 100, clientHeight: 100, addEventListener() {}, removeEventListener() {},
    set scrollTop(value) { throw new Error(`native write: ${value}`); } };
  try {
    const resultPromise = measureScrollRun({ viewport, durationMs: 100, speedPxPerSec: 1000,
      logicalScroll: { max: 10000, set(value) { position = value; writes++; now += 1; }, get: () => position } });
    while (timers.length) {
      now += 16;
      const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(now);
      timers.shift()();
    }
    const result = await resultPromise;
    expect(result.distance).toBeGreaterThan(50);
    expect(result.inputWorkTimes.length).toBe(writes);
    expect(result.inputWorkTimes.every(value => value === 1)).toBe(true);
    expect(result.frameWorkTimes).toEqual([]); // no native-scroll cost proxy for synthetic
    expect(result.totalFrames).toBeGreaterThan(0);
  } finally {
    globalThis.performance = original.performance; globalThis.requestAnimationFrame = original.raf;
    globalThis.cancelAnimationFrame = original.caf; globalThis.setTimeout = original.timer;
  }
});

test('a missing logical range fails instead of reporting a motionless successful benchmark', async () => {
  await expect(measureScrollRun({ viewport: {}, durationMs: 100, speedPxPerSec: 1000,
    logicalScroll: { max: 0, set() {}, get: () => 0 } })).rejects.toThrow('positive virtual scroll range');
});

import { measurePointerFlingRun } from '../../benchmarks/engine/scroll.js';

async function runPointerDriver({ drift = false, inertia = true } = {}) {
  const original = { performance: globalThis.performance, raf: globalThis.requestAnimationFrame,
    caf: globalThis.cancelAnimationFrame, timer: globalThis.setTimeout, PointerEvent: globalThis.PointerEvent };
  let now = 0, id = 0, position = 1000, lastY = 0, direction = 1, remaining = 0;
  const frames = new Map(), timers = [], events = [];
  globalThis.performance = { now: () => now };
  globalThis.requestAnimationFrame = fn => { frames.set(++id, fn); return id; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  globalThis.setTimeout = fn => { timers.push(fn); return ++id; };
  globalThis.PointerEvent = class { constructor(type, values) { Object.assign(this, values, { type, timeStamp: now }); } };
  const nativeCapture = () => { throw new Error('No trusted active pointer ID'); };
  const viewport = { scrollTop: 0, setPointerCapture: nativeCapture,
    dispatchEvent(event) {
      events.push(event);
      if (event.type === 'pointerdown') lastY = event.clientY;
      if (event.type === 'pointermove') {
        this.setPointerCapture(event.pointerId);
        direction = Math.sign(lastY - event.clientY); position += lastY - event.clientY; lastY = event.clientY;
        if (drift) this.scrollTop = 1;
      }
      if (event.type === 'pointerup') {
        if (this.hasPointerCapture(event.pointerId)) this.releasePointerCapture(event.pointerId);
        remaining = inertia ? 3 : 0;
      }
    },
  };
  let result, error, done = false;
  try {
    const promise = measurePointerFlingRun({ viewport, content: { scrollTop: 0 }, getPosition: () => position, durationMs: 400 });
    promise.then(value => { result = value; done = true; }, value => { error = value; done = true; });
    for (let tick = 0; !done && tick < 100; tick++) {
      now += 16;
      if (remaining) { position += direction * 8; remaining--; }
      const pending = [...frames.values()]; frames.clear(); for (const fn of pending) fn(now);
      if (timers.length) timers.shift()();
      await Promise.resolve(); await Promise.resolve();
    }
    expect(done).toBe(true);
    expect(viewport.setPointerCapture).toBe(nativeCapture);
    expect(Object.hasOwn(viewport, 'hasPointerCapture')).toBe(false);
    expect(frames.size).toBe(0);
    return { result, error, events };
  } finally {
    globalThis.performance = original.performance; globalThis.requestAnimationFrame = original.raf;
    globalThis.cancelAnimationFrame = original.caf; globalThis.setTimeout = original.timer;
    globalThis.PointerEvent = original.PointerEvent;
  }
}

test('pointer driver alternates touch gestures, observes inertia and restores capture after idle', async () => {
  const { result, error, events } = await runPointerDriver();
  expect(error).toBeUndefined();
  expect(result.distances.length).toBeGreaterThan(1);
  expect(result.inertiaFrames.every(n => n > 0)).toBe(true);
  expect(result.distances.every(n => n > 128)).toBe(true);
  const moves = events.filter(e => e.type === 'pointermove');
  expect(moves.every(e => e.pointerType === 'touch' && e.pointerId === 1 && e.isPrimary)).toBe(true);
  expect(moves[0].clientY).toBeLessThan(200);
  expect(moves[4].clientY).toBeGreaterThan(200);
  expect(events.every((e,i) => i === 0 || e.timeStamp >= events[i-1].timeStamp)).toBe(true);
});

test('pointer driver fails closed on native movement and missing inertia', async () => {
  expect((await runPointerDriver({ drift: true })).error.message).toContain('native main-axis');
  expect((await runPointerDriver({ inertia: false })).error.message).toContain('no inertia');
});
