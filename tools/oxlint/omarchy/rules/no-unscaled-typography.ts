import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

import { unscaledTypographyUtilities } from "../../../design-tokens/tailwind.ts";
import { isObjectProperty, isStringLiteral, propertyName } from "../ast.ts";

/** Keep TypeScript and TSX typography on the project scale. */
export const noUnscaledTypographyRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Tailwind's default or arbitrary type metrics and inline font metrics outside the Omarchy typography scale.",
    },
    messages: {
      inlineMetric:
        "Replace inline {{property}} with a named project typography utility, or document a renderer exception with an Oxlint suppression.",
      utility:
        "Replace {{utility}} with a named project typography utility such as text-meta, text-small, text-ui, or text-title-*.",
    },
  },
  createOnce(context) {
    const reportUtilities = (node: ESTree.Node, value: string) => {
      for (const utility of unscaledTypographyUtilities(value)) {
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
        if (property !== "fontSize" && property !== "lineHeight") return;
        context.report({ node, messageId: "inlineMetric", data: { property } });
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) reportUtilities(node, quasi.value.raw);
      },
    };
  },
});
