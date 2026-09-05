import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react, next],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    ".agents/**",
    ".codex/**",
    ".repos/**",
    "assets/**",
    "cn-tables.ts",
    "public/**",
    "tools/oxlint/anti-slop/**",
  ],
  jsPlugins: [
    {
      name: "anti-slop",
      specifier: "./tools/oxlint/anti-slop/index.ts",
    },
    {
      name: "omarchy",
      specifier: "./tools/oxlint/omarchy/index.ts",
    },
  ],
  overrides: [
    {
      files: ["lib/og/**/*.tsx"],
      rules: {
        "nextjs/no-img-element": "off",
      },
    },
    {
      files: ["lib/ui/command.tsx"],
      rules: {
        "jsx-a11y/prefer-tag-over-role": "off",
      },
    },
    {
      files: ["types/temporal.d.ts"],
      rules: {
        // Ambient globals require `declare var`; `let` and `const` describe
        // lexical bindings instead of properties available on globalThis.
        "no-implicit-globals": "off",
        "no-var": "off",
        "vars-on-top": "off",
      },
    },
  ],
  rules: {
    // Preserve the project's established syntax and domain ordering. These
    // rules enforce taste rather than correctness, and sort-keys can change
    // the order of UI controls and other intentionally ordered records.
    curly: "off",
    "func-style": "off",
    "import/consistent-type-specifier-style": "off",
    "no-await-in-loop": "off",
    "no-bitwise": "off",
    "no-negated-condition": "off",
    "no-nested-ternary": "off",
    "no-use-before-define": "off",
    // `void` marks deliberate fire-and-forget UI work. The promise callback
    // rules conflict with event APIs that must be bridged or subscribed to.
    "no-void": "off",
    "prefer-destructuring": "off",
    "prefer-named-capture-group": "off",
    "promise/prefer-await-to-then": "off",
    "promise/avoid-new": "off",
    "promise/prefer-await-to-callbacks": "off",
    "sort-keys": "off",
    "typescript/consistent-type-definitions": "off",
    "unicorn/import-style": "off",
    // Rejection values are deliberately named `cause`: unlike a caught Error,
    // a Promise can reject with any value and the boundary must narrow it first.
    "unicorn/catch-error-name": "off",
    "unicorn/no-array-for-each": "off",
    "unicorn/no-array-reduce": "off",
    "unicorn/no-await-expression-member": "off",
    "unicorn/no-negated-condition": "off",
    "unicorn/no-nested-ternary": "off",
    "unicorn/numeric-separators-style": "off",
    "unicorn/prefer-spread": "off",
    "unicorn/prefer-string-replace-all": "off",
    "unicorn/switch-case-braces": "off",
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": ["error", { allowInTypeGuards: true }],
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
    "omarchy/no-extracted-classname-constants": "error",
    "omarchy/no-inline-clamp": "error",
    "omarchy/no-shadow-drift": "error",
    "omarchy/no-unscaled-typography": "error",
    "omarchy/prefer-variable-shorthand": "error",
    "react/function-component-definition": "off",
    "react/jsx-no-constructed-context-values": "off",
    "typescript/consistent-indexed-object-style": "off",
    "unicorn/no-immediate-mutation": "off",
  },
});
