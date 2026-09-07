/* oxlint-disable omarchy/no-inline-clamp, omarchy/no-unscaled-typography, omarchy/no-shadow-drift, no-template-curly-in-string -- RuleTester fixtures intentionally contain invalid utilities and literal template syntax. */
import { describe, it } from "node:test";

import { RuleTester } from "oxlint/plugins-dev";

import plugin from "../index.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
});

tester.run("no-shadow-drift", plugin.rules["no-shadow-drift"], {
  valid: [
    '<div className="shadow-overlay hover:shadow-none inset-shadow-keycap text-shadow-readable" />',
  ],
  invalid: [
    { code: '<div className="shadow-lg" />', errors: [{ messageId: "utility" }] },
    { code: 'cn("hover:!shadow-[0_0_2px_red]")', errors: [{ messageId: "utility" }] },
    {
      code: '<div style={{ boxShadow: "0 0 2px red" }} />',
      errors: [{ messageId: "inlineShadow" }],
    },
    {
      code: '<div style={{ textShadow: "0 0 2px red" }} />',
      errors: [{ messageId: "inlineShadow" }],
    },
  ],
});

tester.run("prefer-variable-shorthand", plugin.rules["prefer-variable-shorthand"], {
  valid: [
    '<div className="bg-(--tone) text-(length:--size)" />',
    'cn("h-[var(--height,calc(100vh-1rem))]", "[color:var(--tone)]")',
  ],
  invalid: [
    {
      code: '<div className="bg-[var(--tone)]" />',
      output: '<div className="bg-(--tone)" />',
      errors: [{ messageId: "utility" }],
    },
    {
      code: 'cn("hover:text-[length:var(--size)]/6!")',
      output: 'cn("hover:text-(length:--size)/6!")',
      errors: [{ messageId: "utility" }],
    },
    {
      code: "const cls = `bg-[var(--tone)] ${extra}`",
      output: "const cls = `bg-(--tone) ${extra}`",
      errors: [{ messageId: "utility" }],
    },
    {
      code: '<div className="bg-[var(--tone)] px-[var(--gap)]" />',
      output: '<div className="bg-(--tone) px-(--gap)" />',
      errors: [{ messageId: "utility" }, { messageId: "utility" }],
    },
  ],
});

tester.run("no-inline-clamp", plugin.rules["no-inline-clamp"], {
  valid: [
    '<div className="py-fluid-section text-title-xl" />',
    "const x = clamp(value, 0, 100)",
    'const label = "clamp(1, 2, 3)"',
  ],
  invalid: [
    {
      code: '<div className="md:py-[clamp(1rem,2vw,2rem)]" />',
      errors: [{ messageId: "utility" }],
    },
    {
      code: "const cls = `gap-[clamp(1rem,2vw,2rem)] ${extra}`",
      errors: [{ messageId: "utility" }],
    },
    {
      code: '<div style={{ padding: "clamp(1rem, 2vw, 2rem)" }} />',
      errors: [{ messageId: "style" }],
    },
    {
      code: "const style = { width: `clamp(1rem, ${width}vw, 2rem)` }",
      errors: [{ messageId: "style" }],
    },
  ],
});

tester.run("no-unscaled-typography", plugin.rules["no-unscaled-typography"], {
  valid: [
    'cn("text-(--tone)", "text-[var(--tone)]", "text-(color:--tone)", "text-symbol")',
    '<div className="text-[color-mix(in_srgb,red_50%,blue)] text-[rgb(1_2_3)]/50 text-[var(--size,1rem)]" />',
    '<div className="[&_.text-sm]:text-ui [@supports(font-size:12px)]:text-meta leading-ui text-ui/tight" />',
    'const name = "text-small text-sm-label"',
  ],
  invalid: [
    { code: 'cn("text-(length:--size)")', errors: [{ messageId: "utility" }] },
    { code: 'cn("leading-(--height)")', errors: [{ messageId: "utility" }] },
    { code: '<div className="text-[calc(1rem+1vw)]" />', errors: [{ messageId: "utility" }] },
    {
      code: '<div className="md:hover:text-[min(3vw,2rem)]!" />',
      errors: [{ messageId: "utility" }],
    },
    { code: 'cn("[&:not([hidden])]:!text-[max(1rem,2vw)]")', errors: [{ messageId: "utility" }] },
    { code: "const cls = `text-[.75rem] ${extra}`", errors: [{ messageId: "utility" }] },
    { code: '<div className="text-[large]" />', errors: [{ messageId: "utility" }] },
    { code: '<div className="text-[percentage:80%]/[1.2]" />', errors: [{ messageId: "utility" }] },
    {
      code: '<div className="[font-size:calc(1rem+1vw)] [line-height:1.3]" />',
      errors: [{ messageId: "utility" }, { messageId: "utility" }],
    },
    {
      code: '<div className="sm:text-sm leading-4.5" />',
      errors: [{ messageId: "utility" }, { messageId: "utility" }],
    },
    {
      code: '<div style={{ fontSize: "1rem", lineHeight: 1.4 }} />',
      errors: [{ messageId: "inlineMetric" }, { messageId: "inlineMetric" }],
    },
  ],
});
