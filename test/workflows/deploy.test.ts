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
// lag, and the live process served /dist/* from a path that no longer existed
// for about 45 minutes. Moving the tree aside is not enough: the path must
// stay present for the whole install. Install into a side directory and swap
// the finished tree in with renames only after the install has succeeded.
describe("the live modules stay in place until the new install succeeds", () => {
  const installAt = script.indexOf("bun install --force --no-cache");
  const installCwdAt = script.indexOf("cd .deploy-next && bun install");
  const failAt = script.indexOf("after 6 attempts");
  const exitAt = script.indexOf("exit 1", failAt);
  // The failure branch: from the error line to the exit that ends the script.
  const failureBranch = script.slice(failAt, exitAt);
  const swapAt = script.indexOf("mv .deploy-next/node_modules node_modules");
  const reloadAt = script.indexOf("pm2 reload");
  const retireAt = script.lastIndexOf("rm -rf .deploy-prev");

  test("the install runs in a side directory, never in the live one", () => {
    expect(installCwdAt).toBeGreaterThan(-1);
    expect(installCwdAt).toBeLessThan(failAt);
    expect(script).toContain("mkdir -p .deploy-next");
    expect(script).toContain("cp package.json .deploy-next/package.json");
    // Before the install, the live tree is neither moved nor removed. The one
    // move into node_modules is the recovery guard for a run killed between
    // the two swap renames; it runs only when node_modules is missing.
    expect(script.slice(0, installAt)).not.toMatch(/(?:mv|rm -rf) node_modules(?![.\w])/);
  });

  test("a failed install leaves the live modules untouched and exits", () => {
    expect(failAt).toBeGreaterThan(installAt);
    expect(exitAt).toBeGreaterThan(failAt);
    // The failure branch drops the side directory and restores package.json;
    // nothing in it touches the live tree.
    expect(failureBranch).toContain("rm -rf .deploy-next");
    expect(failureBranch).toContain("git checkout -- package.json");
    expect(failureBranch).not.toMatch(/(?:mv|rm -rf) node_modules(?![.\w])/);
  });

  test("the finished tree is swapped in only after the install succeeded", () => {
    expect(swapAt).toBeGreaterThan(exitAt);
    expect(script.slice(0, exitAt)).not.toContain("mv .deploy-next/node_modules node_modules");
  });

  test("the old tree is kept until pm2 has reloaded, then removed", () => {
    const asideAt = script.indexOf("mv node_modules .deploy-prev");
    expect(asideAt).toBeGreaterThan(exitAt);
    expect(asideAt).toBeLessThan(swapAt);
    // Nothing removes the old tree between the swap and the reload; the only
    // earlier rm clears a stale .deploy-prev, never the live tree.
    expect(script.slice(swapAt, reloadAt)).not.toContain("rm -rf .deploy-prev");
    expect(retireAt).toBeGreaterThan(reloadAt);
  });

  // A run killed between the two swap renames leaves the last good tree in
  // .deploy-prev and no node_modules. The next deploy puts it back before
  // anything else runs, so even that gap does not lose the running site.
  test("a tree left aside by a run killed mid-swap is put back first", () => {
    const guardAt = script.indexOf("mv .deploy-prev node_modules");
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(installAt);
    const guard = script.lastIndexOf("if [", guardAt);
    expect(script.slice(guard, guardAt)).toContain("! -d node_modules");
  });
});
