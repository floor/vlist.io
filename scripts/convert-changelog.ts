import { writeFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const VLIST_DIR = join(import.meta.dir, "..", "..", "vlist");
const CHANGELOG_PATH = join(VLIST_DIR, "CHANGELOG.md");

const TYPE_TO_CATEGORY: Record<string, string> = {
  feat: "Added",
  fix: "Fixed",
  perf: "Changed",
  refactor: "Changed",
  style: "Changed",
};

const CATEGORY_ORDER = ["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"];

const SKIP_TYPES = new Set(["chore", "docs", "ci", "test"]);

interface Entry {
  scope: string;
  title: string;
}

interface Release {
  version: string;
  date: string;
  categories: Map<string, Entry[]>;
  breaking: string[];
}

function git(cmd: string): string {
  return execSync(`git ${cmd}`, { cwd: VLIST_DIR, encoding: "utf8" }).trim();
}

function getNpmVersions(): Map<string, string> {
  const map = new Map<string, string>();

  for (const pkg of ["@floor/vlist", "vlist"]) {
    const raw = execSync(`npm view ${pkg} time --json`, { encoding: "utf8" });
    const data = JSON.parse(raw) as Record<string, string>;
    for (const [version, date] of Object.entries(data)) {
      if (version === "created" || version === "modified") continue;
      map.set(version, date.slice(0, 10));
    }
  }

  return map;
}

function getAllTagsSorted(): { raw: string; version: string }[] {
  const raw = git("tag --sort=v:refname");
  return raw
    .split("\n")
    .filter((t) => /^v?\d+\.\d+\.\d+$/.test(t))
    .map((t) => ({ raw: t, version: t.replace(/^v/, "") }));
}

function getCommitsBetween(from: string | null, to: string): string[] {
  const range = from ? `${from}..${to}` : to;
  try {
    const raw = git(`log --oneline --no-merges ${range}`);
    if (!raw) return [];
    return raw.split("\n");
  } catch {
    return [];
  }
}

function parseCommit(line: string): { type: string; scope: string; title: string } | null {
  const match = line.match(/^[a-f0-9]+ (\w+)(?:\(([^)]*)\))?:\s*(.+)/);
  if (!match) return null;
  return { type: match[1]!, scope: match[2] ?? "", title: match[3]!.trim() };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatRelease(release: Release): string {
  const lines: string[] = [`## [${release.version}] - ${release.date}`];

  if (release.breaking.length > 0) {
    lines.push("", "### BREAKING CHANGES", "");
    for (const b of release.breaking) lines.push(`- ${b}`);
  }

  for (const cat of CATEGORY_ORDER) {
    const entries = release.categories.get(cat);
    if (!entries || entries.length === 0) continue;
    lines.push("", `### ${cat}`, "");
    for (const entry of entries) {
      const scope = entry.scope ? `**${entry.scope}**: ` : "";
      lines.push(`- ${scope}${capitalize(entry.title)}`);
    }
  }

  return lines.join("\n");
}

function main(): void {
  const npmVersions = getNpmVersions();
  const allTags = getAllTagsSorted();
  const releases: Release[] = [];

  console.log(`npm versions: ${npmVersions.size}, git tags: ${allTags.length}`);

  for (let i = 0; i < allTags.length; i++) {
    const tag = allTags[i]!;
    const npmDate = npmVersions.get(tag.version);
    if (!npmDate) continue;

    const prevTag = i > 0 ? allTags[i - 1]!.raw : null;
    const commits = getCommitsBetween(prevTag, tag.raw);

    const categories = new Map<string, Entry[]>();
    for (const cat of CATEGORY_ORDER) categories.set(cat, []);
    const breaking: string[] = [];

    for (const commit of commits) {
      if (/BREAKING/.test(commit)) {
        breaking.push(commit.replace(/^[a-f0-9]+\s+/, "").replace(/^BREAKING:\s*/, ""));
        continue;
      }
      const parsed = parseCommit(commit);
      if (!parsed || SKIP_TYPES.has(parsed.type)) continue;
      const category = TYPE_TO_CATEGORY[parsed.type] ?? "Changed";
      let list = categories.get(category);
      if (!list) { list = []; categories.set(category, list); }
      list.push({ scope: parsed.scope, title: parsed.title });
    }

    const entryCount = [...categories.values()].reduce((n, e) => n + e.length, 0);
    if (entryCount === 0 && breaking.length === 0) {
      console.log(`  ${tag.version} (${npmDate}): empty, skipping`);
      continue;
    }

    releases.push({ version: tag.version, date: npmDate, categories, breaking });
    console.log(`  ${tag.version} (${npmDate}): ${entryCount} entries`);
  }

  releases.reverse();

  const links: string[] = [];
  for (let i = 0; i < releases.length; i++) {
    const r = releases[i]!;
    const prev = releases[i + 1];
    if (prev) {
      links.push(`[${r.version}]: https://github.com/floor/vlist/compare/v${prev.version}...v${r.version}`);
    } else {
      links.push(`[${r.version}]: https://github.com/floor/vlist/releases/tag/v${r.version}`);
    }
  }
  links.unshift(`[Unreleased]: https://github.com/floor/vlist/compare/v${releases[0]!.version}...HEAD`);

  const output = [
    "# Changelog",
    "",
    "All notable changes to this project will be documented in this file.",
    "",
    "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),",
    "and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).",
    "",
    "## [Unreleased]",
    "",
    ...releases.map((r) => formatRelease(r) + "\n"),
    ...links,
    "",
  ].join("\n");

  writeFileSync(CHANGELOG_PATH, output);
  console.log(`\nWritten ${releases.length} releases to ${CHANGELOG_PATH}`);
}

main();
