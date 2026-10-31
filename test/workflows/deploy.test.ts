// test/workflows/deploy.test.ts
import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

interface Step { name?: string; uses?: string; run?: string; env?: Record<string, string>; with?: Record<string, string> }
interface Workflow {
  on: Record<string, { types?: string[]; branches?: string[] } | null>;
  concurrency?: { group?: string; "cancel-in-progress"?: boolean };
  jobs: Record<string, { steps: Step[] }>;
}

const workflow = Bun.YAML.parse(
  readFileSync(resolve(import.meta.dir, "../../.github/workflows/deploy.yml"), "utf-8"),
) as Workflow;
const steps: Step[] = Object.values(workflow.jobs)[0]?.steps ?? [];
const indexOf = (name: string): number => steps.findIndex((step) => step.name === name);
const script: string = steps[indexOf("Deploy via SSH")]?.with?.script ?? "";

// Production installed vlist from npm but redeployed only on a vlist.io push or
// by hand, so it served 3.1.6 through four vlist releases. vlist's publish job
// now sends `vlist-released`; this workflow answers it.
describe("production deploy follows vlist releases", () => {
  test("a vlist release triggers a deploy", () => {
    expect(workflow.on.repository_dispatch?.types).toEqual(["vlist-released"]);
    expect(workflow.on.push?.branches).toEqual(["main"]);
    expect("workflow_dispatch" in workflow.on).toBe(true);
  });

  test("a release dispatch and a vlist.io push queue instead of colliding", () => {
    expect(workflow.concurrency?.group).toBe("deploy-production");
    expect(workflow.concurrency?.["cancel-in-progress"]).toBe(false);
  });

  test("the released version is installed exactly, once the registry serves it", () => {
    expect(steps[indexOf("Deploy via SSH")]?.with?.envs).toContain("VLIST_VERSION");
    expect(script).toContain('grep -qF "\\"$VLIST_VERSION\\""');
    expect(script).toMatch(/sed -i .*file:\.\.\/vlist.*\$VLIST_SPEC/);
    expect(script).not.toContain('"vlist": "latest"|');
  });

  // 3.3.1's first release deploy: `npm view` saw the version, then `bun install`
  // reported "No version matching" a minute later. The installer reads the
  // abbreviated manifest, which can lag the full one; wait on that view, and
  // retry the install itself with a bounded backoff in case it still lags.
  test("the registry wait checks the view the installer reads", () => {
    expect(script).toContain("application/vnd.npm.install-v1+json");
    expect(script).toContain("https://registry.npmjs.org/vlist");
  });

  test("the production install retries with a bounded backoff, then fails", () => {
    const install = script.slice(script.indexOf("Resolving production dependencies"));
    expect(install).toMatch(/for try in \$\(seq 1 6\)/);
    expect(install).toContain("bun install --force --no-cache");
    expect(install).toMatch(/sleep \$\(\(try \* 10\)\)/);
    expect(install).toMatch(/after 6 attempts[\s\S]*exit 1/);
  });

  test("a version that is not a plain semver never reaches the server's shell", () => {
    const check = steps[indexOf("Check the requested version")];
    expect(check).toBeDefined();
    expect(indexOf("Check the requested version")).toBeLessThan(indexOf("Deploy via SSH"));
    expect(check?.run).toContain("^[0-9]+\\.[0-9]+\\.[0-9]+$");
  });

  test("the server's vlist source follows main, the released line, not staging", () => {
    expect(script).toContain("git fetch origin main");
    expect(script).toContain("git reset --hard origin/main");
    expect(script).not.toContain("origin/staging");
  });

  test("the deploy fails unless the live site shows the expected version", () => {
    expect(indexOf("Verify the live version")).toBeGreaterThan(indexOf("Purge Cloudflare cache"));
    expect(steps[indexOf("Verify the live version")]?.run).toContain("https://vlist.io");
  });
});

// 3.3.1's deploy deleted node_modules, the install then failed on a registry
// lag, and the live process was left serving assets from a directory that no
// longer existed. The previous modules must survive a failed install.
describe("a failed install leaves the running site's modules in place", () => {
  const installAt = script.indexOf("bun install --force --no-cache");
  const failAt = script.indexOf("after 6 attempts");
  const exitAt = script.indexOf("exit 1", failAt);
  // The failure branch: from the error line to the exit that ends the script.
  const failureBranch = script.slice(failAt, exitAt);
  // The post-success cleanup (the earlier rm only clears a stale aside copy).
  const cleanupAt = script.lastIndexOf("rm -rf node_modules.prev");

  test("the previous modules are moved aside, not deleted, before the install", () => {
    const moveAt = script.indexOf("mv node_modules node_modules.prev");
    expect(moveAt).toBeGreaterThan(-1);
    expect(moveAt).toBeLessThan(installAt);
    // Before the install, the live tree is never deleted: the only allowed rm
    // there clears the aside copy, node_modules.prev.
    expect(script.slice(0, installAt)).not.toMatch(/rm -rf node_modules(?![.\w])/);
  });

  test("a failed install puts the previous modules and package.json back, then exits", () => {
    expect(failAt).toBeGreaterThan(installAt);
    expect(exitAt).toBeGreaterThan(failAt);
    expect(failureBranch).toContain("mv node_modules.prev node_modules");
    expect(failureBranch).toContain("git checkout -- package.json");
  });

  test("the previous modules are removed only after a successful install, before pm2", () => {
    expect(cleanupAt).toBeGreaterThan(exitAt);
    expect(cleanupAt).toBeLessThan(script.indexOf("pm2 reload"));
  });

  // A run killed between the move and the restore leaves the last good tree
  // in node_modules.prev. The next deploy must keep it until an install
  // succeeds, and install over the partial tree the killed run left behind.
  test("an aside copy left by an interrupted run is kept until an install succeeds", () => {
    const asideAt = script.indexOf("mv node_modules node_modules.prev");
    expect(asideAt).toBeGreaterThan(-1);
    expect(asideAt).toBeLessThan(installAt);
    // The move only runs when no aside copy exists: a killed run's .prev is
    // the last good tree, so it is never deleted before the install.
    const guardAt = script.lastIndexOf("if [", asideAt);
    expect(script.slice(guardAt, asideAt)).toContain("! -d node_modules.prev");
    expect(script.slice(0, installAt)).not.toContain("rm -rf node_modules.prev");
  });
});
