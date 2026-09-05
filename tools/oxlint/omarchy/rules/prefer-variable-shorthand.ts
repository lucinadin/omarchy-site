import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

import { variableShorthand } from "../../../design-tokens/tailwind.ts";
import { isStringLiteral } from "../ast.ts";

export const preferVariableShorthandRule = defineRule({
  meta: {
    type: "suggestion",
    fixable: "code",
    docs: {
      description: "Use Tailwind v4 CSS-variable shorthand without changing data type hints.",
    },
    messages: {
      utility: "Use {{replacement}} instead of {{utility}}; preserve its type hint and modifiers.",
    },
  },
  createOnce(context) {
    const reportUtilities = (node: ESTree.Node, value: string) => {
      const changes = [...new Set(value.match(/\S+/gu))].flatMap((utility) => {
        const replacement = variableShorthand(utility);
        return replacement ? [{ utility, replacement }] : [];
      });
      if (changes.length === 0) return;
      const source = context.sourceCode.getText(node);
      const fixedSource = changes.reduce(
        (text, change) => text.replaceAll(change.utility, change.replacement),
        source
      );
      for (const { utility, replacement } of changes) {
        context.report({
          node,
          messageId: "utility",
          data: { utility, replacement },
          fix(fixer) {
            if (source === fixedSource) return null;
            return fixer.replaceText(node, fixedSource);
          },
        });
      }
    };
    return {
      Literal(node) {
        if (isStringLiteral(node)) reportUtilities(node, node.value);
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) reportUtilities(quasi, quasi.value.raw);
      },
    };
  },
});
