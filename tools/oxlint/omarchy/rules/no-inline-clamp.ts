import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

import { inlineClampUtilities } from "../../../design-tokens/tailwind.ts";
import { isStringLiteral } from "../ast.ts";

export const noInlineClampRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Keep fluid CSS values in reviewed theme tokens or named utilities." },
    messages: {
      utility:
        "Replace {{utility}} with a named fluid token or utility; do not define clamp() in markup.",
      style:
        "Move this fluid CSS value to a named theme token or utility instead of an inline style.",
    },
  },
  createOnce(context) {
    const reportValue = (node: ESTree.Node, value: string) => {
      const utilities = inlineClampUtilities(value);
      for (const utility of utilities)
        context.report({ node, messageId: "utility", data: { utility } });
      if (
        utilities.length === 0 &&
        /^(?:-?\d|[a-z-]+\()/u.test(value.trim()) &&
        /\bclamp\(/u.test(value) &&
        node.parent?.type === "Property"
      ) {
        context.report({ node, messageId: "style" });
      }
    };
    return {
      Literal(node) {
        if (isStringLiteral(node)) reportValue(node, node.value);
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) reportValue(node, quasi.value.raw);
      },
    };
  },
});
