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
    expect(script).toContain('npm view "vlist@$VLIST_VERSION" version');
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
