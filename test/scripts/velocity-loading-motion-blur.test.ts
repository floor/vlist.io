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

test("motion blur stdDeviation follows the scroll axis and the velocity", () => {
  const script = read(scriptPath);
  const match = script.match(
    /function motionStdDeviation\(velocity, axis\) \{\n[\s\S]*?\n\}/,
  );
  expect(match).not.toBeNull();
  const motionStdDeviation = new Function(
    `${match![0]}\nreturn motionStdDeviation;`,
  )() as (velocity: number, axis: string) => string;

  expect(motionStdDeviation(15, "y")).toBe("0 4.2");
  expect(motionStdDeviation(15, "x")).toBe("4.2 0");
  expect(motionStdDeviation(0, "y")).toBe("0 1.5");
  expect(motionStdDeviation(100, "x")).toBe("12.0 0");
  expect(motionStdDeviation(100, "y")).toBe("0 12.0");
  expect(script).toContain(
    'const axis = listConfig.orientation === "horizontal" ? "x" : "y";',
  );
  expect(script).toContain('orientation: "vertical"');
});
