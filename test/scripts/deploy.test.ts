import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");

// Run the real wrapper in an isolated process. Intercept gh before it can
// execute, record its arguments, and answer its workflow/status requests.
function deploy(args: string[], conclusion = "success") {
  const result = Bun.spawnSync(
    [process.execPath, "--preload", join(import.meta.dir, "fixtures/gh-preload.mjs"), join(root, "scripts/deploy.ts"), ...args],
    {
      cwd: root,
      // An unmocked gh cannot resolve through PATH either.
      env: { ...process.env, PATH: "", DEPLOY_TEST_CONCLUSION: conclusion },
      stdout: "pipe",
      stderr: "pipe",
      timeout: 10_000,
    },
  );
  const stderr = result.stderr.toString();
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr,
    commands: stderr.split("\n")
      .filter((line) => line.startsWith("DEPLOY_TEST_GH "))
      .map((line) => JSON.parse(line.slice("DEPLOY_TEST_GH ".length)) as string[]),
  };
}

test("the package exposes only the production deploy command", () => {
  const { scripts } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  expect(scripts.deploy).toBe("bun run scripts/deploy.ts");
  expect(scripts["deploy:staging"]).toBeUndefined();
});

test.each(["staging", "unsupported"])("rejects %s before invoking gh", (target) => {
  const result = deploy([target]);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Usage: bun run deploy");
  expect(result.commands).toEqual([]);
});

test("production dispatches and watches the same workflow", () => {
  const result = deploy([]);
  expect(result.exitCode).toBe(0);
  expect(result.commands).toEqual([
    ["gh", "workflow", "run", "deploy.yml", "--repo", "floor/vlist.io"],
    ["gh", "run", "list", "--workflow", "deploy.yml", "--repo", "floor/vlist.io", "--limit", "1", "--json", "databaseId,status,conclusion"],
    ["gh", "run", "view", "123", "--repo", "floor/vlist.io", "--json", "status,conclusion"],
  ]);
  expect(result.stdout).toContain("Deployed vlist.io successfully.");
});

test("a failed production run still fails the wrapper", () => {
  const result = deploy([], "failure");
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Deploy failed (failure).");
  expect(result.stderr).toContain("https://github.com/floor/vlist.io/actions/runs/123");
});
