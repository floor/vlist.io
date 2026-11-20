import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function sectionFences(markdown: string, heading: string): string[] {
  const start = markdown.indexOf(heading);
  const next = markdown.indexOf("\n## ", start + heading.length);
  const section = markdown.slice(start, next === -1 ? undefined : next);
  const blocks: string[] = [];
  const re = /```[^\n]*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(section))) blocks.push(match[1]);
  return blocks;
}

const scriptPath = "examples/velocity-loading/vanilla/script.js";
const cssPath = "examples/velocity-loading/styles.css";
const htmlPath = "examples/velocity-loading/vanilla/content.html";
const docsPath = "docs/plugins/data.md";

test("the data plugin docs quote the example's directional blur", () => {
  const docs = read(docsPath);
  const script = read(scriptPath);
  const css = read(cssPath);
  const html = read(htmlPath);
  for (const source of [docs, script, css, html]) {
    expect(source).not.toContain("blur(2px)");
  }
  expect(html).not.toContain("motion-mode");
  expect(css).not.toMatch(/\.vlist-item--replaced\s*\{/);
  expect(css).toContain("does not restyle .vlist-item--replaced");
  const blocks = sectionFences(docs, "## Placeholders while scrolling fast");
  expect(blocks).toHaveLength(4);
  const sources = [html, script, css];
  for (const block of blocks) {
    expect(sources.some((source) => source.includes(block))).toBe(true);
  }
});

function loadFunction(script: string, name: string): (...args: number[]) => number {
  const match = script.match(new RegExp(`function ${name}\\([^)]*\\) \\{\\n[\\s\\S]*?\\n\\}`));
  expect(match).not.toBeNull();
  return new Function(`${match![0]}\nreturn ${name};`)() as (...args: number[]) => number;
}

test("the smear uses the trial spread and shift, on the scroll axis", () => {
  const script = read(scriptPath);
  const html = read(htmlPath);
  const motionSpread = loadFunction(script, "motionSpread");
  const motionShiftAmount = loadFunction(script, "motionShiftAmount");

  expect(motionSpread(15).toFixed(1)).toBe("4.2");
  expect(motionSpread(0).toFixed(1)).toBe("1.5");
  expect(motionSpread(100).toFixed(1)).toBe("12.0");
  expect(motionShiftAmount(20, 1).toFixed(1)).toBe("11.0");
  expect(motionShiftAmount(20, -1).toFixed(1)).toBe("-11.0");
  expect(motionShiftAmount(0, 1).toFixed(1)).toBe("4.0");
  expect(motionShiftAmount(100, 1).toFixed(1)).toBe("22.0");

  expect(script).toContain('axis === "x" ? `${n} 0` : `0 ${n}`');
  expect(script).toContain('motionShift.setAttribute("dy", shift)');
  expect(script).toContain('motionShift.setAttribute("dx", "0")');
  expect(script).toContain('motionShift.setAttribute("dx", shift)');
  expect(script).toContain('motionShift.setAttribute("dy", "0")');
  expect(script).toContain('motionFilter.setAttribute("x", "-70%")');
  expect(script).toContain('motionFilter.setAttribute("width", "240%")');
  expect(script).toContain('orientation: "vertical"');

  const filter = html.slice(html.indexOf("<filter"), html.indexOf("</filter>"));
  expect(filter).toContain('x="-8%" y="-70%" width="116%" height="240%"');
  expect(filter).toContain('slope="0.7"');
  expect(filter.indexOf("feGaussianBlur")).toBeLessThan(filter.indexOf("feOffset"));
  expect(filter.indexOf("feOffset")).toBeLessThan(filter.indexOf("feComponentTransfer"));
  expect(filter.indexOf("feComponentTransfer")).toBeLessThan(filter.indexOf("feMerge"));
  expect(filter.indexOf('in="trail"')).toBeLessThan(filter.lastIndexOf('in="SourceGraphic"'));
});
