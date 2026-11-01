// test/workflows/deploy.test.ts
import { describe, test, expect } from "bun:test";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, symlinkSync, readlinkSync, lstatSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";

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

// A shell function's body, from its name() line to the unindented closing brace.
// The deploy script's functions sit at column 0 after YAML parses the block.
function shellFunction(name: string): string {
  const match = script.match(new RegExp(`(?:^|\\n)${name}\\(\\) \\{\\n([\\s\\S]*?)\\n\\}`));
  return match?.[1] ?? "";
}

// The deploy writes this helper to the server with a quoted heredoc. It performs
// every publication swap and the one-time migration: both are single syscalls
// (rename(2); renameat2/renamex_np exchange). Recovery runs before the helper
// exists and restores the live path with a shell rename of its own.
const helperSource: string =
  script.match(/<<'DEPLOY_SWAP'\n([\s\S]*?)\nDEPLOY_SWAP/)?.[1] ?? "";

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
// for about 45 minutes. The install now runs in a side directory. Publication
// must not repeat that outage for even a moment: a pair of renames leaves the
// live path absent between them, so node_modules is a link to a generation
// directory and every publication is one rename over that link.
describe("the live path is published by one atomic operation", () => {
  const installAt = script.indexOf("bun install --force --no-cache");
  const installCwdAt = script.indexOf("cd .deploy-next && bun install");
  const failAt = script.indexOf("after 6 attempts");
  const exitAt = script.indexOf("exit 1", failAt);
  // The failure branch: from the error line to the exit that ends the script.
  const failureBranch = script.slice(failAt, exitAt);
  const publishAt = script.indexOf('if ! publish_link "$generation"');
  const reloadAt = script.indexOf("pm2 reload vlist.io");

  test("the deploy writes one exchange helper and uses it for every publication", () => {
    expect(helperSource.length).toBeGreaterThan(100);
    expect(helperSource).toContain("renameat2");
    expect(helperSource).toContain("renamex_np");
    expect(shellFunction("publish_link")).toContain('"$APP_DIR/.deploy-swap.ts" swap');
    expect(shellFunction("migrate_to_link")).toContain('"$APP_DIR/.deploy-swap.ts" exchange');
  });

  test("the helper performs one atomic exchange and one atomic link swap", () => {
    const dir = mkdtempSync(join(tmpdir(), "deploy-swap-"));
    const helper = join(dir, "swap.ts");
    writeFileSync(helper, helperSource);

    // Steady state: node_modules is a link; a temp link replaces it in one rename.
    for (const [name, version] of [["old", "OLD"], ["new", "NEW"]]) {
      mkdirSync(join(dir, name, "vlist/dist"), { recursive: true });
      writeFileSync(join(dir, name, "vlist/dist/version.json"), version);
    }
    symlinkSync("old", join(dir, "node_modules"));
    symlinkSync("new", join(dir, ".deploy-link.tmp"));
    expect(Bun.spawnSync(["bun", helper, "swap", ".deploy-link.tmp", "node_modules"], { cwd: dir }).exitCode).toBe(0);
    expect(readlinkSync(join(dir, "node_modules"))).toBe("new");
    expect(readFileSync(join(dir, "node_modules/vlist/dist/version.json"), "utf-8")).toBe("NEW");

    // Migration: a real tree is hardlink-copied, then exchanged with a link in
    // one syscall. Both paths keep a full tree at every instant.
    mkdirSync(join(dir, "legacy/vlist/dist"), { recursive: true });
    writeFileSync(join(dir, "legacy/vlist/dist/version.json"), "LEGACY");
    expect(Bun.spawnSync(["bun", helper, "hardlink", "new", "legacy-copy"], { cwd: dir }).exitCode).toBe(0);
    symlinkSync("legacy-copy", join(dir, ".deploy-exchange.tmp"));
    expect(Bun.spawnSync(["bun", helper, "exchange", "new", ".deploy-exchange.tmp"], { cwd: dir }).exitCode).toBe(0);
    expect(lstatSync(join(dir, "new")).isSymbolicLink()).toBe(true);
    expect(lstatSync(join(dir, ".deploy-exchange.tmp")).isDirectory()).toBe(true);
    expect(readFileSync(join(dir, "new/vlist/dist/version.json"), "utf-8")).toBe("NEW");
    expect(readFileSync(join(dir, ".deploy-exchange.tmp/vlist/dist/version.json"), "utf-8")).toBe("NEW");
  });

  test("a real node_modules is migrated by an exchange, never by a pair of renames", () => {
    const migration = shellFunction("migrate_to_link");
    expect(migration).toContain("hardlink");
    expect((migration.match(/"\$APP_DIR\/\.deploy-swap\.ts" exchange/g) ?? []).length).toBe(1);
    expect(migration).not.toMatch(/\bmv node_modules\b/);
    expect(script).not.toContain("mv node_modules .deploy-prev");
    expect(script).not.toContain("mv .deploy-next/node_modules node_modules");
  });

  test("the install runs in a side directory, never in the live one", () => {
    expect(installCwdAt).toBeGreaterThan(-1);
    expect(installCwdAt).toBeLessThan(failAt);
    expect(script).toContain("mkdir -p .deploy-next");
    expect(script).toContain("cp package.json .deploy-next/package.json");
    // Before the install, the live tree is never moved away or deleted. The
    // only moves into node_modules restore a live path that is already absent.
    expect(script.slice(0, installAt)).not.toMatch(/(?:mv|rm -rf) node_modules(?![.\w])/);
  });

  test("a failed install leaves the live modules untouched and exits", () => {
    expect(failAt).toBeGreaterThan(installAt);
    expect(exitAt).toBeGreaterThan(failAt);
    expect(failureBranch).toContain("rm -rf .deploy-next");
    expect(failureBranch).toContain("git checkout -- package.json");
    expect(failureBranch).not.toMatch(/(?:mv|rm -rf) node_modules(?![.\w])/);
  });

  test("the finished tree is published only after the install succeeded", () => {
    expect(publishAt).toBeGreaterThan(exitAt);
    expect(script.slice(0, exitAt)).not.toContain('if ! publish_link "$generation"');
  });

  test("the previous generation is kept through the reload", () => {
    const captureAt = script.indexOf('prev_target="$(readlink node_modules)"');
    expect(captureAt).toBeGreaterThan(exitAt);
    expect(captureAt).toBeLessThan(publishAt);
    expect(script.slice(publishAt, reloadAt)).not.toMatch(/rm -rf .*\.deploy-nodes/);
  });
});

