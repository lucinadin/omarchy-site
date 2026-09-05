import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "postcss";

import { prohibitedShadowUtilities } from "../tools/design-tokens/shadows";

const sourceRoots = ["app", "components", "features", "hooks", "lib", "providers"] as const;
const allowMarker = "typography-audit-allow-next-line";

type Violation = {
  file: string;
  line: number;
  message: string;
};

async function cssFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) return cssFiles(file);
      return path.extname(entry.name) === ".css" ? [file] : [];
    })
  );
  return files.flat();
}

function hasAllowMarker(lines: string[], line: number) {
  return lines[line - 2]?.includes(allowMarker) ?? false;
}

function typographyViolation(property: string, value: string, allowed: boolean): string | null {
  if (
    property === "font-size" &&
    value !== "inherit" &&
    !value.startsWith("var(--text-") &&
    !allowed
  ) {
    return `Use a --text-* token instead of font-size: ${value}`;
  }

  if (
    property === "line-height" &&
    value !== "inherit" &&
    !value.startsWith("var(--leading-") &&
    !allowed
  ) {
    return `Use a --leading-* token instead of line-height: ${value}`;
  }

  if (
    property.startsWith("--") &&
    /(?:font-size|line-height)/u.test(property) &&
    !property.startsWith("--text-") &&
    !property.startsWith("--leading-") &&
    !allowed
  ) {
    return `Document the exceptional metric ${property} or use the typography scale`;
  }

  return null;
}

function shadowViolation(property: string, value: string): string | null {
  if (
    property !== "box-shadow" &&
    property !== "-webkit-box-shadow" &&
    property !== "text-shadow" &&
    (!/^(?:-webkit-)?filter$/u.test(property) || !/\bdrop-shadow\(/u.test(value))
  ) {
    return null;
  }

  return `Replace ${property} with an approved named Tailwind shadow utility`;
}

function auditCss(file: string, source: string, violations: Violation[]) {
  const lines = source.split("\n");
  const root = parse(source, { from: file });

  root.walkAtRules("apply", (rule) => {
    for (const utility of prohibitedShadowUtilities(rule.params)) {
      violations.push({
        file,
        line: rule.source?.start?.line ?? 1,
        message: `Replace ${utility} with an approved named Tailwind shadow utility`,
      });
    }
  });

  root.walkDecls((declaration) => {
    const line = declaration.source?.start?.line ?? 1;
    const allowedTypography = hasAllowMarker(lines, line);
    const property = declaration.prop;
    const value = declaration.value.trim();
    if (/^--(?:tw-)?(?:inset-)?(?:shadow|drop-shadow|text-shadow)(?:-|$)/u.test(property)) {
      const isThemeToken =
        file === "app/globals.css" &&
        declaration.parent?.type === "atrule" &&
        declaration.parent.name === "theme" &&
        [
          "--shadow-overlay",
          "--shadow-notification",
          "--inset-shadow-keycap",
          "--text-shadow-readable",
        ].includes(property);
      if (!isThemeToken)
        violations.push({
          file,
          line,
          message: "Define reviewed shadow tokens only in app/globals.css @theme",
        });
    }
    const messages = [
      typographyViolation(property, value, allowedTypography),
      shadowViolation(property, value),
    ];

    for (const message of messages) {
      if (message) violations.push({ file, line, message });
    }
  });
}

const files = (await Promise.all(sourceRoots.map(cssFiles))).flat().toSorted();
const violations: Violation[] = [];

for (const file of files) {
  const source = await readFile(file, "utf-8");
  auditCss(file, source, violations);
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} ${violation.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(`CSS design-token audit passed across ${files.length} stylesheets.`);
}
