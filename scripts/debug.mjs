/**
 * Reusable Puppeteer debug harness for vlist.io examples.
 *
 * Usage:
 *   import { debug, run } from "./scripts/debug.mjs";
 *
 *   // Safe runner — browser always closes, even on error:
 *   await run("/examples/messaging", async (s) => {
 *     await s.scrollTo("bottom");
 *     await s.type("#message-input", "hello");
 *     await s.press("Enter");
 *     await s.waitForAnimations();
 *     s.print(await s.snapshot());
 *     s.print(await s.clipped(), "CLIPPED");
 *   });
 *
 *   // Manual control:
 *   const s = await debug("/examples/basic");
 *   s.print(await s.snapshot());
 *   await s.close();
 */

import puppeteer from "puppeteer-core";
import { mkdirSync, existsSync } from "fs";

const BASE = "http://localhost:3338";
const SCREENSHOT_DIR = "/tmp/vlist-debug";

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

function findChrome(override) {
  if (override) return override;
  for (const p of CHROME_PATHS) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `Chrome not found. Searched:\n${CHROME_PATHS.join("\n")}\nPass { chrome: "/path/to/chrome" } to override.`,
  );
}

// ─── Safe runner ─────────────────────────────────────────────────────────────

/**
 * Launch a debug session, run the callback, and always close the browser.
 *
 *   await run("/examples/basic", async (s) => { ... });
 *   await run("/examples/basic", { headless: false }, async (s) => { ... });
 */
export async function run(path, optsOrFn, maybeFn) {
  const opts = typeof optsOrFn === "function" ? {} : optsOrFn;
  const fn = typeof optsOrFn === "function" ? optsOrFn : maybeFn;
  const s = await debug(path, opts);
  try {
    await fn(s);
  } finally {
    await s.close();
  }
}

// ─── Launch ──────────────────────────────────────────────────────────────────

/**
 * @param {string} path         URL path (e.g. "/examples/messaging")
 * @param {object} [opts]
 * @param {boolean} [opts.headless=true]
 * @param {number}  [opts.width=1200]
 * @param {number}  [opts.height=800]
 * @param {string}  [opts.base]       Override base URL
 * @param {string}  [opts.chrome]     Override Chrome executable path
 * @param {number}  [opts.settle=1000] ms to wait after page load
 * @param {string}  [opts.prefix="vlist"] CSS class prefix
 */
