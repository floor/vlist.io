// test/benchmarks/history-utils.test.ts
import { describe, test, expect } from "bun:test";
import {
  confidenceLabel,
  formatMetricValue,
  round,
  niceScale,
  niceDateTicks,
  formatTickValue,
} from "../../benchmarks/history-utils.js";

// =============================================================================
// confidenceLabel
// =============================================================================

describe("confidenceLabel", () => {
  test("returns high confidence for >= 20 runs", () => {
    expect(confidenceLabel(20)).toEqual({
      text: "High confidence",
      cls: "good",
    });
    expect(confidenceLabel(100)).toEqual({
      text: "High confidence",
      cls: "good",
    });
    expect(confidenceLabel(1000)).toEqual({
      text: "High confidence",
      cls: "good",
    });
  });

  test("returns moderate confidence for 5-19 runs", () => {
    expect(confidenceLabel(5)).toEqual({
      text: "Moderate confidence",
      cls: "ok",
    });
    expect(confidenceLabel(10)).toEqual({
      text: "Moderate confidence",
      cls: "ok",
    });
    expect(confidenceLabel(19)).toEqual({
      text: "Moderate confidence",
      cls: "ok",
    });
  });

  test("returns low confidence for < 5 runs", () => {
    expect(confidenceLabel(0)).toEqual({
      text: "Low confidence",
      cls: "low",
    });
    expect(confidenceLabel(1)).toEqual({
      text: "Low confidence",
      cls: "low",
    });
    expect(confidenceLabel(2)).toEqual({
      text: "Low confidence",
      cls: "low",
    });
    expect(confidenceLabel(4)).toEqual({
      text: "Low confidence",
      cls: "low",
    });
  });

  describe("boundary values", () => {
    test("4 is low, 5 is moderate", () => {
      expect(confidenceLabel(4).cls).toBe("low");
      expect(confidenceLabel(5).cls).toBe("ok");
    });

    test("19 is moderate, 20 is high", () => {
      expect(confidenceLabel(19).cls).toBe("ok");
      expect(confidenceLabel(20).cls).toBe("good");
    });
  });
});

// =============================================================================
// formatMetricValue
// =============================================================================

describe("formatMetricValue", () => {
  test("returns dash for null", () => {
    expect(formatMetricValue(null, "ms")).toBe("—");
  });

  test("returns dash for undefined", () => {
    expect(formatMetricValue(undefined, "ms")).toBe("—");
  });

  describe("percentages (%)", () => {
    test("formats with up to 1 decimal place", () => {
      const result = formatMetricValue(-14.6, "%");
      expect(result).toContain("14.6");
    });

    test("rounds beyond 1 decimal place", () => {
      const result = formatMetricValue(33.333, "%");
      expect(result).toContain("33.3");
    });

    test("handles zero", () => {
      const result = formatMetricValue(0, "%");
      expect(result).toBe("0");
    });
  });

  describe("memory (MB)", () => {
    test("formats with 2 decimal places", () => {
      const result = formatMetricValue(0.37, "MB");
      expect(result).toContain("0.37");
    });

    test("pads to 2 decimal places", () => {
      const result = formatMetricValue(3, "MB");
      expect(result).toContain("3.00");
    });

    test("formats small values", () => {
      const result = formatMetricValue(0.09, "MB");
      expect(result).toContain("0.09");
    });
  });

  describe("time (ms)", () => {
    test("formats with 1 decimal place", () => {
      const result = formatMetricValue(8.5, "ms");
      expect(result).toContain("8.5");
    });

    test("pads to 1 decimal place", () => {
      const result = formatMetricValue(90, "ms");
      expect(result).toContain("90.0");
    });
  });

  describe("FPS (fps)", () => {
    test("formats with 1 decimal place", () => {
      const result = formatMetricValue(120.5, "fps");
      expect(result).toContain("120.5");
    });

    test("pads to 1 decimal place", () => {
      const result = formatMetricValue(30, "fps");
      expect(result).toContain("30.0");
    });
  });

  describe("default (unknown unit)", () => {
    test("uses toLocaleString for unknown units", () => {
      const result = formatMetricValue(42, "items");
      expect(result).toBe("42");
    });

    test("handles empty unit", () => {
      const result = formatMetricValue(0, "");
      expect(result).toBe("0");
    });
  });
});

