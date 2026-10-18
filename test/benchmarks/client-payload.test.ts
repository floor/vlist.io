// test/benchmarks/client-payload.test.ts
//
// Guards the crowdsourced benchmark payload. The submitted result keeps
// userAgent and hardwareConcurrency and must not collect device memory or
// screen size (privacy). The payload lives in a browser script, so this
// checks the source directly.

import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

const source = readFileSync(
  resolve(import.meta.dir, "../../benchmarks/script.js"),
  "utf8",
);

describe("benchmarks/script.js payload", () => {
  test("does not collect device memory or screen size", () => {
    expect(source).not.toContain("deviceMemory");
    expect(source).not.toContain("screen.width");
    expect(source).not.toContain("screen.height");
    expect(source).not.toContain("screenWidth");
    expect(source).not.toContain("screenHeight");
  });

  test("keeps userAgent and hardwareConcurrency", () => {
    expect(source).toContain("userAgent: navigator.userAgent");
    expect(source).toContain(
      "hardwareConcurrency: navigator.hardwareConcurrency",
    );
  });
});
