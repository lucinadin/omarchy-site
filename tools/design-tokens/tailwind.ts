import { createCn } from "cn/config";
import { parse } from "postcss";
import { __unstable__loadDesignSystem } from "tailwindcss";

import cnConfig from "../../cn.config.ts";

// Build-time tooling only: use the installed classifier instead of a drifting utility allowlist.
const merge = createCn(cnConfig);

// Dev-only compiler API: keep classification aligned with the installed Tailwind version.
// Compiler-parity tests cover this unstable API when dependencies change.
const tailwind = await __unstable__loadDesignSystem("");
const typographyCache = new Map<string, boolean>();

/** Strip variants without treating a type hint or arbitrary selector as a separator. */
function utilityPart(candidate: string): string {
  let depth = 0;
  let start = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    const character = candidate[index];
    if (character === "\\") {
      index += 1;
    } else if (character === "[" || character === "(") {
      depth += 1;
    } else if (character === "]" || character === ")") {
      depth -= 1;
    } else if (character === ":" && depth === 0) {
      start = index + 1;
    }
  }
  return candidate.slice(start);
}

/** Detect actual font metrics, not color values or classes inside arbitrary selectors. */
export function unscaledTypographyUtilities(value: string): string[] {
  return [
    ...new Set(
      (value.match(/\S+/gu) ?? []).filter((candidate) => {
        const utility = utilityPart(candidate).replace(/^!|!$/gu, "");
        if (/^text-(?:xs|sm|base|lg|xl|[2-9]xl)(?:\/|$)/u.test(utility)) return true;
        if (/^leading-(?:snug|normal|relaxed|loose|\d+(?:\.\d+)?)(?:\/|$)/u.test(utility))
          return true;
        if (!/^(?:(?:text|leading)-[[(]|\[(?:font-size|line-height):)/u.test(utility)) return false;

        const cached = typographyCache.get(utility);
        if (cached !== undefined) return cached;

        const [css] = tailwind.candidatesToCss([utility]);
        let hasMetric = false;
        if (css)
          parse(css).walkDecls((declaration) => {
            if (declaration.prop === "font-size" || declaration.prop === "line-height")
              hasMetric = true;
          });
        typographyCache.set(utility, hasMetric);
        return hasMetric;
      })
    ),
  ];
}

/** A whole var() reference, optionally with a literal fallback; compound expressions stay intact. */
export function variableShorthand(candidate: string): string | null {
  const utility = utilityPart(candidate);
  const match =
    /^(!?-?[a-z][a-z\d-]*-)\[((?:[a-z][a-z-]*:)?)(var\((--[\w-]+(?:,[^()[\]\s]*)?)\))\]((?:\/[^\s]+)?!?)$/u.exec(
      utility
    );
  if (!match) return null;
  const [, prefix, hint, , property, modifier] = match;
  const shorthand = `${candidate.slice(0, candidate.length - utility.length)}${prefix}(${hint}${property})${modifier}`;
  // Some untyped variables (notably shadows) have different groups in cn's two syntaxes.
  if (merge(candidate, shorthand) !== shorthand || merge(shorthand, candidate) !== candidate)
    return null;
  return shorthand;
}

export function inlineClampUtilities(value: string): string[] {
  return [
    ...new Set(
      (value.match(/\S+/gu) ?? []).filter((candidate) => {
        const utility = utilityPart(candidate);
        return /^!?-?(?:[a-z][a-z\d-]*-[[(]|\[)/u.test(utility) && /\bclamp\(/u.test(utility);
      })
    ),
  ];
}