// =============================================================================
// round
// =============================================================================

describe("round", () => {
  test("rounds to 0 decimal places", () => {
    expect(round(3.7, 0)).toBe(4);
    expect(round(3.2, 0)).toBe(3);
  });

  test("rounds to 1 decimal place", () => {
    expect(round(3.75, 1)).toBe(3.8);
    expect(round(3.74, 1)).toBe(3.7);
  });

  test("rounds to 2 decimal places", () => {
    expect(round(3.456, 2)).toBe(3.46);
    expect(round(3.454, 2)).toBe(3.45);
  });

  test("rounds to 4 decimal places", () => {
    expect(round(1.23456789, 4)).toBe(1.2346);
  });

  test("handles negative values", () => {
    expect(round(-3.456, 2)).toBe(-3.46);
  });

  test("handles zero", () => {
    expect(round(0, 2)).toBe(0);
  });

  test("handles integers", () => {
    expect(round(42, 2)).toBe(42);
  });
});

// =============================================================================
// niceScale
// =============================================================================

describe("niceScale", () => {
  test("returns [min] when range is 0", () => {
    expect(niceScale(5, 5, 5)).toEqual([5]);
  });

  test("returns [min] when range is negative", () => {
    expect(niceScale(10, 5, 5)).toEqual([10]);
  });

  test("generates tick values that span the input range", () => {
    const ticks = niceScale(0, 100, 5);
    expect(ticks[0]).toBeLessThanOrEqual(0);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(100);
  });

  test("generates reasonable ticks for 0-100 range", () => {
    const ticks = niceScale(0, 100, 5);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.length).toBeLessThanOrEqual(12);
    // Should use nice step sizes (20, 25, etc.)
    const step = ticks[1] - ticks[0];
    expect([10, 20, 25, 50]).toContain(step);
  });

  test("handles small ranges (0-1)", () => {
    const ticks = niceScale(0, 1, 5);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks[0]).toBeLessThanOrEqual(0);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(1);
  });

  test("handles large ranges (0-10000)", () => {
    const ticks = niceScale(0, 10000, 5);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks[0]).toBeLessThanOrEqual(0);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(10000);
  });

  test("handles non-zero minimum", () => {
    const ticks = niceScale(50, 150, 5);
    expect(ticks[0]).toBeLessThanOrEqual(50);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(150);
  });

  test("generates evenly spaced ticks", () => {
    const ticks = niceScale(0, 100, 5);
    if (ticks.length >= 3) {
      const step = round(ticks[1] - ticks[0], 8);
      for (let i = 2; i < ticks.length; i++) {
        const thisStep = round(ticks[i] - ticks[i - 1], 8);
        expect(thisStep).toBeCloseTo(step, 6);
      }
    }
  });

  test("typical benchmark ranges — render time (0-100ms)", () => {
    const ticks = niceScale(5, 95, 5);
    expect(ticks[0]).toBeLessThanOrEqual(5);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(95);
    for (const t of ticks) {
      expect(Number.isFinite(t)).toBe(true);
    }
  });

  test("typical benchmark ranges — memory (0-15MB)", () => {
    const ticks = niceScale(0.2, 14.3, 5);
    expect(ticks[0]).toBeLessThanOrEqual(0.2);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(14.3);
  });

  test("typical benchmark ranges — FPS (50-120)", () => {
    const ticks = niceScale(50, 120.5, 5);
    expect(ticks[0]).toBeLessThanOrEqual(50);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(120.5);
  });
});

// =============================================================================
// niceDateTicks
// =============================================================================

