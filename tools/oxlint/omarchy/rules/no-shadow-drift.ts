import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

import { prohibitedShadowUtilities } from "../../../design-tokens/shadows.ts";
import { isObjectProperty, isStringLiteral, propertyName } from "../ast.ts";

/** Keep every authored shadow on the project's named Tailwind vocabulary. */
export const noShadowDriftRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow arbitrary, inline, and unapproved Tailwind shadows outside the Omarchy shadow vocabulary.",
    },
    messages: {
      inlineShadow: "Replace inline {{property}} with an approved named Tailwind shadow utility.",
      utility:
        "Replace {{utility}} with an approved named shadow utility. Add a reviewed theme token before expanding the vocabulary.",
    },
  },
  createOnce(context) {
    const reportUtilities = (node: ESTree.Node, value: string) => {
      for (const utility of prohibitedShadowUtilities(value)) {
        context.report({ node, messageId: "utility", data: { utility } });
      }
    };

    return {
      Literal(node) {
        if (isStringLiteral(node)) reportUtilities(node, node.value);
      },
      Property(node) {
        if (!isObjectProperty(node)) return;
        const property = propertyName(node);
        if (property !== "boxShadow" && property !== "textShadow") return;
        context.report({ node, messageId: "inlineShadow", data: { property } });
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) reportUtilities(node, quasi.value.raw);
      },
    };
  },
});
