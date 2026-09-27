// The homepage badge and the `?v=` cache keys come from vlist's build stamp.
// Staging builds vlist next, which keeps the last released version until the
// release bump: the badge said v3.0.0 on 3.0.1 work, and a new build kept the
// same CSS cache key.
import { describe, expect, it } from "bun:test";
import { versionFrom } from "../../src/server/config";

describe("versionFrom", () => {
  it("names a released build by its version", () => {
    expect(versionFrom({ version: "3.0.1", commit: "abc1234", released: true })).toBe("3.0.1");
  });

  it("adds the commit to an unreleased build, as semver build metadata", () => {
    expect(versionFrom({ version: "3.0.0", commit: "071835c", released: false })).toBe("3.0.0+071835c");
  });

  it("keeps the version when the source cannot tell: package.json, or a stamp from before `released`", () => {
    expect(versionFrom({ version: "3.0.0" })).toBe("3.0.0");
    expect(versionFrom({ version: "3.0.0", commit: "071835c" })).toBe("3.0.0");
    expect(versionFrom({ version: "3.0.0", commit: null, released: false })).toBe("3.0.0");
    expect(versionFrom({})).toBe("0.0.0");
  });
});
