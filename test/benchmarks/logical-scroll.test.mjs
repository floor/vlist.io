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
