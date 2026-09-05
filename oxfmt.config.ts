import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    ".agents/**",
    ".codex/**",
    ".repos/**",
    "AGENTS.md",
    "README.md",
    "assets/**",
    "cn-tables.ts",
    "content/**/*.mdx",
    "content/community-themes.generated.ts",
    "content/community-themes.lock.json",
    "content/community-themes.pending.json",
    "manual/**",
    "public/**",
    "templates/**",
    "tools/oxlint/anti-slop/**",
    "*.html",
  ],
  printWidth: 100,
});
