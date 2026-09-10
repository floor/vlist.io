import { describe, expect, test } from "bun:test";
import { handleRequest } from "../src/server/router";

const request = (path: string) => handleRequest(new Request(`https://vlist.io${path}`));

describe("deployed synthetic experiment", () => {
  test("slashless entry points preserve query parameters", async () => {
    for (const path of ["/experiments/synthetic", "/experiments/synthetic/native"]) {
      const response = await request(`${path}?axis=x&runway=16`);
      expect(response.status).toBe(308);
      expect(response.headers.get("Location")).toBe(`${path}/?axis=x&runway=16`);
    }
  });
  test("page, modules and comparison are served without stale caching", async () => {
    for (const [path, type, marker] of [
      ["", "text/html", 'id="device-tests"'],
      ["app.mjs", "application/javascript", 'revision: "floor-synthetic-2026-09-10"'],
      ["motion.mjs", "application/javascript", "export function createMotion"],
      ["native/", "text/html", 'href="../"'],
    ]) {
      const response = await request(`/experiments/synthetic/${path}`);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain(type);
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(await response.text()).toContain(marker);
    }
  });
  test("synthetic page is rendered through Eta and the shared site shell", async () => {
    const response = await request("/experiments/synthetic/");
    const html = await response.text();
    expect(html).toContain('class="header"');
    expect(html).toContain('href="/styles/shell.css"');
    expect(html).toContain('href="/experiments/synthetic/styles.css"');
    expect(html).toContain('src="/experiments/synthetic/app.mjs"');
    expect(html).toContain("Experiments / RFC-013");
    expect(html).not.toContain("<%= it.");
  });
});
