/* oxlint-disable omarchy/prefer-variable-shorthand, omarchy/no-inline-clamp, omarchy/no-unscaled-typography, omarchy/no-shadow-drift -- Invalid CSS fixtures test the guards and compiler parity. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { createCn } from "cn/config";
import { parse } from "postcss";
import { compile } from "tailwindcss";

import cnConfig from "../../cn.config.ts";
import { cn } from "../../lib/utils";
import { inlineClampUtilities, unscaledTypographyUtilities, variableShorthand } from "./tailwind";

const merge = createCn(cnConfig);

async function declarations(candidate: string) {
  const compiler = await compile("@theme { --breakpoint-md: 48rem; } @tailwind utilities;");
  const result: string[] = [];
  parse(compiler.build([candidate])).walkDecls((declaration) => {
    result.push(`${declaration.prop}:${declaration.value}`);
  });
  assert.ok(result.length > 0, candidate);
  return result;
}

test("variable shorthand preserves Tailwind declarations and cn conflicts across utility families", async () => {
  for (const utility of [
    "bg-[var(--tone)]",
    "text-[color:var(--tone)]",
    "text-[length:var(--type)]",
    "bg-[image:var(--image)]",
    "bg-[position:var(--position)]",
    "bg-[size:var(--size)]",
    "border-[length:var(--width)]",
    "border-[color:var(--tone)]",
    "stroke-[length:var(--width)]",
    "fill-[var(--tone)]",
    "font-[family-name:var(--family)]",
    "font-[number:var(--weight)]",
    "w-[var(--width)]",
    "h-[var(--height,64px)]",
    "text-[length:var(--type,1rem)]",
    "min-h-[var(--height)]",
    "gap-[var(--gap)]",
    "px-[var(--inset)]",
    "-mt-[var(--offset)]",
    "-translate-x-[var(--offset)]",
    "opacity-[var(--opacity)]",
    "shadow-[shadow:var(--shadow)]",
    "shadow-[color:var(--tone)]",
    "blur-[var(--blur)]",
    "duration-[var(--duration)]",
    "grid-cols-[var(--columns)]",
    "content-[var(--content)]",
    "z-[var(--layer)]",
    "hover:!bg-[var(--tone)]",
    "md:hover:bg-[var(--tone)]/50!",
    "[&:not([hidden])]:text-[color:var(--tone)]",
  ]) {
    const shorthand = variableShorthand(utility);
    assert.ok(shorthand, utility);
    assert.deepEqual(await declarations(shorthand), await declarations(utility), utility);
    assert.equal(merge(utility, shorthand), shorthand, utility);
    assert.equal(merge(shorthand, utility), utility, utility);
  }
});

test("shorthand does not rewrite arbitrary variants, compound fallbacks or properties", () => {
  for (const utility of [
    "bg-(--tone)",
    "bg-(image:--image)",
    "h-[var(--height,calc(100vh-1rem))]",
    "grid-cols-[var(--first,1fr)_var(--second)]",
    "bg-[color-mix(in_srgb,var(--tone),transparent)]",
    "w-[calc(var(--width)*2)]",
    "[color:var(--tone)]",
    "[--offset:var(--gap)]",
    "[&_.bg-[var(--tone)]]:block",
    "bg-[url('/var(--asset)')]",
    "text-[14px]",
    "shadow-[var(--shadow)]",
    "decoration-[var(--decoration)]",
    "flex-[var(--flex)]",
  ])
    assert.equal(variableShorthand(utility), null, utility);
});

test("clamp guard catches nested arbitrary values but ignores numeric JS and arbitrary selectors", () => {
  for (const utility of [
    "py-[clamp(1rem,2vw,2rem)]",
    "md:!text-[clamp(1rem,2vw,2rem)]",
    "grid-rows-[clamp(18rem,22vw,22rem)_minmax(0,1fr)]",
    "py-[var(--section,clamp(4rem,8vw,8rem))]",
    "[--padding:clamp(1rem,2vw,2rem)]",
    "w-(--width,clamp(1rem,2vw,2rem))",
  ])
    assert.deepEqual(inlineClampUtilities(utility), [utility]);
  assert.deepEqual(
    inlineClampUtilities(
      "line-clamp-2 gap-fluid-md clamp(1,2,3) [@supports(width:clamp(1px,2vw,3px))]:block"
    ),
    []
  );
});

test("fluid tokens merge against ordinary utilities in the configured and generated cn engines", () => {
  const theme = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf-8");
  const spacingNames = [...theme.matchAll(/--spacing-([\w-]+):/gu)].map((match) => match[1]);
  assert.deepEqual(spacingNames, cnConfig.extend.theme.spacing);
  for (const token of spacingNames) {
    for (const prefix of ["p", "px", "py", "gap", "gap-x", "mt", "w", "min-h", "max-h"]) {
      const fluid = `${prefix}-${token}`;
      const regular = `${prefix}-4`;
      assert.equal(merge(fluid, regular), regular);
      assert.equal(merge(regular, fluid), fluid);
      // Content-scanned tables retain whole groups, including all their spacing values.
      assert.equal(cn(fluid, regular), regular);
      assert.equal(cn(regular, fluid), fluid);
    }
  }
  assert.equal(cn("text-primary text-title-lg", "text-symbol"), "text-primary text-symbol");
  assert.equal(cn("px-site-frame", "px-4"), "px-4");
  assert.equal(cn("left-control-progress", "left-0"), "left-0");
});

test("typography guard follows Tailwind's emitted properties, including math and color ambiguity", async () => {
  for (const utility of [
    "text-[calc(1rem+1vw)]",
    "text-[min(3vw,2rem)]",
    "text-[max(1rem,2vw)]",
    "text-[clamp(1rem,2vw,2rem)]",
    "text-[.75rem]",
    "text-[large]",
    "text-[80%]",
    "text-[length:var(--size)]",
    "text-(length:--size)",
    "text-[percentage:80%]/[1.2]",
    "leading-[calc(1em+2px)]",
    "leading-(--height)",
    "[font-size:12px]",
    "[line-height:1.3]",
    "text-[#ff0000]",
    "text-[rgb(0_0_0)]/50",
    "text-[color-mix(in_srgb,red_50%,blue)]",
    "text-[var(--tone)]",
    "text-[var(--size,1rem)]",
    "text-(--tone)",
    "text-(color:--tone)",
  ]) {
    const css = await declarations(utility);
    const hasMetric = css.some((declaration) => /^(?:font-size|line-height):/u.test(declaration));
    assert.deepEqual(unscaledTypographyUtilities(utility), hasMetric ? [utility] : [], utility);
    // Cached classification must not inherit declarations from a previous utility.
    assert.deepEqual(unscaledTypographyUtilities(utility), hasMetric ? [utility] : [], utility);
  }
});
