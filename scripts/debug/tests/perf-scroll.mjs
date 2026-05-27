/**
 * Debug: performance — blank frame detection during fast scrolling.
 *
 *   bun scripts/debug/tests/perf-scroll.mjs
 *   bun scripts/debug/tests/perf-scroll.mjs --compare          # v1 vs v2
 *   bun scripts/debug/tests/perf-scroll.mjs --frames=60 --delta=1200
 *   bun scripts/debug/tests/perf-scroll.mjs --only=scrollbar
 */
import { suite, parseArgs } from "../runner.mjs";
import { checkNoBlankFrames, checkNoBlankFramesBurst, timer } from "../presets.mjs";
import { ensureV1, stopV1, V1_PORT } from "../v1.mjs";
import { DEFAULTS } from "../core.mjs";

const args = parseArgs();
const scrollDelta = args.delta || 800;
const frames = args.frames || 30;
const minVisible = args.minVisible || 3;
const compare = !!args.compare;

const burstSize = args.burst || 8;
const burstDelta = args.burstDelta || 120;
const rounds = args.rounds || 20;

function blankTest(label, setup) {
  return async (s) => {
    if (setup) await setup(s);
    const t = timer();
    const steady = await checkNoBlankFrames(s, { scrollDelta, frames, minVisible });

    await s.scrollTo("top");
    await s.wait(300);

    const burst = await checkNoBlankFramesBurst(s, { burstSize, burstDelta, rounds, minVisible });
    t.log(label);
    return {
      pass: steady.pass && burst.pass,
      steady: { blank: steady.blankFrames, total: steady.totalFrames },
      burst: { blank: burst.blankFrames, total: burst.totalFrames },
      blankFrames: steady.blankFrames + burst.blankFrames,
      totalFrames: steady.totalFrames + burst.totalFrames,
    };
  };
}

async function selectCustomScrollbar(s) {
  await s.click('button[data-mode="custom"]');
  await s.wait(500);
}

const EXAMPLES = [
  { name: "scrollbar-custom", path: "/examples/scrollbar", settle: 1500, setup: selectCustomScrollbar },
  { name: "scrollbar-native", path: "/examples/scrollbar", settle: 1500 },
  { name: "basic",            path: "/examples/basic",     settle: 1500 },
  { name: "large-list",       path: "/examples/large-list", settle: 2000 },
  { name: "photo-album",      path: "/examples/photo-album", settle: 2000 },
  { name: "track-list",       path: "/examples/track-list",  settle: 2000 },
];

if (!compare) {
  const tests = EXAMPLES.map((ex) => ({
    ...ex,
    test: blankTest(ex.name, ex.setup),
  }));
  await suite(tests);
} else {
  const v1Port = await ensureV1();
  const v2Base = DEFAULTS.base;
  const v1Base = `http://localhost:${v1Port}`;

  console.log(`\n  v2: ${v2Base}    v1: ${v1Base}\n`);

  const v2Results = [];
  const v1Results = [];

  for (const ex of EXAMPLES) {
    if (args.only && !ex.name.includes(args.only)) continue;

    console.log(`\n── ${ex.name} ──`);

    console.log("  [v2]");
    const v2Tests = [{ ...ex, name: `v2 ${ex.name}`, test: blankTest(`v2 ${ex.name}`, ex.setup) }];
    const v2 = await suite(v2Tests, { base: v2Base });
    v2Results.push({ name: ex.name, ...v2[0] });

    console.log("  [v1]");
    const v1Tests = [{ ...ex, name: `v1 ${ex.name}`, test: blankTest(`v1 ${ex.name}`, ex.setup) }];
    const v1 = await suite(v1Tests, { base: v1Base });
    v1Results.push({ name: ex.name, ...v1[0] });
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log("  v1 vs v2 COMPARISON");
  console.log("═══════════════════════════════════════════════");
  console.log("  Example            v1 blank   v2 blank   Regression?");
  console.log("  ─────────────────  ─────────  ─────────  ───────────");

  for (let i = 0; i < v2Results.length; i++) {
    const v1r = v1Results[i];
    const v2r = v2Results[i];
    const v1Blank = v1r.error ? "ERR" : `${v1r.blankFrames || 0}/${v1r.totalFrames || 0}`;
    const v2Blank = v2r.error ? "ERR" : `${v2r.blankFrames || 0}/${v2r.totalFrames || 0}`;
    const regression = !v1r.error && !v2r.error && (v2r.blankFrames || 0) > (v1r.blankFrames || 0);
    const name = v1r.name.padEnd(17);
    console.log(`  ${name}  ${v1Blank.padEnd(9)}  ${v2Blank.padEnd(9)}  ${regression ? "YES" : "no"}`);
  }

  await stopV1();
}
