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
    expect(script).toContain('"vlist": "$VLIST_SPEC"');
    expect(script).not.toContain('"vlist": "latest"|');
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
