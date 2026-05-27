/**
 * Debug: trace transition insert animation in messaging example.
 *
 * The scaleY(0→1) insert animation doesn't fire because
 * ctx.getRenderedElement(layoutIndex) returns null after insert.
 * This script traces exactly what happens.
 *
 *   bun scripts/debug/tests/transition-messaging.mjs
 *   bun scripts/debug/tests/transition-messaging.mjs --headless=false
 *   bun scripts/debug/tests/transition-messaging.mjs --base=http://localhost:3339
 */
import { run, delay, parseArgs } from "../runner.mjs";

const args = parseArgs();

await run("/examples/messaging", { settle: 3000, ...args }, async (s) => {
  // ── 1. Disable auto-messages so we control timing ──────────────
  await s.evaluate(() => {
    if (window.__disableAutoMessages) window.__disableAutoMessages();
    // If the module doesn't expose it, try clearing timers
    // The messaging script exports autoMessages + setAutoMessages
  });

  // Alternative: click the toggle if it exists
  const toggled = await s.evaluate(() => {
    const toggle = document.querySelector("#auto-toggle, [data-auto-toggle]");
    if (toggle) { toggle.click(); return true; }
    return false;
  });
  console.log("  Auto-messages disabled:", toggled);

  await s.wait(2000); // let any pending auto-message settle

  // ── 2. Snapshot before insert ──────────────────────────────────
  const before = await s.snapshot({ last: 5 });
  s.print(before, "BEFORE INSERT");

  const scrollBefore = await s.scrollState();
  console.log("\n  Scroll state:", JSON.stringify(scrollBefore, null, 2));

  // ── 3. Clear console logs to isolate insert trace ──────────────
  s.logs.length = 0;

  // ── 4. Trigger a message send ──────────────────────────────────
  await s.type("#message-input, input[type=text]", "debug test message");
  await s.wait(100);

  // Capture DOM state RIGHT BEFORE pressing Enter
  const domBefore = await s.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    return {
      childCount: content?.children.length ?? 0,
      lastDataIndex: content?.lastElementChild?.dataset?.index ?? "none",
      lastDataId: content?.lastElementChild?.dataset?.id ?? "none",
    };
  });
  console.log("\n  DOM before send:", JSON.stringify(domBefore));

  await s.press("Enter");
  await s.wait(20); // tiny delay — catch animation right at start

  // ── 5. Inspect DOM state RIGHT AFTER insert (before animation ends) ──
  const domAfter = await s.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    if (!content) return { error: "no content element" };

    const children = Array.from(content.children);
    const lastFive = children.slice(-5);

    const items = lastFive.map((el) => {
      const anims = el.getAnimations();
      let anim = null;
      if (anims.length > 0) {
        const a = anims[0];
        const kf = a.effect?.getKeyframes?.() || [];
        anim = {
          state: a.playState,
          duration: a.effect?.getTiming?.()?.duration,
          from: kf[0] ? { transform: kf[0].transform, opacity: kf[0].opacity } : null,
          to: kf[kf.length - 1] ? { transform: kf[kf.length - 1].transform, opacity: kf[kf.length - 1].opacity } : null,
        };
      }
      return {
        idx: el.dataset.index,
        id: el.dataset.id,
        classes: el.className,
        transform: el.style.transform,
        height: el.style.height,
        hasAnim: anims.length > 0,
        anim,
        text: el.textContent?.replace(/\s+/g, " ")?.trim()?.substring(0, 60) || "",
      };
    });

    return {
      totalChildren: children.length,
      items,
    };
  });

  console.log("\n=== DOM AFTER INSERT (50ms) ===");
  console.log("  Total children:", domAfter.totalChildren);
  for (const item of domAfter.items || []) {
    const animStr = item.hasAnim
      ? ` ANIM(${item.anim?.state}, ${item.anim?.duration}ms, from=${JSON.stringify(item.anim?.from)}, to=${JSON.stringify(item.anim?.to)})`
      : "";
    console.log(`  [${item.idx}] ${item.id}  h=${item.height}  ${item.classes}${animStr}`);
    if (item.text) console.log(`         ${item.text}`);
  }

  // ── 6. Check all animations ────────────────────────────────────
  const anims = await s.animations();
  console.log("\n=== ACTIVE ANIMATIONS ===");
  if (anims.length === 0) {
    console.log("  (none — this is the bug)");
  } else {
    s.print(anims);
  }

  // ── 7. Check scroll state after insert ─────────────────────────
  const scrollAfter = await s.scrollState();
  console.log("\n=== SCROLL AFTER INSERT ===");
  console.log(JSON.stringify(scrollAfter, null, 2));

  // ── 8. Snapshot after insert ───────────────────────────────────
  const after = await s.snapshot({ last: 5 });
  s.print(after, "AFTER INSERT");

  // ── 9. Diff ────────────────────────────────────────────────────
  const diffs = s.diff(before, after);
  console.log("\n=== DIFF ===");
  s.print(diffs);

  // ── 10. Console logs from transition plugin ────────────────────
  const transitionLogs = s.logs.filter((l) => l.includes("[transition:") || l.includes("[groups:"));
  console.log("\n=== TRANSITION + GROUPS LOGS ===");
  for (const log of transitionLogs) {
    console.log(`  ${log}`);
  }

  // ── 11. All console logs (for anything we missed) ──────────────
  const allLogs = s.logs.filter((l) => !l.includes("[vlist]") || l.includes("error") || l.includes("warn"));
  if (allLogs.length > transitionLogs.length) {
    console.log("\n=== OTHER CONSOLE LOGS ===");
    for (const log of allLogs) {
      if (!transitionLogs.includes(log)) {
        console.log(`  ${log}`);
      }
    }
  }

  // ── 12. Deep DOM inspection: find the newly inserted element ───
  const deepInspect = await s.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    if (!content) return { error: "no content" };

    // Find element with the sent message text
    const children = Array.from(content.children);
    const sentEl = children.find((el) => el.textContent?.includes("debug test message"));

    if (!sentEl) {
      return {
        found: false,
        allIds: children.slice(-10).map((el) => ({ idx: el.dataset.index, id: el.dataset.id })),
      };
    }

    return {
      found: true,
      idx: sentEl.dataset.index,
      id: sentEl.dataset.id,
      classes: sentEl.className,
      transform: sentEl.style.transform,
      height: sentEl.style.height,
      animCount: sentEl.getAnimations().length,
      parent: sentEl.parentElement === content ? "direct" : "nested",
    };
  });

  console.log("\n=== DEEP INSPECT: SENT MESSAGE ELEMENT ===");
  console.log(JSON.stringify(deepInspect, null, 2));

  // ── 13. Wait for animations to finish, then final snapshot ─────
  await s.wait(500);

  const finalAnims = await s.animations();
  console.log("\n=== ANIMATIONS AFTER 500ms ===");
  console.log(finalAnims.length === 0 ? "  (none)" : JSON.stringify(finalAnims, null, 2));

  await s.screenshot("transition-messaging");
  console.log("\n  Done.");
});