// The reviewer's interrupted-run probe: a killed SSH session must never be able
// to leave the live path absent, and the next run must repair whatever state it
// left before any fetch, install or build can fail.
describe("a killed run cannot leave the live path absent", () => {
  const fetchAt = script.indexOf("git fetch origin main");
  const recoverCallAt = script.search(/(?:^|\n)recover_live_path\n/);
  const migrateCallAt = script.search(/(?:^|\n)migrate_to_link\n/);

  test("recovery and migration run before any network or build work", () => {
    expect(recoverCallAt).toBeGreaterThan(-1);
    expect(migrateCallAt).toBeGreaterThan(-1);
    expect(recoverCallAt).toBeLessThan(fetchAt);
    expect(migrateCallAt).toBeLessThan(fetchAt);
    expect(script.indexOf("bun install --force --no-cache")).toBeGreaterThan(fetchAt);
  });

  test("recovery runs before the swap helper it must not depend on is created", () => {
    const helperAt = script.indexOf("<<'DEPLOY_SWAP'");
    expect(helperAt).toBeGreaterThan(-1);
    // Nothing fallible, not even writing the helper, runs before recovery.
    expect(recoverCallAt).toBeGreaterThan(-1);
    expect(recoverCallAt).toBeLessThan(helperAt);
    expect(helperAt).toBeLessThan(migrateCallAt);
  });

  test("recovery restores a live path from every state a killed run can leave", () => {
    const recovery = shellFunction("recover_live_path");
    expect(recovery).toContain(".deploy-link.tmp");
    expect(recovery).toContain(".deploy-prev");
    expect(recovery).toContain(".deploy-nodes/");
    expect(recovery).toContain("live_ok");
    expect(recovery).toContain("exit 1");
    // It restores with shell renames only: the helper does not exist yet.
    expect(recovery).not.toContain(".deploy-swap.ts");
    expect(recovery).toContain("adopt_live");
    expect(shellFunction("adopt_live")).toContain("mv ");
  });

  test("the publication mechanisms are checked before the install can fail", () => {
    const probe = shellFunction("probe_publication");
    expect(probe).toContain(" exchange ");
    expect(probe).toContain(" swap ");
    const probeCallAt = script.search(/(?:^|\n)probe_publication\n/);
    expect(probeCallAt).toBeGreaterThan(-1);
    expect(probeCallAt).toBeLessThan(fetchAt);
  });
});

// A failure after the swap used to leave the new tree live, package.json
// modified, and both scratch trees behind. The contract now: a build failure
// flips the link back to the previous generation and restores the manifest; a
// reload failure keeps every generation because workers may have started on
// either one.
describe("failure after publication has a defined contract", () => {
  test("a build failure rolls the link back and restores the manifest", () => {
    const rollback = shellFunction("rollback");
    expect(rollback).toContain('publish_link "$previous"');
    expect(rollback).toContain("git checkout -- package.json");
    expect(rollback).toContain("exit 1");
    expect(script).toMatch(/if ! bun run build:examples; then\s+rollback/);
    expect(script).toMatch(/if ! bun run build:bench; then\s+rollback/);
  });

  test("a failed reload keeps both generations and restores the manifest", () => {
    const failureAt = script.indexOf("if ! (pm2 reload");
    expect(failureAt).toBeGreaterThan(-1);
    const failure = script.slice(failureAt, script.indexOf("\nfi\n", failureAt));
    expect(failure).toContain("git checkout -- package.json");
    expect(failure).not.toMatch(/rm -rf .*\.deploy-nodes/);
    expect(failure).toContain("exit 1");
  });

  test("generations retire only after a completed reload, keeping the previous", () => {
    const reloadAt = script.indexOf("pm2 reload vlist.io");
    const retireAt = script.indexOf("current_name=");
    expect(retireAt).toBeGreaterThan(reloadAt);
    const retire = script.slice(retireAt);
    expect(retire).toContain('"$name" = "$current_name"');
    expect(retire).toContain('"$name" = "$prev_name"');
    expect(retire).toContain("rm -rf");
    // Nothing retires generations before the reload: old workers still read them.
    expect(script.slice(0, reloadAt)).not.toContain('rm -rf "$candidate"');
  });
});
