/**
 * Local data some API suites need, and a skip that says how to provide it.
 *
 * `data/cities.db` and `data/tracks.db` are gitignored and built locally; the
 * file browser lists the `vlist` and `vlist.io` checkouts beside this one. A
 * fresh clone or a worktree has none of them, and the suites that read them
 * answered 500 there (vlist.io#92). With the data present they run as before.
 */
import { existsSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dir, "../..");

const requirements = {
  cities: {
    present: existsSync(resolve(root, "data/cities.db")),
    how: "data/cities.db is missing; build it with `bun run scripts/seed-cities.ts`",
  },
  tracks: {
    present: existsSync(resolve(root, "data/tracks.db")),
    how: "data/tracks.db is missing; it is seeded from MongoDB by scripts/seed-tracks.ts, or copied from a machine that has it",
  },
  checkouts: {
    present: ["vlist", "vlist.io"].every((dir) => existsSync(resolve(root, "..", dir))),
    how: "the file browser lists ../vlist and ../vlist.io, and this checkout has no such siblings (a worktree or a lone clone)",
  },
} as const;

const warned = new Set<string>();

/** True when the suite's data is missing; says once why the suite is skipped. */
export function missing(need: keyof typeof requirements): boolean {
  const { present, how } = requirements[need];
  if (!present && !warned.has(need)) {
    warned.add(need);
    console.warn(`[skip] ${need} API tests: ${how}`);
  }
  return !present;
}