describe("niceDateTicks", () => {
  test("returns [minMs] when range is 0", () => {
    const ts = Date.now();
    expect(niceDateTicks(ts, ts, 5)).toEqual([ts]);
  });

  test("returns [minMs] when range is negative", () => {
    expect(niceDateTicks(200, 100, 5)).toEqual([200]);
  });

  test("generates the requested number of ticks", () => {
    const min = new Date("2025-01-01").getTime();
    const max = new Date("2025-01-31").getTime();
    const ticks = niceDateTicks(min, max, 6);
    expect(ticks).toHaveLength(6);
  });

  test("first tick equals minMs", () => {
    const min = new Date("2025-01-01").getTime();
    const max = new Date("2025-01-31").getTime();
    const ticks = niceDateTicks(min, max, 6);
    expect(ticks[0]).toBe(min);
  });

  test("last tick equals maxMs", () => {
    const min = new Date("2025-01-01").getTime();
    const max = new Date("2025-01-31").getTime();
    const ticks = niceDateTicks(min, max, 6);
    expect(ticks[ticks.length - 1]).toBe(max);
  });

  test("ticks are in ascending order", () => {
    const min = new Date("2025-01-01").getTime();
    const max = new Date("2025-03-01").getTime();
    const ticks = niceDateTicks(min, max, 10);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
    }
  });

  test("ticks are evenly spaced", () => {
    const min = new Date("2025-01-01").getTime();
    const max = new Date("2025-01-31").getTime();
    const ticks = niceDateTicks(min, max, 4);
    const step = ticks[1] - ticks[0];
    for (let i = 2; i < ticks.length; i++) {
      const thisStep = ticks[i] - ticks[i - 1];
      // Allow 1ms rounding tolerance
      expect(Math.abs(thisStep - step)).toBeLessThanOrEqual(1);
    }
  });

  test("handles single tick (count = 1) — divides by zero, returns NaN", () => {
    const min = new Date("2025-01-01").getTime();
    const max = new Date("2025-01-31").getTime();
    // count=1 → step = range / 0 = Infinity → tick = NaN after Math.round
    const ticks = niceDateTicks(min, max, 1);
    expect(ticks).toHaveLength(1);
    expect(Number.isNaN(ticks[0])).toBe(true);
  });

  test("all ticks are integers (rounded)", () => {
    const min = new Date("2025-01-01").getTime();
    const max = new Date("2025-06-15").getTime();
    const ticks = niceDateTicks(min, max, 7);
    for (const tick of ticks) {
      expect(Number.isInteger(tick)).toBe(true);
    }
  });
});

// =============================================================================
// formatTickValue
// =============================================================================

describe("formatTickValue", () => {
  test("formats thousands with 'k' suffix", () => {
    expect(formatTickValue(1000)).toBe("1k");
    expect(formatTickValue(2000)).toBe("2k");
    expect(formatTickValue(10000)).toBe("10k");
  });

  test("formats non-round thousands with 1 decimal", () => {
    expect(formatTickValue(1500)).toBe("1.5k");
    expect(formatTickValue(2500)).toBe("2.5k");
  });

  test("formats integers without trailing zeros", () => {
    expect(formatTickValue(0)).toBe("0");
    expect(formatTickValue(5)).toBe("5");
    expect(formatTickValue(100)).toBe("100");
    expect(formatTickValue(999)).toBe("999");
  });

  test("formats decimals, removing trailing zeros", () => {
    expect(formatTickValue(0.5)).toBe("0.5");
    expect(formatTickValue(1.2)).toBe("1.2");
    expect(formatTickValue(3.14)).toBe("3.14");
  });

  test("removes trailing zeros from decimal values", () => {
    expect(formatTickValue(0.1)).toBe("0.1");
    expect(formatTickValue(0.1)).toBe("0.1");
  });

  test("handles very small values", () => {
    const result = formatTickValue(0.01);
    expect(result).toBe("0.01");
  });
});