export async function debug(path, opts = {}) {
  const {
    headless = true,
    width = 1200,
    height = 800,
    base = BASE,
    chrome,
    settle = 1000,
    prefix = "vlist",
  } = opts;

  const SEL = {
    viewport: `.${prefix}-viewport`,
    items: `.${prefix}-items`,
    item: `.${prefix}-item`,
  };

  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless,
    executablePath: findChrome(chrome),
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height });

  const logs = [];
  page.on("console", (msg) => logs.push(msg.text()));

  await page.goto(`${base}${path}`, { waitUntil: "networkidle2" });
  await page.waitForSelector(SEL.viewport);
  if (settle > 0) await delay(settle);

  let shotIndex = 0;

  // ─── Session API ─────────────────────────────────────────────────

  const session = {
    page,
    browser,
    logs,

    // ── Interaction ────────────────────────────────────────────────

    async scrollTo(target) {
      await page.evaluate(
        (t, sel) => {
          const vp = document.querySelector(sel);
          if (!vp) return;
          const isHoriz = vp.scrollWidth > vp.scrollHeight && vp.clientWidth < vp.scrollWidth;
          const prop = isHoriz ? "scrollLeft" : "scrollTop";
          const max = isHoriz
            ? vp.scrollWidth - vp.clientWidth
            : vp.scrollHeight - vp.clientHeight;
          if (t === "bottom" || t === "end") vp[prop] = max;
          else if (t === "top" || t === "start") vp[prop] = 0;
          else vp[prop] = t;
        },
        target,
        SEL.viewport,
      );
      await delay(100);
    },

    async type(selector, text) {
      await page.focus(selector);
      await page.keyboard.type(text);
    },

    async press(key) {
      await page.keyboard.press(key);
    },

    async click(selector) {
      await page.click(selector);
    },

    async evaluate(fn, ...args) {
      return page.evaluate(fn, ...args);
    },

    async wait(ms) {
      await delay(ms);
    },

    async waitForAnimations(timeout = 3000) {
      await page.evaluate(
        (sel, ms) => {
          const items = document.querySelector(sel);
          if (!items) return Promise.resolve();
          const anims = items.getAnimations({ subtree: true });
          if (anims.length === 0) return Promise.resolve();
          return Promise.race([
            Promise.all(anims.map((a) => a.finished.catch(() => {}))),
            new Promise((r) => setTimeout(r, ms)),
          ]);
        },
        SEL.items,
        timeout,
      );
    },

    // ── Snapshot ───────────────────────────────────────────────────

    async snapshot(opts = {}) {
      const { last, first, visible: visibleOnly, selector } = opts;
      return page.evaluate(
        (p) => {
          const vp = document.querySelector(p.vpSel);
          const itemsEl = document.querySelector(p.itemsSel);
          if (!vp || !itemsEl) return null;
          const vpRect = vp.getBoundingClientRect();
          const children = Array.from(itemsEl.children);

          let subset;
          if (p.selector) {
            subset = children.filter((el) => el.matches(p.selector));
          } else if (p.visibleOnly) {
            subset = children.filter((el) => {
              const r = el.getBoundingClientRect();
              return r.bottom > vpRect.top && r.top < vpRect.bottom;
            });
          } else if (p.first) {
            subset = children.slice(0, p.first);
          } else {
            subset = children.slice(-(p.last || 12));
          }

          const items = subset.map((el) => {
            const rect = el.getBoundingClientRect();
            const anims = el.getAnimations();
            let anim = null;
            if (anims.length > 0) {
              const a = anims[0];
              const kf = a.effect?.getKeyframes?.() || [];
              anim = {
                state: a.playState,
                time: a.currentTime,
                from: kf[0]?.transform || "",
                to: kf[kf.length - 1]?.transform || "",
              };
            }
            return {
              idx: el.dataset.index,
              id: el.dataset.id,
              styleH: el.style.height,
              styleW: el.style.width,
              offsetH: el.offsetHeight,
              scrollH: el.scrollHeight,
              offsetW: el.offsetWidth,
              transform: el.style.transform,
              visible:
                rect.bottom > vpRect.top && rect.top < vpRect.bottom,
              rectTop: Math.round(rect.top - vpRect.top),
              rectBottom: Math.round(rect.bottom - vpRect.top),
              clipped: el.scrollHeight > el.offsetHeight + 2,
              anim,
              text: el.textContent?.replace(/\s+/g, " ")?.trim()?.substring(0, 60) || "",
            };
          });

          return {
            scroll: Math.round(vp.scrollTop),
            scrollLeft: Math.round(vp.scrollLeft),
            maxScroll: vp.scrollHeight - vp.clientHeight,
            maxScrollLeft: vp.scrollWidth - vp.clientWidth,
            contentH: itemsEl.style.height,
            contentW: itemsEl.style.width,
            vpH: vp.clientHeight,
            vpW: vp.clientWidth,
            domCount: children.length,
            items,
          };
        },
        {
          vpSel: SEL.viewport,
          itemsSel: SEL.items,
          last,
          first,
          visibleOnly,
          selector,
        },
      );
    },

    // ── Clipping check ────────────────────────────────────────────

    async clipped() {
      return page.evaluate((sel) => {
        const items = document.querySelector(sel);
        if (!items) return [];
        return Array.from(items.children)
          .filter((el) => el.scrollHeight > el.offsetHeight + 2)
          .map((el) => ({
            idx: el.dataset.index,
            id: el.dataset.id,
            styleH: el.style.height,
            offsetH: el.offsetHeight,
            scrollH: el.scrollHeight,
            text: el.textContent?.substring(0, 60)?.trim() || "",
          }));
      }, SEL.items);
    },

    // ── Animations ────────────────────────────────────────────────

    async animations() {
      return page.evaluate((sel) => {
        const items = document.querySelector(sel);
        if (!items) return [];
        return Array.from(items.children)
          .filter((el) => el.getAnimations().length > 0)
          .map((el) => {
            const a = el.getAnimations()[0];
            const kf = a.effect?.getKeyframes?.() || [];
            return {
              idx: el.dataset.index,
              id: el.dataset.id,
              state: a.playState,
              time: a.currentTime,
              duration: a.effect?.getTiming?.()?.duration,
              from: kf[0]?.transform || "",
              to: kf[kf.length - 1]?.transform || "",
              computed: getComputedStyle(el).transform,
            };
          });
      }, SEL.items);
    },

    // ── Scroll state ──────────────────────────────────────────────

    async scrollState() {
      return page.evaluate((sel) => {
        const vp = document.querySelector(sel);
        if (!vp) return null;
        return {
          scrollTop: Math.round(vp.scrollTop),
          scrollLeft: Math.round(vp.scrollLeft),
          maxScrollTop: vp.scrollHeight - vp.clientHeight,
          maxScrollLeft: vp.scrollWidth - vp.clientWidth,
          vpH: vp.clientHeight,
          vpW: vp.clientWidth,
          contentH: vp.scrollHeight,
          contentW: vp.scrollWidth,
          atTop: vp.scrollTop <= 1,
          atBottom:
            vp.scrollTop >= vp.scrollHeight - vp.clientHeight - 1,
          atLeft: vp.scrollLeft <= 1,
          atRight:
            vp.scrollLeft >= vp.scrollWidth - vp.clientWidth - 1,
        };
      }, SEL.viewport);
    },

    // ── Font trace ────────────────────────────────────────────────

    async traceFont(selector) {
      const sel = selector || `${SEL.item}:last-child`;
      return page.evaluate((s) => {
        const target = document.querySelector(s);
        if (!target) return [];
        const chain = [];
        let el = target;
        while (el && el !== document.documentElement) {
          chain.push({
            tag: el.tagName.toLowerCase(),
            class: el.className?.toString?.()?.split(" ")[0] || "",
            id: el.id || "",
            fontFamily: getComputedStyle(el).fontFamily,
          });
          el = el.parentElement;
        }
        return chain;
      }, sel);
    },

    // ── CSS comparison ────────────────────────────────────────────

    async compareStyles(selector, properties) {
      return page.evaluate(
        (sel, props) => {
          const els = document.querySelectorAll(sel);
          return Array.from(els)
            .slice(0, 5)
            .map((el) => {
              const cs = getComputedStyle(el);
              const result = { id: el.dataset?.id || "" };
              for (const p of props) result[p] = cs[p];
              return result;
            });
        },
        selector,
        properties,
      );
    },

    // ── Snapshot diff ─────────────────────────────────────────────

    diff(before, after) {
      if (!before?.items || !after?.items) return [];
      const diffs = [];

      const scrollDiff = after.scroll - before.scroll;
      if (scrollDiff !== 0) {
        diffs.push({ type: "scroll", delta: scrollDiff, before: before.scroll, after: after.scroll });
      }
      if (after.domCount !== before.domCount) {
        diffs.push({ type: "domCount", before: before.domCount, after: after.domCount });
      }

      const beforeById = new Map(before.items.map((i) => [i.id, i]));
      const afterById = new Map(after.items.map((i) => [i.id, i]));

      for (const [id, b] of beforeById) {
        const a = afterById.get(id);
        if (!a) {
          diffs.push({ type: "removed", id, idx: b.idx });
        } else {
          const changes = {};
          if (b.styleH !== a.styleH) changes.height = { before: b.styleH, after: a.styleH };
          if (b.rectTop !== a.rectTop) changes.position = { before: b.rectTop, after: a.rectTop, delta: a.rectTop - b.rectTop };
          if (b.visible !== a.visible) changes.visibility = { before: b.visible, after: a.visible };
          if (b.clipped !== a.clipped) changes.clipped = { before: b.clipped, after: a.clipped };
          if (Object.keys(changes).length > 0) {
            diffs.push({ type: "changed", id, idx: a.idx, changes });
          }
        }
      }

      for (const [id, a] of afterById) {
        if (!beforeById.has(id)) {
          diffs.push({ type: "added", id, idx: a.idx, height: a.styleH, position: a.rectTop });
        }
      }

      return diffs;
    },

    // ── Screenshots ───────────────────────────────────────────────

    async screenshot(label) {
      const name = label || `shot-${++shotIndex}`;
      const filepath = `${SCREENSHOT_DIR}/${name}.png`;
      await page.screenshot({ path: filepath });
      console.log(`  screenshot: ${filepath}`);
      return filepath;
    },

    // ── Pretty-print ──────────────────────────────────────────────

    print(data, label) {
      if (label) console.log(`\n=== ${label} ===`);

      // Snapshot
      if (data && data.items && data.scroll !== undefined) {
        const horiz = data.maxScrollLeft > 0;
        const scroll = horiz
          ? `scroll=${data.scrollLeft}/${data.maxScrollLeft}`
          : `scroll=${data.scroll}/${data.maxScroll}`;
        console.log(`  ${scroll}  vp=${data.vpW}x${data.vpH}  dom=${data.domCount}`);
        for (const el of data.items) {
          const clip = el.clipped ? " CLIPPED" : "";
          const vis = el.visible ? "VIS" : "---";
          const size = el.styleH || el.styleW || "";
          const anim = el.anim ? ` ANIM(${el.anim.state} t=${el.anim.time})` : "";
          console.log(
            `  [${el.idx}] ${el.id}  h=${size} scroll=${el.scrollH}  ${vis} (${el.rectTop}→${el.rectBottom})${clip}${anim}`,
          );
          if (el.text) console.log(`         ${el.text}`);
        }
        return;
      }

      // Diff array
      if (Array.isArray(data) && data.length > 0 && data[0]?.type) {
        for (const d of data) {
          if (d.type === "scroll") console.log(`  scroll: ${d.before} → ${d.after} (${d.delta > 0 ? "+" : ""}${d.delta})`);
          else if (d.type === "domCount") console.log(`  dom: ${d.before} → ${d.after}`);
          else if (d.type === "added") console.log(`  + [${d.idx}] ${d.id}  h=${d.height} pos=${d.position}`);
          else if (d.type === "removed") console.log(`  - [${d.idx}] ${d.id}`);
          else if (d.type === "changed") {
            const parts = Object.entries(d.changes).map(([k, v]) =>
              v.delta !== undefined ? `${k}: ${v.delta > 0 ? "+" : ""}${v.delta}` : `${k}: ${v.before}→${v.after}`
            );
            console.log(`  ~ [${d.idx}] ${d.id}  ${parts.join("  ")}`);
          }
        }
        return;
      }

      // Clipped / generic array
      if (Array.isArray(data)) {
        if (data.length === 0) {
          console.log("  (none)");
          return;
        }
        for (const el of data) {
          if (el.idx !== undefined && el.scrollH !== undefined) {
            console.log(`  [${el.idx}] ${el.id}  h=${el.styleH || el.offsetH} scroll=${el.scrollH}`);
            if (el.text) console.log(`         ${el.text}`);
          } else {
            console.log(`  ${JSON.stringify(el)}`);
          }
        }
        return;
      }

      // Anything else
      console.log(JSON.stringify(data, null, 2));
    },

    // ── Cleanup ───────────────────────────────────────────────────

    async close() {
      await browser.close();
    },
  };

  return session;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
