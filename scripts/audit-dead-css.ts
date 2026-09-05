import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { parse } from "postcss";

const stylesheetPaths = ["app/globals.css", "app/typeset.css", "app/view-transitions.css"] as const;
const sourceRoots = ["app", "components", "features", "hooks", "lib", "providers"] as const;
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);

// @wterm emits these classes at runtime, so they cannot appear in our JSX source.
const runtimeClasses = new Set(["cursor-blink", "term-cursor", "term-grid"]);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function appearsInSource(className: string, source: string) {
  return new RegExp(`(?<![\\w-])${escapeRegExp(className)}(?![\\w-])`, "u").test(source);
}

async function readApplicationSource() {
  const source: string[] = [await readFile("mdx-components.tsx", "utf-8")];

  async function readSourceDirectory(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await readSourceDirectory(path);
      } else if (
        sourceExtensions.has(extname(path)) &&
        !/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(path)
      ) {
        source.push(await readFile(path, "utf-8"));
      }
    }
  }

  for (const root of sourceRoots) {
    await readSourceDirectory(root);
  }

  return source.join("\n");
}

async function readDefinedClasses() {
  const definitions = new Map<string, Set<string>>();

  for (const path of stylesheetPaths) {
    const root = parse(await readFile(path, "utf-8"), { from: path });
    root.walkRules((rule) => {
      for (const selector of rule.selectors) {
        for (const match of selector.matchAll(/\.([_a-zA-Z][_a-zA-Z0-9-]*)/gu)) {
          const className = match[1];
          const paths = definitions.get(className) ?? new Set<string>();
          paths.add(path);
          definitions.set(className, paths);
        }
      }
    });
  }

  return definitions;
}

const [definitions, applicationSource] = await Promise.all([
  readDefinedClasses(),
  readApplicationSource(),
]);
const unused = [...definitions]
  .filter(
    ([className]) =>
      !runtimeClasses.has(className) && !appearsInSource(className, applicationSource)
  )
  .toSorted(([first], [second]) => first.localeCompare(second));

if (unused.length > 0) {
  console.error("Dead CSS audit found classes with no application source reference:\n");
  for (const [className, paths] of unused) {
    console.error(`  .${className}  (${[...paths].join(", ")})`);
  }
  console.error("\nRemove the rules or document a genuine runtime/dynamic class in this audit.");
  process.exit(1);
}

console.log(`Dead CSS audit passed (${definitions.size} classes checked).`);
